import { ScheduleData, TimeBlock, SectionDivider } from './types';

// ── Default 15-slot schedule ──────────────────────────────────────────────────

const defaultSchedule: ScheduleData = {
  slots: [
    {
      id: 'slot-1',
      startH: 8,
      startM: 0,
      endH: 9,
      endM: 0,
      title: 'Puzzles & Newsletters',
      icon: '🧩',
      theme: 'leisure',
      desc: 'Solve brain teasers and catch up on curated newsletters.',
      badge: '1h',
      badgeClass: 'badge-special',
    },
    {
      id: 'slot-2',
      startH: 9,
      startM: 0,
      endH: 9,
      endM: 5,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-3',
      startH: 9,
      startM: 5,
      endH: 9,
      endM: 20,
      title: 'CourseBox - React and JSX',
      icon: '⚛️',
      theme: 'study',
      desc: 'Learn React fundamentals and JSX syntax through interactive lessons.',
      badge: '15min',
      badgeClass: 'badge-study',
    },
    {
      id: 'slot-4',
      startH: 9,
      startM: 20,
      endH: 9,
      endM: 25,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-5',
      startH: 9,
      startM: 25,
      endH: 9,
      endM: 45,
      title: 'LLMs From Scratch',
      icon: '🤖',
      theme: 'study',
      desc: 'Build and understand large language models from the ground up.',
      badge: '20min',
      badgeClass: 'badge-study',
    },
    {
      id: 'slot-6',
      startH: 9,
      startM: 45,
      endH: 9,
      endM: 50,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-7',
      startH: 9,
      startM: 50,
      endH: 10,
      endM: 10,
      title: 'Quantum Programming',
      icon: '🔮',
      theme: 'study',
      desc: 'Explore quantum computing concepts and write your first quantum algorithms.',
      badge: '20min',
      badgeClass: 'badge-study',
    },
    {
      id: 'slot-8',
      startH: 10,
      startM: 10,
      endH: 10,
      endM: 15,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-9',
      startH: 10,
      startM: 15,
      endH: 10,
      endM: 25,
      title: 'Stretching Session 1',
      icon: '🧘',
      theme: 'exercise',
      desc: 'Perform gentle stretches to loosen up your muscles.',
      badge: '10min',
      badgeClass: 'badge-exercise',
    },
    {
      id: 'slot-10',
      startH: 10,
      startM: 25,
      endH: 10,
      endM: 30,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-11',
      startH: 10,
      startM: 30,
      endH: 11,
      endM: 0,
      title: 'Open Notebook - process Distillation Papers',
      icon: '📓',
      theme: 'study',
      desc: 'Review and summarize key insights from recent distillation research papers.',
      badge: '30min',
      badgeClass: 'badge-study',
    },
    {
      id: 'slot-12',
      startH: 11,
      startM: 0,
      endH: 11,
      endM: 5,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-13',
      startH: 11,
      startM: 5,
      endH: 11,
      endM: 25,
      title: 'Study Python Continuations',
      icon: '🐍',
      theme: 'study',
      desc: 'Dive deeper into Python control flow and continuation patterns.',
      badge: '20min',
      badgeClass: 'badge-study',
    },
    {
      id: 'slot-14',
      startH: 11,
      startM: 25,
      endH: 11,
      endM: 30,
      title: 'Break',
      icon: '🌅',
      theme: 'break',
      desc: 'Step outside for fresh air and a brief mental break.',
      badge: '5min',
      badgeClass: 'badge-break',
    },
    {
      id: 'slot-15',
      startH: 11,
      startM: 30,
      endH: 11,
      endM: 45,
      title: 'Stretching Session 2',
      icon: '🤸',
      theme: 'exercise',
      desc: 'Complete a second round of targeted stretches to improve flexibility.',
      badge: '15min',
      badgeClass: 'badge-exercise',
    },
  ],
  dividers: [
    { index: 0, label: 'Morning Warm-up' },
    { index: 2, label: 'Study Block 1' },
    { index: 14, label: 'Wind Down' },
  ],
};

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
  return JSON.parse(JSON.stringify(defaultSchedule));
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
    if (typeof window === 'undefined') return getDefaultSchedule();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSchedule();
    return JSON.parse(raw) as ScheduleData;
  } catch {
    return getDefaultSchedule();
  }
}

export function resetSchedule(): ScheduleData {
  const fresh = getDefaultSchedule();
  saveSchedule(fresh);
  return fresh;
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

  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i];
    const slotStart = slot.startH * 60 + slot.startM;
    const slotEnd = slot.endH * 60 + slot.endM;
    if (currentMin >= slotStart) return i;
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

export function recalculateDividerIndices(dividers: SectionDivider[], slots: TimeBlock[]): SectionDivider[] {
  return dividers.map((d) => ({
    ...d,
    index: Math.min(d.index, slots.length - 1),
  }));
}
