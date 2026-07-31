import localforage from 'localforage';
import { supabase } from '../../lib/supabase';
import { uploadImage } from '../../lib/s3';

// Setup isolated stores
export const diaryDraftsStore = localforage.createInstance({
  name: 'CampusBlink',
  storeName: 'diary_drafts'
});

export const offlinePublishQueue = localforage.createInstance({
  name: 'CampusBlink',
  storeName: 'offline_publish_queue'
});

export async function saveDraft(key: string, data: any) {
  await diaryDraftsStore.setItem(key, data);
}

export async function loadDraft(key: string) {
  return await diaryDraftsStore.getItem(key);
}

export async function clearDraft(key: string) {
  await diaryDraftsStore.removeItem(key);
}

export interface PublishTask {
  userId: string;
  dataUrl: string;
  contentText?: string;
  fontFamily?: string;
  textColor?: string;
  bgColor?: string;
  gradient?: string | null;
  visibility?: string;
  allowComments?: boolean;
  isAnonymous?: boolean;
  tags?: string[];
  locationTag?: string;
  unlockAt?: string | null;
  /** Daily prompt ID to record participation against on successful publish */
  promptId?: string | null;
}

export async function queuePublishTask(task: PublishTask) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await offlinePublishQueue.setItem(taskId, task);

  // Try to flush immediately if online
  if (navigator.onLine) {
    await flushPublishQueue();
  }
}

// Convert base64 DataURL to File object safely
function dataURLtoFile(dataurl: string, filename: string): File | null {
  try {
    if (!dataurl || !dataurl.includes(',')) return null;
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.warn('[offlineQueue] dataURLtoFile failed:', err);
    return null;
  }
}

let isFlushing = false;

export async function flushPublishQueue(): Promise<boolean> {
  if (isFlushing) return true;
  if (!navigator.onLine) return true; // queued safely for offline sync

  isFlushing = true;
  let overallSuccess = true;

  try {
    const keys = await offlinePublishQueue.keys();
    if (keys.length === 0) return true;

    for (const key of keys) {
      const task: PublishTask = await offlinePublishQueue.getItem(key);
      if (!task || !task.userId) {
        await offlinePublishQueue.removeItem(key);
        continue;
      }

      // 1. Convert canvas snapshot DataURL to a File object
      const file = dataURLtoFile(task.dataUrl, `diary_${Date.now()}.png`);

      // 2. Upload image via S3 library or direct Supabase Storage bucket
      let imageUrl = '';

      if (file) {
        // Attempt 1: Upload via S3 helper
        try {
          const { data: uploadData, error: uploadError } = await uploadImage(
            file,
            `diaries/${task.userId}`
          );
          if (!uploadError && uploadData?.url) {
            imageUrl = uploadData.url;
          }
        } catch (s3Err: any) {
          console.warn('[offlineQueue] S3 upload warning:', s3Err?.message);
        }

        // Attempt 2: Direct Supabase Storage 'diaries' bucket
        if (!imageUrl) {
          try {
            const storagePath = `${task.userId}/diary_${Date.now()}.png`;
            const { data: supaData } = await supabase.storage
              .from('diaries')
              .upload(storagePath, file, { contentType: 'image/png', upsert: true });

            if (supaData) {
              const { data: publicUrlData } = supabase.storage.from('diaries').getPublicUrl(storagePath);
              imageUrl = publicUrlData?.publicUrl || '';
            }
          } catch (supaErr: any) {
            console.warn('[offlineQueue] Supabase storage upload warning:', supaErr?.message);
          }
        }
      }

      // 3. Insert into Supabase DB table `diary_entries`
      const payload: any = {
        author_id: task.userId,
        content: task.contentText && task.contentText.trim().length > 0 ? task.contentText.trim() : 'Diary Story',
        font_family: task.fontFamily || 'Caveat',
        text_color: task.textColor || '#2D1B10',
        bg_color: task.bgColor || '#FFFDF2',
        scale: 1.0,
        status: 'active',
        visibility: task.visibility || 'everyone',
      };

      if (task.gradient) payload.gradient = task.gradient;
      if (imageUrl) payload.image_url = imageUrl;

      console.log('[offlineQueue] Submitting diary payload to Supabase:', payload);

      const { data: dbData, error: dbError } = await supabase
        .from('diary_entries')
        .insert(payload)
        .select('id');

      if (!dbError && dbData && dbData.length > 0) {
        const insertedId = dbData[0].id;
        console.log('[offlineQueue] Diary successfully inserted into DB:', insertedId);
        await offlinePublishQueue.removeItem(key);

        // Record daily prompt participation if the user had tapped Participate
        // Deferred to publish-time (not on intent tap) so abandoned entries don't count
        if (task.promptId && insertedId) {
          try {
            await fetch(`/api/diary/prompt-of-day/${task.promptId}/participate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ diary_entry_id: insertedId }),
            });
          } catch (participateErr) {
            // Non-critical — don't fail publish if participation recording fails
            console.warn('[offlineQueue] Failed to record prompt participation:', participateErr);
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('diary_published', { detail: dbData[0] }));
        }
      } else {
        console.error('[offlineQueue] Primary DB insert error:', dbError?.message || dbError);

        // Fallback: minimal insert if optional schema fields failed
        const minimalPayload = {
          author_id: task.userId,
          content: task.contentText && task.contentText.trim().length > 0 ? task.contentText.trim() : 'Diary Story',
        };

        const { data: fbData, error: fbError } = await supabase
          .from('diary_entries')
          .insert(minimalPayload)
          .select('id');

        if (!fbError && fbData && fbData.length > 0) {
          console.log('[offlineQueue] Minimal fallback insert succeeded:', fbData[0].id);
          await offlinePublishQueue.removeItem(key);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('diary_published', { detail: fbData[0] }));
          }
        } else {
          console.error('[offlineQueue] Fallback DB insert also failed:', fbError?.message || fbError);
          overallSuccess = false;
        }
      }
    }
  } catch (error) {
    console.error('[offlineQueue] Unexpected error flushing publish queue:', error);
    overallSuccess = false;
  } finally {
    isFlushing = false;
  }
  return overallSuccess;
}

// Automatically retry flush when connectivity is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[offlineQueue] Connection restored — flushing publish queue...');
    flushPublishQueue();
  });
}
