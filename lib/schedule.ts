import { ScheduleData, TimeBlock } from './types';

// ── Unique ID generation ──────────────────────────────────────────────────────

let idCounter = 0;
export function generateTaskId(): string {
  idCounter++;
  return `slot-${Date.now()}-${idCounter}`;
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dailySchedule';

// In-memory schedule for server-side tool execution (API route)
let serverSchedule: ScheduleData | null = null;

export function setServerSchedule(data: ScheduleData): void {
  serverSchedule = data;
}

export function resetServerSchedule(): void {
  serverSchedule = null;
}

export function getDefaultSchedule(): ScheduleData {
  return { slots: [] };
}

export function saveSchedule(data: ScheduleData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  // Always update server-side state for API route
  serverSchedule = JSON.parse(JSON.stringify(data));
}

export function loadSchedule(): ScheduleData {
  if (serverSchedule) return serverSchedule;
  try {
    if (typeof window === 'undefined') return { slots: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { slots: [] };
    return JSON.parse(raw) as ScheduleData;
  } catch {
    return { slots: [] };
  }
}

export function resetSchedule(): ScheduleData {
  const empty: ScheduleData = { slots: [] };
  saveSchedule(empty);
  return empty;
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Recalculate end times so slots flow continuously, preserving durations. */
export function recalculateTimes(slots: TimeBlock[]): TimeBlock[] {
  if (slots.length <= 1) return slots;
  const copy = slots.map((s) => ({ ...s }));

  // Store original durations BEFORE any modifications
  const originalDurations = copy.map(
    (s) => (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM),
  );

  // Guard: reject slots with zero or negative durations
  if (originalDurations.some((d) => d <= 0)) return slots;

  // First slot keeps its original start time (unchanged)
  // Initialize currentTotal to the first slot's END time
  let currentTotal = copy[0].endH * 60 + copy[0].endM;
  const dayMinutes = 24 * 60;

  for (let i = 1; i < copy.length; i++) {
    const slotDuration = originalDurations[i];
    const newStartTotal = currentTotal;
    const newEndTotal = newStartTotal + slotDuration;
    // Wrap times past midnight
    const startWrapped = newStartTotal % dayMinutes;
    const endWrapped = newEndTotal % dayMinutes;
    copy[i] = {
      ...copy[i],
      startH: Math.floor(startWrapped / 60),
      startM: startWrapped % 60,
      endH: Math.floor(endWrapped / 60),
      endM: endWrapped % 60,
    };
    currentTotal = endWrapped;
  }

  return copy;
}

function calculateDurationMinutes(startH: number, startM: number, endH: number, endM: number): number {
  return (endH * 60 + endM) - (startH * 60 + startM);
}

export function calculateDuration(startH: number, startM: number, endH: number, endM: number): string {
  const totalMin = calculateDurationMinutes(startH, startM, endH, endM);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`);
  return parts.join(' ');
}

export function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// ── Active slot detection ─────────────────────────────────────────────────────

export function getActiveSlotIndex(slots: TimeBlock[]): number {
  if (slots.length === 0) return -1;
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

export function getStatusBarMessage(activeIndex: number, slots: TimeBlock[]): string {
  if (activeIndex < 0 || activeIndex >= slots.length) {
    return 'No active block — enjoy your free time!';
  }
  const slot = slots[activeIndex];
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const slotEnd = slot.endH * 60 + slot.endM;
  const remaining = Math.max(0, slotEnd - currentMin);

  return `Now: ${slot.icon} ${slot.title} — ${remaining} min remaining`;
}

// ── Export / Import ───────────────────────────────────────────────────────────

export function exportSchedule(data: ScheduleData): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'daily-schedule.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importSchedule(json: string): ScheduleData {
  const parsed = JSON.parse(json) as ScheduleData;
  if (!Array.isArray(parsed.slots)) {
    throw new Error('Invalid schedule: missing slots array');
  }
  return parsed;
}

// ── Slot manipulation ─────────────────────────────────────────────────────────

export function moveSlot(slots: TimeBlock[], fromIndex: number, toIndex: number): TimeBlock[] {
  const copy = [...slots];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return recalculateTimes(copy);
}

// ── Audio chime ────────────────────────────────────────────────────────────────

/** Play a short ascending chime (C5-E5-G5-C6 + A5 bell). Safe to call anywhere. */
export function playChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.15;
      const end = start + 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, end);
      osc.start(start);
      osc.stop(end + 0.01);
    });

    // Bell tone
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
