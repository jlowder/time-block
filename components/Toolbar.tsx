import { useRef } from 'react';

interface ToolbarProps {
  isEditMode: boolean;
  onToggleMode: () => void;
  onExport: () => void;
  onImport: (content: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Toolbar({
  isEditMode,
  onToggleMode,
  onExport,
  onImport,
  soundEnabled,
  onToggleSound,
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
    e.target.value = ''; // Reset for re-import
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 border-b border-white/5">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sound Toggle */}
      <button
        onClick={onToggleSound}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-gray-300 border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
      </button>

      {/* Edit/View Toggle */}
      <button
        onClick={onToggleMode}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium border transition-colors ${
          isEditMode
            ? 'bg-green-900/50 text-green-300 border-green-700'
            : 'bg-blue-900/50 text-blue-300 border-blue-700'
        }`}
      >
        {isEditMode ? '✏️ Edit Mode' : '👁️ View Mode'}
      </button>

      {/* Import */}
      <button
        onClick={handleFileClick}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-gray-300 border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
      >
        📥 Import
      </button>

      {/* Export */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-gray-300 border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
      >
        📤 Export
      </button>

    </div>
  );
}
