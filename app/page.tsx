'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadSchedule, saveSchedule, exportSchedule, getDefaultSchedule, playChime } from '@/lib/schedule';
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
      return i; // Slot is currently active
    }
  }

  // If current time is past all slots, return -1 (no active slot)
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

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevActiveIndexRef = useRef<number>(-1);
  const prevEditModeRef = useRef(isEditMode);

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

  const recalculateSlots = useCallback((slots: TimeBlock[], fromIndex: number, toIndex: number): TimeBlock[] => {
    if (fromIndex === toIndex) return slots;
    if (slots.length <= 1) return slots;

    const copy = slots.map((s) => ({ ...s }));

    // ACTUALLY REORDER: move slot from fromIndex to toIndex
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

  // Decorate effect - fires ONLY when transitioning from edit mode ON → OFF
  useEffect(() => {
    if (prevEditModeRef.current && !isEditMode) {
      // We just exited edit mode — trigger decorate
      prevEditModeRef.current = false; // Prevent re-triggering

      const decorateTasks = async () => {
        setIsDecorating(true);
        console.log('🎨 Starting decoration...');
        console.log('Current schedule has', scheduleData.slots.length, 'slots');
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: 'Decorate all tasks with icons, descriptions, and themes.',
              schedule: scheduleData,
            }),
          });

          console.log('API response status:', response.status);
          const data = await response.json();
          console.log('API response:', JSON.stringify(data).substring(0, 200));

          if (data.schedule && data.schedule.slots && data.schedule.slots.length > 0) {
            console.log('Updating schedule with', data.schedule.slots.length, 'slots');
            setScheduleData(data.schedule);
            saveSchedule(data.schedule);
          } else {
            console.error('No schedule in response');
          }
        } catch (err) {
          console.error('Decoration failed:', err);
        } finally {
          setIsDecorating(false);
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
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          playChime={playChime}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-20">
        {/* Schedule View */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-white/5 p-2 sm:p-4 mb-6">
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

        {/* Chat Interface (only in edit mode) */}
        {isEditMode && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-white/5 p-2 sm:p-4 h-96">
            <ChatInterface isVisible={isEditMode} scheduleData={scheduleData} onScheduleChange={onScheduleChange} />
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
