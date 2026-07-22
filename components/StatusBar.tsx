import { useState, useEffect, useRef } from 'react';

interface StatusBarProps {
  activeSlotIndex: number;
  slots: Array<{ id: string; title: string; startH: number; startM: number }> | undefined;
  isEditMode: boolean;
}

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getActiveSlotMessage(
  index: number,
  slots: Array<{ id: string; title: string; startH: number; startM: number }> | undefined,
): string {
  if (!slots || slots.length === 0) return '⏸ No activities scheduled';
  if (index >= slots.length - 1 && index >= 0) return '✅ All activities complete for today!';
  if (index < 0) {
    const nextSlot = slots[0];
    if (nextSlot) return `⏸ Between activities — next slot starts at ${formatTime12(nextSlot.startH, nextSlot.startM)}`;
    return '⏸ No activities scheduled';
  }
  const current = slots[index];
  return `🔴 Currently: ${current.title} — starting at ${formatTime12(current.startH, current.startM)}`;
}

export function StatusBar({ activeSlotIndex, slots, isEditMode }: StatusBarProps) {
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeSlotIndexRef = useRef(activeSlotIndex);
  const slotsRef = useRef(slots);

  useEffect(() => {
    setMessage(getActiveSlotMessage(activeSlotIndex, slots));
  }, [activeSlotIndex, slots]);

  useEffect(() => {
    setMessage(getActiveSlotMessage(activeSlotIndex, slots));
  }, []);

  useEffect(() => {
    activeSlotIndexRef.current = activeSlotIndex;
  }, [activeSlotIndex]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      // Read current state from refs to avoid recreating interval
      const idx = activeSlotIndexRef.current;
      const sl = slotsRef.current;
      setMessage(getActiveSlotMessage(idx, sl));
    }, 30000);
    return () => clearInterval(timer);
  }, []); // Empty deps - interval runs independently

  return (
    <div className="fixed bottom-0 left-0 right-0 h-10 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700/50 flex items-center justify-between px-4 z-50">
      {/* Left: Edit mode badge or message */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isEditMode ? (
          <span className="text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
            📝 Edit Mode
          </span>
        ) : (
          <p className="text-sm text-gray-300 truncate">
            {message || '—'}
          </p>
        )}
      </div>

      {/* Right: Time or edit badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isEditMode ? null : (
          <span className="text-xs text-gray-500 font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
