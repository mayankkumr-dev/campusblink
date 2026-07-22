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

export async function queuePublishTask(task: {
  userId: string;
  dataUrl: string; // the base64 full image (canvas snapshot)
  visibility: string;
  allowComments: boolean;
  isAnonymous: boolean;
  tags: string[];
  locationTag: string;
  unlockAt?: string | null;
}) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await offlinePublishQueue.setItem(taskId, task);

  // Try to flush immediately if online
  if (navigator.onLine) {
    flushPublishQueue();
  }
}

// Convert base64 DataURL to File object
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

let isFlushing = false;

export async function flushPublishQueue() {
  if (isFlushing || !navigator.onLine) return;

  isFlushing = true;
  try {
    const keys = await offlinePublishQueue.keys();
    for (const key of keys) {
      const task: any = await offlinePublishQueue.getItem(key);
      if (!task) continue;

      // 1. Convert canvas snapshot DataURL to a File object
      const file = dataURLtoFile(task.dataUrl, `diary_${Date.now()}.png`);

      // 2. Upload to AWS S3 via pre-signed URL (migrated from Supabase Storage)
      //    Uses uploadImage from lib/s3.js: compress → presign → PUT to S3
      let imageUrl = '';
      try {
        const { data: uploadData, error: uploadError } = await uploadImage(
          file,
          `diaries/${task.userId}`
        );

        if (!uploadError && uploadData?.url) {
          imageUrl = uploadData.url;
        } else if (uploadError) {
          console.error('[offlineQueue] S3 upload error:', uploadError.message);
          // Leave in queue to retry next time
          continue;
        }
      } catch (uploadErr: any) {
        console.error('[offlineQueue] Upload failed:', uploadErr?.message);
        // Don't remove from queue — retry on next flush
        continue;
      }

      // 3. Insert into DB — bypasses backend moderation (by design for canvas diary entries)
      const { error: dbError } = await supabase
        .from('diary_entries')
        .insert({
          author_id: task.userId,
          image_url: imageUrl,
          visibility: task.visibility,
          allow_comments: task.allowComments,
          is_anonymous: task.isAnonymous,
          tags: task.tags,
          location_tag: task.locationTag,
          unlock_at: task.unlockAt,
          content: 'Canvas Diary Entry',
        });

      if (!dbError) {
        await offlinePublishQueue.removeItem(key);
      } else {
        console.error('[offlineQueue] DB insert error:', dbError.message);
      }
    }
  } catch (error) {
    console.error('[offlineQueue] Error flushing publish queue:', error);
  } finally {
    isFlushing = false;
  }
}

// Automatically retry flush when connectivity is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[offlineQueue] Connection restored — flushing publish queue...');
    flushPublishQueue();
  });
}
