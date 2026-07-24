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
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg
          className="mb-4 text-gray-600"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p className="text-sm font-medium">No activities scheduled</p>
        <p className="text-xs mt-1">Use edit mode to add tasks</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8">
      {isDecorating && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-purple-300 animate-pulse">
          <span>✨</span>
          <span>Decorating schedule...</span>
          <span>✨</span>
        </div>
      )}
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
