import { useState, useEffect, useRef } from 'react';

interface StatusBarProps {
  activeSlotIndex: number;
  slots: Array<{ id: string; title: string; startH: number; startM: number; endH?: number; endM?: number; icon?: string; theme?: string }> | undefined;
  isEditMode: boolean;
}

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getTimeRemaining(
  startH: number,
  startM: number,
  endH: number,
  endM: number,
): string {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (currentMin < startMin) {
    const diff = startMin - currentMin;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  if (currentMin >= startMin && currentMin < endMin) {
    const diff = endMin - currentMin;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  return 'Now';
}

const THEME_COLORS: Record<string, string> = {
  study:    'var(--theme-study)',
  break:    'var(--theme-break)',
  exercise: 'var(--theme-exercise)',
  leisure:  'var(--theme-leisure)',
  special:  'var(--theme-special)',
};

function getThemeColor(theme: string | undefined): string {
  if (!theme || !(theme in THEME_COLORS)) return 'var(--border-medium)';
  return THEME_COLORS[theme];
}

export function StatusBar({ activeSlotIndex, slots, isEditMode }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSlot, setActiveSlot] = useState<{
    title: string;
    icon: string;
    startH: number;
    startM: number;
    endH: number;
    endM: number;
    theme: string | undefined;
  } | null>(null);
  const [remaining, setRemaining] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const activeSlotIndexRef = useRef(activeSlotIndex);
  const slotsRef = useRef(slots);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active slot info
  useEffect(() => {
    const idx = activeSlotIndex;
    if (idx >= 0 && idx < (slots?.length ?? 0)) {
      const slot = slots![idx];
      setActiveSlot({
        title: slot.title,
        icon: slot.icon ?? '\u2022',
        startH: slot.startH,
        startM: slot.startM,
        endH: slot.endH ?? 23,
        endM: slot.endM ?? 59,
        theme: slot.theme,
      });

      setRemaining(getTimeRemaining(slot.startH, slot.startM, slot.endH ?? 23, slot.endM ?? 59));
    } else {
      setActiveSlot(null);
      setRemaining('');
    }
  }, [activeSlotIndex, slots]);

  // Periodically refresh remaining time
  useEffect(() => {
    const timer = setInterval(() => {
      const idx = activeSlotIndexRef.current;
      const sl = slotsRef.current;
      if (idx >= 0 && idx < (sl?.length ?? 0)) {
        const slot = sl![idx];
        setRemaining(getTimeRemaining(slot.startH, slot.startM, slot.endH ?? 23, slot.endM ?? 59));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute status message based on time of day
  useEffect(() => {
    if (!slots || slots.length === 0) {
      setStatusMessage("Schedule hasn't started yet — ☕ relax");
      return;
    }

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const firstSlot = slots![0];
    const lastSlot = slots![slots.length - 1];
    const firstSlotStart = firstSlot.startH * 60 + firstSlot.startM;
    const lastSlotEnd = (lastSlot.endH ?? 23) * 60 + (lastSlot.endM ?? 59);

    if (currentMin < firstSlotStart) {
      setStatusMessage("Schedule hasn't started yet — ☕ relax");
    } else if (currentMin >= lastSlotEnd) {
      setStatusMessage('Activity block complete! 🎉');
    } else if (activeSlotIndex < 0) {
      setStatusMessage('Between activities');
    } else {
      setStatusMessage('');
    }
  }, [slots, activeSlotIndex]);

  // Sync refs
  useEffect(() => { activeSlotIndexRef.current = activeSlotIndex; }, [activeSlotIndex]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);

  if (isEditMode) return null;

  const themeColor = activeSlot ? getThemeColor(activeSlot.theme) : 'var(--border-medium)';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
      style={{
        background: 'var(--bg-surface)',
        borderTop: `1px solid var(--border-subtle)`,
      }}
    >
      {/* Left: Current activity */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {statusMessage ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)] opacity-60" />
            <p className="text-xs text-[var(--text-muted)]">{statusMessage}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {activeSlot && (
              <>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: themeColor }} />
                <span>{activeSlot.icon}</span>
                <p className="text-sm font-medium truncate">{activeSlot.title}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center: Time remaining */}
      {activeSlot && (
        <div className="flex items-center gap-2 px-3">
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {remaining === 'Now' ? 'Now' : `Ends in ${remaining}`}
          </span>
          <span className="w-px h-3" style={{ background: 'var(--border-subtle)' }} />
        </div>
      )}

      {/* Right: Clock */}
      <div
        className="flex-shrink-0 text-sm font-medium tabular-nums"
        style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          color: 'var(--text-secondary)',
        }}
      >
        {currentTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
