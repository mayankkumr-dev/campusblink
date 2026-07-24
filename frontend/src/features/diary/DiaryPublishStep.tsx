import React, { useState } from 'react';
import { Button } from '../../app/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Switch } from '../../app/components/ui/switch';
import { Label } from '../../app/components/ui/label';

interface DiaryPublishStepProps {
  previewUrl: string;
  onPublish: (settings: any) => void;
  onBack: () => void;
}

export function DiaryPublishStep({ previewUrl, onPublish, onBack }: DiaryPublishStepProps) {
  const [visibility, setVisibility] = useState('public');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleSubmit = async () => {
    setIsPublishing(true);
    await onPublish({
      visibility,
      isAnonymous,
      tags: [],
      locationTag: '',
      unlockAt: null,
    });
    setIsPublishing(false);
  };

  return (
    <div className="flex flex-col h-full h-screen w-full relative bg-white pt-safe-top overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 sticky top-0 bg-white z-10 shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </Button>
        <span className="font-semibold text-sm">Publish Settings</span>
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={isPublishing} className="rounded-full px-4">
          {isPublishing ? 'Publishing...' : 'Publish'}
        </Button>
      </div>

      <div className="p-4 flex flex-col items-center">
        <div className="w-48 h-auto shadow-md rounded-lg overflow-hidden border border-gray-200 mb-6">
          <img src={previewUrl} alt="Diary Preview" className="w-full h-auto object-cover" />
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public Feed</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private (Only Me)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === 'public' && (
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg shadow-sm">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Post Anonymously</Label>
                <p className="text-xs text-gray-500">Hide your identity on the public feed.</p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
          )}
          
          <p className="text-xs text-gray-400 text-center mt-6">
            More settings like Time Capsule and Location tagging coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}
