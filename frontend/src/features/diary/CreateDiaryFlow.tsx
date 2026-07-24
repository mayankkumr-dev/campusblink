import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { loadDraft, saveDraft, clearDraft, queuePublishTask } from './offlineQueue';
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
    
    // Save final state before publishing just in case
    await saveDraft('current_diary_draft', canvasState);

    try {
      await queuePublishTask({
        userId: user.id,
        dataUrl,
        visibility,
        allowComments: canvasState.allowComments ?? true,
        isAnonymous: false,
        tags: [],
        locationTag: '',
      });

      // Clear draft on success
      await clearDraft('current_diary_draft');
      
      toast.success(navigator.onLine ? 'Published successfully!' : 'Saved to offline queue.');
      navigate(-1);
    } catch (e) {
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
