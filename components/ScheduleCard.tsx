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

const THEME_COLORS: Record<NonNullable<TimeBlock['theme']>, string> = {
  study:    'var(--theme-study)',
  break:    'var(--theme-break)',
  exercise: 'var(--theme-exercise)',
  leisure:  'var(--theme-leisure)',
  special:  'var(--theme-special)',
};

const THEME_BG: Record<NonNullable<TimeBlock['theme']>, string> = {
  study:    'var(--theme-study-bg)',
  break:    'var(--theme-break-bg)',
  exercise: 'var(--theme-exercise-bg)',
  leisure:  'var(--theme-leisure-bg)',
  special:  'var(--theme-special-bg)',
};

const THEME_BADGE: Record<NonNullable<TimeBlock['theme']>, string> = {
  study:    'var(--theme-study-badge)',
  break:    'var(--theme-break-badge)',
  exercise: 'var(--theme-exercise-badge)',
  leisure:  'var(--theme-leisure-badge)',
  special:  'var(--theme-special-badge)',
};

const THEME_BADGE_TEXT: Record<NonNullable<TimeBlock['theme']>, string> = {
  study:    'var(--theme-study-badge-text)',
  break:    'var(--theme-break-badge-text)',
  exercise: 'var(--theme-exercise-badge-text)',
  leisure:  'var(--theme-leisure-badge-text)',
  special:  'var(--theme-special-badge-text)',
};

function formatTime24(h: number, m: number): string {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getThemeColor(theme: NonNullable<TimeBlock['theme']> | undefined): string {
  if (!theme || !(theme in THEME_COLORS)) return THEME_COLORS.study;
  return THEME_COLORS[theme];
}

function getThemeBg(theme: NonNullable<TimeBlock['theme']> | undefined): string {
  if (!theme || !(theme in THEME_BG)) return THEME_BG.study;
  return THEME_BG[theme];
}

function getThemeBadge(theme: NonNullable<TimeBlock['theme']> | undefined): string {
  if (!theme || !(theme in THEME_BADGE)) return THEME_BADGE.study;
  return THEME_BADGE[theme];
}

function getThemeBadgeText(theme: NonNullable<TimeBlock['theme']> | undefined): string {
  if (!theme || !(theme in THEME_BADGE_TEXT)) return THEME_BADGE_TEXT.study;
  return THEME_BADGE_TEXT[theme];
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
  const themeColor = getThemeColor(block.theme);
  const isPast = !isActive && index < activeSlotIndex;
  const opacity = isEditMode ? 1 : (isActive || !isPast ? 1 : 0.65);

  return (
    <div
      className={`relative flex items-start gap-4 py-3 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ opacity }}
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
    >
      {/* Time label */}
      <div className="w-10 pt-0.5 text-right flex-shrink-0" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {formatTime24(block.startH, block.startM)}
        </span>
      </div>

      {/* Timeline connector */}
      <div className="relative flex-shrink-0 w-3 pt-0.5">
        {/* Card dot */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full border-2 ${isActive ? 'w-3 h-3' : 'w-2.5 h-2.5'}`}
          style={{
            top: '3px',
            borderColor: isActive ? 'var(--accent-gold)' : themeColor,
            background: isActive ? 'var(--accent-gold-light)' : 'var(--bg-surface)',
            zIndex: 1,
          }}
        />
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-lg schedule-card"
        style={{
          background: isActive ? 'var(--accent-gold-light)' : 'var(--bg-surface)',
          borderLeft: `4px solid ${themeColor}`,
          boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-start gap-3 p-3.5 sm:p-4">
          {/* Drag handle (edit mode only) */}
          {isEditMode && (
            <div className="pt-0.5 flex-shrink-0" style={{ color: 'var(--border-medium)' }} title="Drag to reorder">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
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
          <div
            className="w-11 h-11 flex-shrink-0 rounded-lg flex items-center justify-center text-xl"
            style={{ background: getThemeBg(block.theme) }}
          >
            {block.icon ?? '\u2022'}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className="text-[11px] font-medium tabular-nums"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatTime24(block.startH, block.startM)}–{formatTime24(block.endH, block.endM)}
                  </span>
                  {block.badge && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: getThemeBadge(block.theme),
                        color: getThemeBadgeText(block.theme),
                      }}
                    >
                      {block.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {block.title}
                </h3>
                {block.desc && (
                  <p
                    className="text-xs sm:text-sm leading-relaxed line-clamp-2 mt-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {block.desc}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
