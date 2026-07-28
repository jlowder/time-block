import { useRef } from 'react';
import { FilePlus, FolderOpen, SpeakerHigh, SpeakerX, Gear, ShareNetwork } from '@phosphor-icons/react';

interface ToolbarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  onExport: () => void;
  onImport: (content: string) => void;
  onShare: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playChime: () => void;
  onOpenSettings: () => void;
  isDecorating?: boolean;
}

export function Toolbar({
  isEditMode,
  onToggleMode,
  onExport,
  onImport,
  onShare,
  soundEnabled,
  onToggleSound,
  playChime,
  onOpenSettings,
  isDecorating = false,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result;
        if (typeof content === 'string') {
          onImport(content);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const circularBtn = (active?: boolean) =>
    `flex items-center justify-center rounded-full transition-all duration-150 ${
      active ? 'border' : 'border-transparent'
    } ${isDecorating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-surface-hover)] active:scale-[0.96]'}`;

  const pillBtn = (active?: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-full transition-all duration-150 ${
      active ? 'border' : 'border-transparent'
    } ${isDecorating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-surface-hover)] active:scale-[0.96]'}`;

  return (
    <div
      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Segmented control: View / Edit */}
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => !isDecorating && isEditMode && onToggleMode()}
          className={`px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none ${
            isEditMode ? '' : 'hover:bg-[var(--bg-surface-hover)]'
          } ${isDecorating ? 'opacity-50 cursor-not-allowed' : ''} active:scale-[0.96]`}
          style={{
            color: isEditMode ? 'var(--accent-indigo)' : 'var(--text-muted)',
            background: isEditMode ? 'var(--accent-gold-light)' : 'transparent',
          }}
          disabled={isDecorating}
        >
          View
        </button>
        <button
          onClick={() => !isDecorating && !isEditMode && onToggleMode()}
          className={`px-3 py-1.5 text-xs font-semibold transition-all duration-150 select-none border-l ${
            !isEditMode ? '' : 'hover:bg-[var(--bg-surface-hover)]'
          } ${isDecorating ? 'opacity-50 cursor-not-allowed' : ''} active:scale-[0.96]`}
          style={{
            borderColor: 'var(--border-subtle)',
            color: isEditMode ? 'var(--text-muted)' : 'var(--accent-indigo)',
            background: isEditMode ? 'transparent' : 'var(--accent-gold-light)',
          }}
          disabled={isDecorating}
        >
          Edit
        </button>
      </div>

      {/* Divider */}
      <div
        className="w-px h-5 mx-1"
        style={{ background: 'var(--border-subtle)' }}
      />

      {/* Sound toggle */}
      <button
        onClick={() => {
          if (isDecorating) return;
          onToggleSound();
          if (!soundEnabled) playChime();
        }}
        className={circularBtn(soundEnabled)}
        style={{ color: 'var(--text-secondary)', width: 34, height: 34 }}
        title={soundEnabled ? 'Mute' : 'Enable sound'}
        disabled={isDecorating}
      >
        {soundEnabled ? (
          <SpeakerHigh weight="fill" size={16} />
        ) : (
          <SpeakerX weight="fill" size={16} />
        )}
      </button>

      {/* Divider */}
      <div
        className="w-px h-5 mx-1"
        style={{ background: 'var(--border-subtle)' }}
      />

      {/* Import */}
      <button
        onClick={() => !isDecorating && handleFileClick()}
        className={pillBtn()}
        style={{ color: 'var(--text-secondary)' }}
        disabled={isDecorating}
      >
        <FolderOpen weight="fill" size={14} />
        <span className="text-xs font-medium">Import</span>
      </button>

      {/* Export */}
      <button
        onClick={() => !isDecorating && onExport()}
        className={pillBtn()}
        style={{ color: 'var(--text-secondary)' }}
        disabled={isDecorating}
      >
        <FilePlus weight="fill" size={14} />
        <span className="text-xs font-medium">Export</span>
      </button>

      {/* Share */}
      <button
        onClick={() => !isDecorating && onShare()}
        className={`rounded-full transition-all duration-150 flex items-center justify-center gap-1.5 ${
          isDecorating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-surface-hover)] active:scale-[0.96]'
        }`}
        style={{
          color: 'var(--accent-indigo)',
          padding: '7px 12px',
        }}
        disabled={isDecorating}
        title="Share as schedule.html"
      >
        <ShareNetwork weight="fill" size={14} />
        <span className="text-xs font-semibold">Share</span>
      </button>

      {/* Settings */}
      <button
        onClick={() => !isDecorating && onOpenSettings()}
        className={circularBtn()}
        style={{ color: 'var(--text-secondary)', width: 34, height: 34 }}
        title="Settings"
        disabled={isDecorating}
      >
        <Gear size={16} />
      </button>
    </div>
  );
}
