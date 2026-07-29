import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { loadDraft, saveDraft, clearDraft, queuePublishTask, flushPublishQueue } from './offlineQueue';
import { DiaryEditor } from './DiaryEditor';

export function CreateDiaryFlow() {
  const [draftState, setDraftState] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there is an existing draft
    loadDraft('current_diary_draft').then((draft) => {
      if (draft) setDraftState(draft);
      setIsLoaded(true);
    });
  }, []);

  const handlePublish = async (dataUrl: string, visibility: string, canvasState: any) => {
    if (!user) return;
    
    // Save final state before publishing
    await saveDraft('current_diary_draft', canvasState);

    // Extract text content and styling from canvasState
    const textNode = canvasState?.elements?.find((el: any) => el.type === 'text');
    const contentText = textNode?.content?.trim() || '';
    const fontFamily = textNode?.fontFamily || 'Caveat';
    const textColor = textNode?.textColor || '#2D1B10';
    const bgColor = canvasState?.bgColor || '#FFFDF2';
    const gradient = canvasState?.gradient || null;

    try {
      const authUser = (await supabase.auth.getUser()).data.user;
      const currentUserId = authUser?.id || user.id;

      await queuePublishTask({
        userId: currentUserId,
        dataUrl,
        contentText,
        fontFamily,
        textColor,
        bgColor,
        gradient,
        visibility,
        allowComments: canvasState?.allowComments ?? true,
        isAnonymous: false,
        tags: [],
        locationTag: '',
      });

      // Flush queue immediately so DB row is created right now
      await flushPublishQueue();

      // Clear draft on success
      await clearDraft('current_diary_draft');
      
      toast.success(navigator.onLine ? 'Published successfully!' : 'Saved to offline queue.');
      navigate('/student/community');
    } catch (e) {
      console.error('[CreateDiaryFlow] Publish error:', e);
      toast.error('Failed to publish entry.');
    }
  };

  const handleCancelEditor = () => {
    if (window.confirm('Discard this entry?')) {
      clearDraft('current_diary_draft');
      navigate(-1);
    }
  };

  if (!isLoaded) {
    return <div className="absolute inset-0 bg-white" />; // White loading screen
  }

  return (
    <DiaryEditor
      initialState={draftState}
      onPublish={handlePublish}
      onCancel={handleCancelEditor}
      onSaveDraft={(state) => saveDraft('current_diary_draft', state)}
    />
  );
}
