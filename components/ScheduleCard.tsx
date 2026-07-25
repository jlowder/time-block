import type { TimeBlock } from '@/lib/types';

interface ScheduleCardProps {
  block: TimeBlock;
  index: number;
  isActive: boolean;
  isEditMode: boolean;
  activeSlotIndex: number;
  onStartDrag: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

const THEME_STYLES: Record<NonNullable<TimeBlock['theme']>, {
  border: string;
  badgeBg: string;
  badgeText: string;
}> = {
  study:    { border: '#f7971e', badgeBg: 'rgba(247,151,30,0.15)', badgeText: '#f7971e' },
  break:    { border: '#4fc3f7', badgeBg: 'rgba(79,195,247,0.15)', badgeText: '#4fc3f7' },
  exercise: { border: '#a5d6a7', badgeBg: 'rgba(165,214,167,0.15)', badgeText: '#a5d6a7' },
  leisure:  { border: '#ce93d8', badgeBg: 'rgba(206,147,216,0.15)', badgeText: '#ce93d8' },
  special:  { border: '#ef9a9a', badgeBg: 'rgba(239,154,154,0.15)', badgeText: '#ef9a9a' },
};

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getThemeStyles(theme: NonNullable<TimeBlock['theme']> | undefined) {
  if (!theme || !(theme in THEME_STYLES)) return THEME_STYLES.study;
  return THEME_STYLES[theme];
}

export function ScheduleCard({
  block,
  index,
  isActive,
  isEditMode,
  activeSlotIndex,
  onStartDrag,
  onDragOver,
  onDragEnd,
}: ScheduleCardProps) {
  const styles = getThemeStyles(block.theme);
  const timeRange = `${formatTime12(block.startH, block.startM)} – ${formatTime12(block.endH, block.endM)}`;
  const isPast = !isActive && index < activeSlotIndex;
  // Only dim past tasks in view mode; in edit mode all tasks at full opacity
  const opacity = isEditMode ? 1 : (isActive || !isPast ? 1 : 0.35);
  const isDragging = false;

  return (
    <div
      draggable={isEditMode}
      onDragStart={(e) => {
        if (!isEditMode) return;
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
        onStartDrag(index);
      }}
      onDragOver={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      className={`
        relative overflow-hidden rounded-lg border-l-4 transition-all duration-200
        ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isActive ? 'live-slot' : ''}
      `}
      style={{
        borderColor: isActive ? '#ffd700' : styles.border,
        opacity,
      }}
    >
      {/* Theme accent gradient bar at top */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${styles.border}, transparent)` }}
      />

      <div className="flex flex-col sm:flex-row items-start gap-3 p-4">
        {/* Drag handle (edit mode only) */}
        {isEditMode && (
          <div className="mt-1 flex-shrink-0 text-gray-500" title="Drag to reorder">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </div>
        )}

        {/* Icon */}
        <div className="w-12 h-12 flex-shrink-0 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-2xl">
          {block.icon ?? '•'}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Time + Title row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400 tabular-nums">
                  {timeRange}
                </span>
                {block.badge && (
                  <span
                    className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: styles.badgeBg,
                      color: styles.badgeText,
                    }}
                  >
                    {block.badge}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
                {block.title}
              </h3>
              {block.desc && (
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed line-clamp-2">
                  {block.desc}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* LIVE indicator */}
        {isActive && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
            </span>
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}
