'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSchedule, saveSchedule, exportSchedule, getDefaultSchedule, playChime } from '@/lib/schedule';
import { ScheduleView } from '@/components/ScheduleView';
import { ChatInterface } from '@/components/ChatInterface';
import { StatusBar } from '@/components/StatusBar';
import { Toolbar } from '@/components/Toolbar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ThemeLegend } from '@/components/ThemeLegend';

type Theme = 'study' | 'break' | 'exercise' | 'leisure' | 'special';
interface TimeBlock {
  id: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  title: string;
  desc?: string;
  icon?: string;
  theme?: Theme;
  badge?: string;
  badgeClass?: string;
}
interface ScheduleData {
  slots: TimeBlock[];
}

function getActiveSlotIndex(slots: TimeBlock[] | undefined): number {
  if (!slots || slots.length === 0) return -1;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const startMin = slot.startH * 60 + slot.startM;
    const endMin = slot.endH * 60 + slot.endM;

    if (currentMin >= startMin && currentMin < endMin) {
      return i;
    }
  }

  return -1;
}

function calcActiveSlotIndex(slots: TimeBlock[] | undefined): number {
  return getActiveSlotIndex(slots);
}

export default function HomePage() {
  const [scheduleData, setScheduleData] = useState(getDefaultSchedule());
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(-1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDecorating, setIsDecorating] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('soundEnabled') !== 'false'; } catch { return true; }
  });
  const [showSettings, setShowSettings] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevActiveIndexRef = useRef<number>(-1);
  const lastActiveIndexRef = useRef<number | null>(null);
  const prevEditModeRef = useRef(isEditMode);
  const hasMountedRef = useRef(false);

  // Load schedule from localStorage on mount
  useEffect(() => {
    const stored = loadSchedule();
    setScheduleData(stored);
  }, []);

  // Persist soundEnabled
  useEffect(() => {
    try { localStorage.setItem('soundEnabled', String(soundEnabled)); } catch {}
  }, [soundEnabled]);

  // Calculate active slot
  useEffect(() => {
    if (isEditMode) return;
    if (!scheduleData || !scheduleData.slots) return;
    const index = calcActiveSlotIndex(scheduleData.slots);
    setActiveSlotIndex(index);
  }, [scheduleData.slots, isEditMode]);

  // Recalculate active slot every 30 seconds in view mode
  useEffect(() => {
    if (isEditMode) return;
    if (!scheduleData || !scheduleData.slots) return;

    const timer = setInterval(() => {
      const index = calcActiveSlotIndex(scheduleData.slots);
      setActiveSlotIndex(index);
    }, 30_000);

    return () => clearInterval(timer);
  }, [scheduleData.slots, isEditMode]);

  // Audio chime when active slot changes
  useEffect(() => {
    if (isEditMode) return;

    // Skip chime on mount — only play when active slot actually transitions
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastActiveIndexRef.current = activeSlotIndex;
      return;
    }

    if (
      lastActiveIndexRef.current !== activeSlotIndex &&
      activeSlotIndex >= 0
    ) {
      try {
        if (!soundEnabled) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          )();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const notes = [523.25, 659.25, 783.99, 1046.50];
        const now = ctx.currentTime;

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;

          const noteStart = now + i * 0.15;
          const noteEnd = noteStart + 0.12;

          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, noteEnd);

          osc.start(noteStart);
          osc.stop(noteEnd + 0.01);
        });

        const bellStart = now + notes.length * 0.15;
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.type = 'sine';
        bellOsc.frequency.value = 880;

        const bellEnd = bellStart + 0.5;
        bellGain.gain.setValueAtTime(0, bellStart);
        bellGain.gain.linearRampToValueAtTime(0.4, bellStart + 0.01);
        bellGain.gain.exponentialRampToValueAtTime(0.01, bellEnd);

        bellOsc.start(bellStart);
        bellOsc.stop(bellEnd + 0.01);
      } catch {
        // Autoplay blocked
      }
    }
    lastActiveIndexRef.current = activeSlotIndex;
  }, [activeSlotIndex, soundEnabled]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  const recalculateSlots = useCallback((slots: TimeBlock[], fromIndex: number, toIndex: number): TimeBlock[] => {
    if (fromIndex === toIndex) return slots;
    if (slots.length <= 1) return slots;

    const copy = slots.map((s) => ({ ...s }));
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);

    const originalDurations = copy.map(
      (s) => (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM),
    );

    let currentTotal = copy[0].endH * 60 + copy[0].endM;
    for (let i = 1; i < copy.length; i++) {
      const slotDuration = originalDurations[i];
      const newStartTotal = currentTotal;
      const newEndTotal = newStartTotal + slotDuration;
      copy[i] = {
        ...copy[i],
        startH: Math.floor(newStartTotal / 60),
        startM: newStartTotal % 60,
        endH: Math.floor(newEndTotal / 60),
        endM: newEndTotal % 60,
      };
      currentTotal = newEndTotal;
    }

    return copy;
  }, []);

  const onSlotDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const onSlotDragOver = useCallback(
    (overIndex: number) => {
      if (draggedIndex === null || draggedIndex === overIndex) return;

      const newSlots = recalculateSlots(
        scheduleData.slots,
        draggedIndex,
        overIndex,
      );
      const newSchedule = { slots: newSlots };
      saveSchedule(newSchedule);
      setScheduleData(newSchedule);
      setDraggedIndex(overIndex);
    },
    [draggedIndex, scheduleData.slots],
  );

  const onSlotDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleExport = useCallback(() => {
    exportSchedule(scheduleData);
  }, [scheduleData]);

  const handleImport = useCallback((content: string) => {
    try {
      const parsed = JSON.parse(content) as ScheduleData;
      if (!Array.isArray(parsed.slots)) {
        alert('Invalid schedule file: missing slots array');
        return;
      }
      saveSchedule(parsed);
      setScheduleData(parsed);
    } catch {
      alert('Failed to parse schedule file');
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) playChime();
      return next;
    });
  }, []);

  const onScheduleChange = useCallback((data: ScheduleData) => {
    setScheduleData(data);
    saveSchedule(data);
  }, []);

  // Decorate effect
  useEffect(() => {
    if (prevEditModeRef.current && !isEditMode) {
      prevEditModeRef.current = false;

      const decorateTasks = async () => {
        setIsDecorating(true);
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: 'Decorate all tasks with icons, descriptions, and themes.',
              schedule: scheduleData,
            }),
          });

          const data = await response.json();

          if (data.schedule && data.schedule.slots && data.schedule.slots.length > 0) {
            setScheduleData(data.schedule);
            saveSchedule(data.schedule);
          }
        } catch (err) {
          console.error('Decoration failed:', err);
        } finally {
          setIsDecorating(false);
        }
      };
      decorateTasks();
    }
    prevEditModeRef.current = isEditMode;
  }, [isEditMode]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page)]">
      {/* Header */}
      <header className="pt-8 pb-4 px-4 text-center flex-shrink-0">
        <h1 className="text-[42px] leading-tight font-bold tracking-tight text-[var(--text-primary)]">
          Time Block
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Your daily schedule</p>
      </header>

      {/* Toolbar */}
      <div className="flex justify-center flex-shrink-0">
        <Toolbar
          isEditMode={isEditMode}
          onToggleMode={toggleEditMode}
          onExport={handleExport}
          onImport={handleImport}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          playChime={playChime}
          onOpenSettings={() => setShowSettings(true)}
          isDecorating={isDecorating}
        />
      </div>

      {/* Main Content — scrollable area */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto pr-4 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-1 gap-10 min-h-0 overflow-y-auto pl-[20px]">
          {/* Legend column — centered in left margin area */}
          <div className="flex flex-col w-36 flex-shrink-0 sticky top-0">
            <ThemeLegend />
          </div>
          {/* Schedule content */}
          <div className="flex-1 min-w-0 min-h-0">
            {isEditMode ? (
              <div className="flex flex-col-reverse md:flex-row gap-4 min-h-0">
                <div className="flex-1 min-w-0 min-h-0">
                  <ScheduleView
                    slots={scheduleData.slots}
                    activeSlotIndex={activeSlotIndex}
                    isEditMode={isEditMode}
                    isDecorating={isDecorating}
                    onSlotDragStart={onSlotDragStart}
                    onSlotDragOver={onSlotDragOver}
                    onSlotDragEnd={onSlotDragEnd}
                  />
                </div>
                <div className="w-full md:w-[420px] flex-shrink-0 flex flex-col max-h-[50vh] md:h-full">
                  <ChatInterface isVisible={isEditMode} scheduleData={scheduleData} onScheduleChange={onScheduleChange} />
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <ScheduleView
                  slots={scheduleData.slots}
                  activeSlotIndex={activeSlotIndex}
                  isEditMode={isEditMode}
                  isDecorating={isDecorating}
                  onSlotDragStart={onSlotDragStart}
                  onSlotDragOver={onSlotDragOver}
                  onSlotDragEnd={onSlotDragEnd}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <StatusBar
        activeSlotIndex={activeSlotIndex}
        slots={scheduleData.slots}
        isEditMode={isEditMode}
      />

      {/* Settings Dialog */}
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
