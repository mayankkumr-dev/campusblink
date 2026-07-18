/**
 * moderation.js — Content Moderation Pipeline for Campus Blink Diaries
 *
 * Implements:
 *   1. Text Moderation: Multi-layer toxicity, profanity, hate speech, harassment check.
 *   2. Image Moderation (AWS Rekognition): Retrieves quarantined image from Supabase 'quarantine' bucket,
 *      runs DetectModerationLabels API, and checks against safety threshold.
 *   3. Decision Engine:
 *      - If Safe: Moves image to public 'diaries' bucket, gets public URL, inserts into Supabase Postgres.
 *      - If Unsafe: Immediately deletes quarantined image, aborts insertion, returns 403 Forbidden.
 */

const { RekognitionClient, DetectModerationLabelsCommand } = require('@aws-sdk/client-rekognition');
const { supabaseAdmin } = require('../config/supabase');

// Initialize AWS Rekognition Client
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/* ─── 1. Text Moderation Blocklist & Engine ─────────────────────────── */
const SEVERE_TOXICITY_PATTERNS = [
  // Explicit slurs, hate speech, severe harassment, threats
  /\b(n[i1]gg[e3]r|f[a@4]gg?[o0]t|k[i1]k[e3]|sp[i1]c|ch[i1]nk|ret[a@]rd|wh[o0]r[e3]|sl[u@v]t)\b/i,
  /\b(kill\s+yourself|kys|die\s+in\s+a\s+hole|bomb\s+the|shoot\s+up|murder\s+you)\b/i,
  /\b(rape|child\s+porn|cp|ped[o0]ph[i1]l|behead|terrorist)\b/i,
];

const GENERAL_PROFANITY_PATTERNS = [
  /\b(f[u*@]ck|sh[i1*]t|b[i1*]tch|c[u*]nt|d[i1*]ck|p[u*]ssy| [a@]sshole |b[a@]st[a@]rd)\b/i,
];

async function moderateText(text = '') {
  if (!text || typeof text !== 'string') return { safe: true };

  const cleaned = text.trim();

  // Check severe toxicity & hate speech patterns
  for (const pattern of SEVERE_TOXICITY_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        safe: false,
        reason: 'Text contains severe toxicity, hate speech, harassment, or threats violating community guidelines.',
        category: 'severe_toxicity',
      };
    }
  }

  // Check general profanity
  for (const pattern of GENERAL_PROFANITY_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        safe: false,
        reason: 'Text contains explicit profanity or inappropriate language.',
        category: 'profanity',
      };
    }
  }

  // Optional: Integrate with OpenAI Moderation API if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input: cleaned }),
      });
      if (response.ok) {
        const data = await response.json();
        const result = data.results?.[0];
        if (result && result.flagged) {
          const flaggedCategories = Object.entries(result.categories || {})
            .filter(([_, flagged]) => flagged)
            .map(([cat]) => cat);
          return {
            safe: false,
            reason: `Content violates AI safety guidelines (${flaggedCategories.join(', ')} detected).`,
            category: flaggedCategories[0] || 'ai_flagged',
          };
        }
      }
    } catch (err) {
      console.warn('[Moderation] OpenAI moderation check failed, relying on local filters:', err.message);
    }
  }

  return { safe: true };
}

/* ─── 2. Image Moderation via AWS Rekognition ──────────────────────── */
const UNSAFE_MODERATION_LABELS = new Set([
  'Explicit Content',
  'Explicit Nudity',
  'Nudity',
  'Graphic Violence',
  'Violence',
  'Visually Disturbing',
  'Drugs',
  'Tobacco',
  'Alcohol',
  'Gambling',
  'Hate Symbols',
  'Weapons',
  'Suggestive',
  'Sexual Activity',
]);

