import { useState } from 'react';
import type { TimeBlock, SectionDivider } from '@/lib/types';
import { ScheduleCard } from './ScheduleCard';

interface ScheduleViewProps {
  slots: TimeBlock[];
  dividers: SectionDivider[];
  activeSlotIndex: number;
  isEditMode: boolean;
  onSlotDragStart: (index: number) => void;
  onSlotDragOver: (index: number) => void;
  onSlotDragEnd: () => void;
  onSlotDragOverDivider: (renderListIndex: number, dividerIndex: number) => void;
}

type RenderItem = 
  | { type: 'divider'; label: string; index: number }
  | { type: 'slot'; slot: TimeBlock; index: number };

function buildRenderList(slots: TimeBlock[], dividers: SectionDivider[]): RenderItem[] {
  const items: RenderItem[] = [];
  // Trailing dividers (index >= slots.length - 1) render AFTER the last slot
  const trailingIndices = new Set<number>();
  for (const d of dividers) {
    if (d.index >= slots.length - 1) {
      trailingIndices.add(d.index);
    }
  }

  for (let i = 0; i < slots.length; i++) {
    // Insert non-trailing dividers before this slot
    const dividersHere = dividers.filter((d) => d.index === i && !trailingIndices.has(i));
    for (const d of dividersHere) {
      items.push({ type: 'divider', label: d.label, index: d.index });
    }
    items.push({ type: 'slot', slot: slots[i], index: i });
  }

  // Render trailing dividers at the end
  for (const d of dividers) {
    if (trailingIndices.has(d.index)) {
      items.push({ type: 'divider', label: d.label, index: d.index });
    }
  }

  return items;
}

export function ScheduleView({
  slots,
  dividers,
  activeSlotIndex,
  isEditMode,
  onSlotDragStart,
  onSlotDragOver,
  onSlotDragEnd,
  onSlotDragOverDivider,
}: ScheduleViewProps) {
  const [dragOverDividerIndex, setDragOverDividerIndex] = useState<number | null>(null);
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

  const renderList = buildRenderList(slots, dividers);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8">
      {renderList.map((item) => {
        if (item.type === 'divider') {
          return (
            <div
              key={`divider-${item.index}`}
              className={`section-divider ${dragOverDividerIndex === item.index ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverDividerIndex(item.index);
              }}
              onDragLeave={() => setDragOverDividerIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDividerIndex(null);
                onSlotDragOverDivider(item.index, item.index);
              }}
            >
              <p className="text-center text-sm tracking-widest uppercase text-gray-400 font-medium">
                {item.label}
              </p>
            </div>
          );
        }

        return (
          <ScheduleCard
            key={item.slot.id}
            block={item.slot}
            index={item.index}
            isActive={item.index === activeSlotIndex}
            isEditMode={isEditMode}
            activeSlotIndex={activeSlotIndex}
            onStartDrag={onSlotDragStart}
            onDragOver={onSlotDragOver}
            onDragEnd={onSlotDragEnd}
          />
        );
      })}
    </div>
  );
}
