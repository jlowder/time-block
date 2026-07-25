import { useRef } from 'react';

interface ToolbarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  onExport: () => void;
  onImport: (content: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playChime: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({
  isEditMode,
  onToggleMode,
  onExport,
  onImport,
  soundEnabled,
  onToggleSound,
  playChime,
  onOpenSettings,
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

  return (
    <div
      className="flex items-center justify-center px-3 py-1.5 rounded-lg border shadow-sm"
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
      <div className="flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={() => isEditMode && onToggleMode()}
          className="px-3 py-1 text-xs font-medium transition-colors select-none"
          style={{
            color: isEditMode ? 'var(--text-muted)' : 'var(--accent-indigo)',
            background: isEditMode ? 'transparent' : 'var(--accent-gold-light)',
          }}
        >
          View
        </button>
        <button
          onClick={() => !isEditMode && onToggleMode()}
          className="px-3 py-1 text-xs font-medium transition-colors select-none border-l"
          style={{
            borderColor: 'var(--border-subtle)',
            color: isEditMode ? 'var(--accent-indigo)' : 'var(--text-muted)',
            background: isEditMode ? 'var(--accent-gold-light)' : 'transparent',
          }}
        >
          Edit
        </button>
      </div>

      {/* Divider */}
      <div
        className="w-px h-4 mx-3"
        style={{ background: 'var(--border-subtle)' }}
      />

      {/* Sound toggle */}
      <button
        onClick={() => {
          onToggleSound();
          if (!soundEnabled) playChime();
        }}
        className="p-1.5 rounded transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        title={soundEnabled ? 'Mute' : 'Enable sound'}
      >
        {soundEnabled ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>

      {/* Divider */}
      <div
        className="w-px h-4 mx-3"
        style={{ background: 'var(--border-subtle)' }}
      />

      {/* Import */}
      <button
        onClick={handleFileClick}
        className="px-3 py-1 text-xs font-medium rounded transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        Import
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        className="px-3 py-1 text-xs font-medium rounded transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        Export
      </button>

      {/* Divider */}
      <div
        className="w-px h-4 mx-3"
        style={{ background: 'var(--border-subtle)' }}
      />

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="p-1.5 rounded transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        title="Settings"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
