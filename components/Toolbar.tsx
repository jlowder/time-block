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

      {/* Sound Toggle — prominent on/off */}
      <button
        onClick={() => {
          onToggleSound();
          if (!soundEnabled) playChime();
        }}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
          soundEnabled
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
        }`}
        title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
      >
        <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
        <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
      </button>

      {/* Edit/View Toggle — prominent toggle switch */}
      <button
        onClick={onToggleMode}
        type="button"
        className={`relative flex items-center w-40 h-10 rounded-full p-1 transition-colors duration-300 cursor-pointer select-none ${
          isEditMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-500'
        }`}
      >
        {/* Sliding white pill */}
        <span
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-lg transition-all duration-300 ease-in-out bg-white/90 ${
            isEditMode ? 'right-1' : 'left-1'
          }`}
        />
        {/* Labels — active dark (on white pill), inactive white (on colored bg) */}
        <span className={`relative z-10 flex-1 text-center text-sm font-bold transition-colors duration-300 ${
          isEditMode ? 'text-white/80' : 'text-gray-700'
        }`}>
          👁️ View
        </span>
        <span className={`relative z-10 flex-1 text-center text-sm font-bold transition-colors duration-300 ${
          isEditMode ? 'text-gray-700' : 'text-white/80'
        }`}>
          ✏️ Edit
        </span>
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

      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-gray-300 border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
        title="LLM settings"
      >
        ⚙️ Settings
      </button>
    </div>
  );
}