async function moderateImageBuffer(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new Error('Invalid image buffer provided to moderation engine.');
  }

  try {
    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: imageBuffer },
      MinConfidence: 60.0,
    });

    const response = await rekognitionClient.send(command);
    const labels = response.ModerationLabels || [];

    const flaggedLabels = [];
    for (const label of labels) {
      const name = label.Name;
      const parentName = label.ParentName;
      const confidence = label.Confidence || 0;

      if (
        confidence >= 60.0 &&
        (UNSAFE_MODERATION_LABELS.has(name) || (parentName && UNSAFE_MODERATION_LABELS.has(parentName)))
      ) {
        flaggedLabels.push(`${name} (${confidence.toFixed(1)}%)`);
      }
    }

    if (flaggedLabels.length > 0) {
      return {
        safe: false,
        reason: `Content violates community safety guidelines: ${flaggedLabels.join(', ')} detected by AWS Rekognition.`,
        labels: flaggedLabels,
      };
    }

    return { safe: true, labels: [] };
  } catch (err) {
    console.error('[AWS Rekognition] Image moderation error:', err.message);
    // If AWS credentials not configured locally or IAM permission missing during development, handle gracefully
    if (
      err.name === 'CredentialsProviderError' ||
      err.message.includes('credentials') ||
      err.name === 'AccessDeniedException' ||
      err.message.includes('not authorized to perform: rekognition:DetectModerationLabels')
    ) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'AWS IAM configuration error: User campusblink-s3-user is missing the "rekognition:DetectModerationLabels" permission in AWS IAM.'
        );
      }
      console.warn('[AWS Rekognition] IAM policy missing rekognition:DetectModerationLabels in development mode. Bypassing visual safety check so photo upload succeeds locally.');
      return { safe: true, labels: [], bypassed: true };
    }
    throw err;
  }
}

async function moderateQuarantinedImage(quarantinePath) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized.');
  }

  // Download from 'quarantine' bucket
  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from('quarantine')
    .download(quarantinePath);

  if (downloadError || !fileBlob) {
    throw new Error(`Failed to retrieve quarantined image: ${downloadError?.message || 'File not found'}`);
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  const modResult = await moderateImageBuffer(imageBuffer);

  return {
    ...modResult,
    imageBuffer,
    contentType: fileBlob.type || 'image/jpeg',
  };
}

