import React from 'react';
import { Globe, Users, Lock } from 'lucide-react';
import { Drawer } from 'vaul';
import { Switch } from '../../../app/components/ui/switch';
import { VisibilityOption } from '../types';

interface DiaryVisibilitySelectorProps {
  visibility: VisibilityOption;
  allowComments: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelectVisibility: (visibility: VisibilityOption) => void;
  onToggleComments: (allow: boolean) => void;
}

export function DiaryVisibilitySelector({
  visibility,
  allowComments,
  isOpen,
  onOpen,
  onClose,
  onSelectVisibility,
  onToggleComments,
}: DiaryVisibilitySelectorProps) {
  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'friends':
        return 'Friends';
      case 'private':
        return 'Only Me';
      default:
        return 'Everyone';
    }
  };

  const getVisibilityIcon = () => {
    switch (visibility) {
      case 'friends':
        return <Users className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--parchment-card-bg)] backdrop-blur-md rounded-full shadow-sm border border-[var(--parchment-card-border)] text-sm font-semibold text-[var(--parchment-text-primary)] hover:bg-[var(--parchment-accent-soft)] active:scale-95 transition-all pointer-events-auto"
      >
        {getVisibilityIcon()}
        <span>{getVisibilityLabel()}</span>
      </button>

      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-xs" />
          <Drawer.Content className="bg-[var(--parchment-bg)] border-t border-[var(--parchment-border)] flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[70] outline-none shadow-2xl">
            <div className="p-6 pb-safe-bottom max-w-md mx-auto w-full">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[var(--parchment-text-secondary)] opacity-30 mb-6" />

              <h3 className="text-xl font-bold font-serif text-[var(--parchment-text-primary)] mb-6">
                Who can see this Diary?
              </h3>

              <div className="space-y-3 mb-6">
                {/* Everyone */}
                <button
                  onClick={() => onSelectVisibility('public')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    visibility === 'public'
                      ? 'border-[var(--parchment-accent)] bg-[var(--parchment-card-bg)]'
                      : 'border-[var(--parchment-card-border)] opacity-80'
                  }`}
                >
                  <div className={`p-3 rounded-full ${visibility === 'public' ? 'bg-[var(--parchment-accent)] text-[var(--parchment-bg)]' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-[var(--parchment-text-primary)]">Everyone</p>
                    <p className="text-xs text-[var(--parchment-text-secondary)]">Appears in Community Feed & Popular</p>
                  </div>
                </button>

                {/* Friends */}
                <button
                  onClick={() => onSelectVisibility('friends')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    visibility === 'friends'
                      ? 'border-[var(--parchment-accent)] bg-[var(--parchment-card-bg)]'
                      : 'border-[var(--parchment-card-border)] opacity-80'
                  }`}
                >
                  <div className={`p-3 rounded-full ${visibility === 'friends' ? 'bg-[var(--parchment-accent)] text-[var(--parchment-bg)]' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-[var(--parchment-text-primary)]">My friends only</p>
                    <p className="text-xs text-[var(--parchment-text-secondary)]">Only visible to people you follow</p>
                  </div>
                </button>

                {/* Private */}
                <button
                  onClick={() => onSelectVisibility('private')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    visibility === 'private'
                      ? 'border-[var(--parchment-accent)] bg-[var(--parchment-card-bg)]'
                      : 'border-[var(--parchment-card-border)] opacity-80'
                  }`}
                >
                  <div className={`p-3 rounded-full ${visibility === 'private' ? 'bg-[var(--parchment-accent)] text-[var(--parchment-bg)]' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-[var(--parchment-text-primary)]">Only Me</p>
                    <p className="text-xs text-[var(--parchment-text-secondary)]">Kept strictly in your personal journal</p>
                  </div>
                </button>
              </div>

              {/* Allow Comments Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--parchment-card-border)] bg-[var(--parchment-card-bg)]">
                <div className="pr-4">
                  <p className="text-sm font-bold text-[var(--parchment-text-primary)]">Allow Comments</p>
                  <p className="text-xs text-[var(--parchment-text-secondary)]">Let viewers leave responses</p>
                </div>
                <Switch checked={allowComments} onCheckedChange={onToggleComments} />
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
