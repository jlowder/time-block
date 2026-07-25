import type { TimeBlock } from '@/lib/types';
import { ScheduleCard } from './ScheduleCard';

interface ScheduleViewProps {
  slots: TimeBlock[];
  activeSlotIndex: number;
  isEditMode: boolean;
  isDecorating?: boolean;
  onSlotDragStart: (index: number) => void;
  onSlotDragOver: (index: number) => void;
  onSlotDragEnd: () => void;
}

export function ScheduleView({
  slots,
  activeSlotIndex,
  isEditMode,
  isDecorating = false,
  onSlotDragStart,
  onSlotDragOver,
  onSlotDragEnd,
}: ScheduleViewProps) {
  if (!slots || slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
        <svg
          className="mb-4"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--border-medium)' }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No activities scheduled</p>
        <p className="text-xs mt-1">Enter edit mode to build your schedule</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Continuous timeline line */}
      <div
        className="absolute left-[56px] top-0 bottom-0 w-px"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--accent-indigo) 5%, var(--accent-indigo) 95%, transparent 100%)',
          opacity: 0.15,
        }}
      />

      {/* Decorate loading state */}
      {isDecorating && (
        <div className="flex items-center justify-center py-3 text-xs font-medium animate-pulse" style={{ color: 'var(--accent-indigo)' }}>
          <span>Refreshing schedule...</span>
        </div>
      )}

      {/* Schedule cards */}
      {slots.map((slot, index) => (
        <ScheduleCard
          key={slot.id}
          block={slot}
          index={index}
          isActive={index === activeSlotIndex}
          isEditMode={isEditMode}
          activeSlotIndex={activeSlotIndex}
          onStartDrag={onSlotDragStart}
          onDragOver={onSlotDragOver}
          onDragEnd={onSlotDragEnd}
        />
      ))}
    </div>
  );
}
