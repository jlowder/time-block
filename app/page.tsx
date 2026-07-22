'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSchedule, saveSchedule, resetSchedule, exportSchedule, getDefaultSchedule } from '@/lib/schedule';
import { ScheduleView } from '@/components/ScheduleView';
import { ChatInterface } from '@/components/ChatInterface';
import { StatusBar } from '@/components/StatusBar';
import { Toolbar } from '@/components/Toolbar';

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
interface SectionDivider {
  index: number;
  label: string;
}
interface ScheduleData {
  slots: TimeBlock[];
  dividers: SectionDivider[];
}

function getActiveSlotIndex(slots: TimeBlock[] | undefined): number {
  if (!slots || slots.length === 0) return -1;
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    const startMin = slot.startH * 60 + slot.startM;
    const endMin = slot.endH * 60 + slot.endM;
    if (currentMin >= startMin) return i;
  }
  return -1;
}

function calcActiveSlotIndex(slots: TimeBlock[] | undefined): number {
  return getActiveSlotIndex(slots);
}

function recalculateSlots(slots: TimeBlock[], _fromIndex: number, toIndex: number): TimeBlock[] {
  if (slots.length <= 1) return slots;
  const copy = slots.map((s) => ({ ...s }));

  // Store original durations BEFORE any modifications
  const originalDurations = copy.map(
    (s) => (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM),
  );

  // First slot keeps its original start time (unchanged)
  // Initialize currentTotal to the first slot's END time
  let currentTotal = copy[0].endH * 60 + copy[0].endM;

  for (let i = 1; i < copy.length; i++) {
    const slotDuration = originalDurations[i]; // Each slot's OWN duration
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
}

export default function HomePage() {
  const [scheduleData, setScheduleData] = useState(getDefaultSchedule());
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState(-1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('soundEnabled') !== 'false'; } catch { return true; }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevActiveIndexRef = useRef<number>(-1);
  const prevEditModeRef = useRef(isEditMode);

  // Track previous edit mode
  useEffect(() => {
    prevEditModeRef.current = isEditMode;
  }, [isEditMode]);

  // Load schedule from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadSchedule();
    setScheduleData(stored);
  }, []);

  // Persist soundEnabled to localStorage
  useEffect(() => {
    try { localStorage.setItem('soundEnabled', String(soundEnabled)); } catch {}
  }, [soundEnabled]);

  // Calculate active slot when schedule changes
  useEffect(() => {
    if (!scheduleData || !scheduleData.slots) return;
    const index = calcActiveSlotIndex(scheduleData.slots);
    setActiveSlotIndex(index);
  }, [scheduleData.slots]);

  // Audio chime when active slot changes
  useEffect(() => {
    if (
      prevActiveIndexRef.current !== activeSlotIndex &&
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

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const now = ctx.currentTime;

        // Play 4-note ascending chime
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

        // Play bell tone after the chime
        const bellStart = now + notes.length * 0.15;
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.type = 'sine';
        bellOsc.frequency.value = 880; // A5 bell tone

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
    prevActiveIndexRef.current = activeSlotIndex;
  }, [activeSlotIndex, soundEnabled]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
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
      const updatedDividers = scheduleData.dividers.map((d) => ({
        ...d,
        index: Math.min(d.index, newSlots.length - 1),
      }));
      const newSchedule = {
        slots: newSlots,
        dividers: updatedDividers,
      };
      saveSchedule(newSchedule);
      setScheduleData(newSchedule);
      setDraggedIndex(overIndex);
    },
    [draggedIndex, scheduleData.slots, scheduleData.dividers],
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

  const handleReset = useCallback(() => {
    if (
      window.confirm('Reset schedule to defaults? This will erase all custom changes.')
    ) {
      const fresh = resetSchedule();
      setScheduleData(fresh);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const onScheduleChange = useCallback((data: ScheduleData) => {
    setScheduleData(data);
    saveSchedule(data);
  }, []);

  const onSlotDragOverDivider = useCallback(
    (renderListIndex: number, dividerIndex: number) => {
      if (draggedIndex === null) return;

      const targetSlotIndex = Math.min(dividerIndex, scheduleData.slots.length);

      const newSlots = recalculateSlots(scheduleData.slots, draggedIndex, targetSlotIndex);

      // Recalculate divider indices
      const newDividers = scheduleData.dividers.map((d) => {
        let newIndex = d.index;
        if (d.index > draggedIndex && d.index >= targetSlotIndex) {
          newIndex = d.index;
        } else if (d.index >= targetSlotIndex && d.index < draggedIndex) {
          newIndex = d.index + 1;
        } else if (d.index >= draggedIndex && d.index < targetSlotIndex) {
          newIndex = d.index;
        }
        return { ...d, index: newIndex };
      });

      setScheduleData({ slots: newSlots, dividers: newDividers });
      saveSchedule({ slots: newSlots, dividers: newDividers });
      setDraggedIndex(null);
    },
    [draggedIndex, scheduleData],
  );

  // Decorate effect - fires ONLY when transitioning from edit mode ON → OFF
  useEffect(() => {
    if (prevEditModeRef.current && !isEditMode) {
      // We just exited edit mode — trigger decorate
      prevEditModeRef.current = false; // Prevent re-triggering

      const decorateTasks = async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: 'Decorate all tasks with icons, descriptions, and themes.',
            }),
          });

          const data = await response.json();
          if (data.schedule && data.schedule.slots && data.schedule.slots.length > 0) {
            setScheduleData(data.schedule);
            saveSchedule(data.schedule);
          }
        } catch {
          // Silently fail
        }
      };
      decorateTasks();
    }
    prevEditModeRef.current = isEditMode; // Sync ref on every render
  }, [isEditMode]); // ONLY depends on isEditMode

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Header */}
      <header className="text-center py-4 px-2 sm:py-6 sm:px-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-1">
          📅 Time Block Schedule
        </h1>
        <p className="text-gray-400 text-sm">Your daily productive schedule</p>
      </header>

      {/* Toolbar */}
      <div className="flex justify-center mb-4">
        <Toolbar
          isEditMode={isEditMode}
          onToggleMode={toggleEditMode}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-20">
        {/* Schedule View */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-white/5 p-2 sm:p-4 mb-6">
          <ScheduleView
            slots={scheduleData.slots}
            dividers={scheduleData.dividers}
            activeSlotIndex={activeSlotIndex}
            isEditMode={isEditMode}
            onSlotDragStart={onSlotDragStart}
            onSlotDragOver={onSlotDragOver}
            onSlotDragEnd={onSlotDragEnd}
            onSlotDragOverDivider={onSlotDragOverDivider}
          />
        </div>

        {/* Chat Interface (only in edit mode) */}
        {isEditMode && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-white/5 p-2 sm:p-4 h-96">
            <ChatInterface isVisible={isEditMode} onScheduleChange={onScheduleChange} />
          </div>
        )}
      </main>

      {/* Status Bar */}
      <StatusBar
        activeSlotIndex={activeSlotIndex}
        slots={scheduleData.slots}
        isEditMode={isEditMode}
      />
    </div>
  );
}