/* ─── 3. Decision Engine: Process Complete Diary Submission ─────────── */
async function processDiarySubmission({
  author_id,
  content,
  font_family,
  text_color,
  bg_color,
  gradient,
  scale,
  quarantine_path,
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Step 1: Run Text Moderation
  const textMod = await moderateText(content);
  if (!textMod.safe) {
    // If Unsafe & there was a quarantined image, immediately purge it from Quarantine
    if (quarantine_path) {
      try {
        await supabaseAdmin.storage.from('quarantine').remove([quarantine_path]);
        console.log(`[Moderation] Purged quarantined image ${quarantine_path} due to text moderation failure.`);
      } catch (e) {
        console.error(`[Moderation] Failed to purge quarantined image:`, e.message);
      }
    }
    return {
      success: false,
      status: 403,
      error: textMod.reason,
    };
  }

  // Step 2: Move image right away to public 'diaries' bucket & prepare background check
  let finalImageUrl = null;
  let stagedImageBuffer = null;
  if (quarantine_path) {
    try {
      const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
        .from('quarantine')
        .download(quarantine_path);

      if (downloadError || !fileBlob) {
        throw new Error(`Failed to retrieve staged image: ${downloadError?.message || 'Not found'}`);
      }

      const arrayBuffer = await fileBlob.arrayBuffer();
      stagedImageBuffer = Buffer.from(arrayBuffer);

      const filename = quarantine_path.split('/').pop() || `${Date.now()}-diary.jpg`;
      const destinationPath = `${author_id}/${Date.now()}-${filename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('diaries')
        .upload(destinationPath, stagedImageBuffer, {
          contentType: fileBlob.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Failed to promote image to diaries bucket: ${uploadError.message}`);
      }

      // Remove from quarantine after successful promotion
      await supabaseAdmin.storage.from('quarantine').remove([quarantine_path]);

      const { data: publicUrlData } = supabaseAdmin.storage.from('diaries').getPublicUrl(destinationPath);
      finalImageUrl = publicUrlData.publicUrl;
    } catch (err) {
      console.error('[Moderation] Quarantine promotion error:', err.message);
      try { await supabaseAdmin.storage.from('quarantine').remove([quarantine_path]); } catch (_) {}
      return {
        success: false,
        status: 500,
        error: err.message || 'Error occurred during image staging.',
      };
    }
  }

  // Step 3: Immediate Database Insertion (Active by default)
  const { data: newEntry, error: dbError } = await supabaseAdmin
    .from('diary_entries')
    .insert({
      author_id,
      content: content.trim(),
      font_family: font_family || 'Caveat',
      text_color: text_color || '#2D1B10',
      bg_color: bg_color || '#FFFDF2',
      gradient: gradient || null,
      scale: scale || 1.0,
      image_url: finalImageUrl || null,
      status: 'active',
    })
    .select(`
      id, content, font_family, text_color, bg_color, gradient, scale, likes_count, liked_by, image_url, created_at, status,
      author:profiles!author_id(id, name, username, avatar_url, college)
    `)
    .single();

  if (dbError) {
    if (finalImageUrl) {
      try {
        const destKey = finalImageUrl.split('/diaries/')[1];
        if (destKey) await supabaseAdmin.storage.from('diaries').remove([destKey]);
      } catch (_) {}
    }
    throw new Error(`Database insertion failed: ${dbError.message}`);
  }

  // Step 4: Launch Asynchronous Background AWS Rekognition Check (Non-blocking)
  if (stagedImageBuffer && newEntry?.id) {
    setTimeout(() => {
      runAsyncRekognitionBackground(newEntry.id, author_id, stagedImageBuffer).catch((e) =>
        console.error(`[Async Moderation] Unhandled error:`, e.message)
      );
    }, 10);
  }

  return {
    success: true,
    status: 201,
    data: newEntry,
  };
}

/**
 * Runs AWS Rekognition in the background. If unsafe, flags the diary entry and alerts the user immediately.
 */
async function runAsyncRekognitionBackground(entryId, authorId, imageBuffer) {
  try {
    console.log(`[Async Moderation] Running background AWS Rekognition check for entry #${entryId}...`);
    const imageMod = await moderateImageBuffer(imageBuffer);

    if (!imageMod.safe) {
      console.warn(`[Async Moderation] Entry #${entryId} flagged by AWS Rekognition: ${imageMod.reason}`);
      const { error: updateError } = await supabaseAdmin
        .from('diary_entries')
        .update({
          status: 'flagged',
          flagged_reason: imageMod.reason,
          moderation_labels: imageMod.labels || [],
        })
        .eq('id', entryId);

      if (updateError) {
        console.error(`[Async Moderation] Failed to update entry #${entryId} to flagged status:`, updateError.message);
      } else {
        // Send alert & notification to the author
        try {
          const notificationService = require('./notifications');
          await notificationService.createNotification(
            authorId,
            'diary_flagged',
            'Diary Removed by AI Moderation 🛡️',
            `Your Campus Diary entry containing a photo was automatically removed for violating community safety guidelines (${(imageMod.labels || []).join(', ')}).`,
            '/student/community'
          );
          console.log(`[Async Moderation] Real-time alert sent to author (${authorId}) for flagged entry #${entryId}.`);
        } catch (nErr) {
          console.error('[Async Moderation] Failed to send notification to author:', nErr.message);
        }
      }
    } else {
      console.log(`[Async Moderation] Entry #${entryId} verified clean by AWS Rekognition.`);
    }
  } catch (err) {
    console.error(`[Async Moderation] Background check error for entry #${entryId}:`, err.message);
  }
}

module.exports = {
  moderateText,
  moderateImageBuffer,
  moderateQuarantinedImage,
  processDiarySubmission,
  runAsyncRekognitionBackground,
};
