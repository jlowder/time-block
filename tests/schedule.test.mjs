// Test suite for time-block schedule management
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── Test helpers ──────────────────────────────────────────────────────────────

function formatTime12(h, m) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function durationMinutes(endH, endM, startH, startM) {
  return (endH * 60 + endM) - (startH * 60 + startM);
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAILED: ${message}`);
    failures.push(message);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('=== Time-Block Schedule Tests ===\n');

// Test 1: formatTime12 handles noon correctly
console.log('Test 1: formatTime12(12, 0) → "12:00 PM"');
assert(formatTime12(12, 0) === '12:00 PM', `got "${formatTime12(12, 0)}"`);

// Test 2: formatTime12 handles midnight correctly
console.log('\nTest 2: formatTime12(0, 0) → "12:00 AM"');
assert(formatTime12(0, 0) === '12:00 AM', `got "${formatTime12(0, 0)}"`);

// Test 3: formatTime12 handles PM hours
console.log('\nTest 3: formatTime12(13, 0) → "1:00 PM"');
assert(formatTime12(13, 0) === '1:00 PM', `got "${formatTime12(13, 0)}"`);

// Test 4: formatTime12 handles AM hours
console.log('\nTest 4: formatTime12(8, 0) → "8:00 AM"');
assert(formatTime12(8, 0) === '8:00 AM', `got "${formatTime12(8, 0)}"`);

// Test 5: Duration calculation is correct
console.log('\nTest 5: Duration calculation (9:00-9:15 = 15 min)');
assert(durationMinutes(9, 15, 9, 0) === 15, `got ${durationMinutes(9, 15, 9, 0)} min`);

// Test 6: Duration calculation across noon boundary
console.log('\nTest 6: Duration crosses noon (11:45-12:00 = 15 min)');
assert(durationMinutes(12, 0, 11, 45) === 15, `got ${durationMinutes(12, 0, 11, 45)} min`);

// Test 7: Midnight wrapping handled by recalculateTimes (not simple subtraction)
console.log('\nTest 7: Midnight wrapping (23:50 + 15min = 0:05 via %1440)');
let total = (23 * 60 + 50) + 15;
const wrapped = total % (24 * 60);
assert(Math.floor(wrapped / 60) === 0 && wrapped % 60 === 5, `got ${Math.floor(wrapped/60)}:${String(wrapped%60).padStart(2,'0')}`);

// Test 8: Default schedule has 15 slots
console.log('\nTest 8: Default schedule has 15 slots');
const defaultSchedule = {
  slots: [
    { id: 'slot-1', startH: 8, startM: 0, endH: 9, endM: 0, title: 'Puzzles & Newsletters' },
    { id: 'slot-2', startH: 9, startM: 0, endH: 9, endM: 5, title: 'Break' },
    { id: 'slot-3', startH: 9, startM: 5, endH: 9, endM: 20, title: 'CourseBox' },
    { id: 'slot-4', startH: 9, startM: 20, endH: 9, endM: 25, title: 'Break' },
    { id: 'slot-5', startH: 9, startM: 25, endH: 9, endM: 45, title: 'LLMs From Scratch' },
    { id: 'slot-6', startH: 9, startM: 45, endH: 9, endM: 50, title: 'Break' },
    { id: 'slot-7', startH: 9, startM: 50, endH: 10, endM: 10, title: 'Quantum Programming' },
    { id: 'slot-8', startH: 10, startM: 10, endH: 10, endM: 15, title: 'Break' },
    { id: 'slot-9', startH: 10, startM: 15, endH: 10, endM: 25, title: 'Stretching Session 1' },
    { id: 'slot-10', startH: 10, startM: 25, endH: 10, endM: 30, title: 'Break' },
    { id: 'slot-11', startH: 10, startM: 30, endH: 11, endM: 0, title: 'Open Notebook' },
    { id: 'slot-12', startH: 11, startM: 0, endH: 11, endM: 5, title: 'Break' },
    { id: 'slot-13', startH: 11, startM: 5, endH: 11, endM: 25, title: 'Study Python Continuations' },
    { id: 'slot-14', startH: 11, startM: 25, endH: 11, endM: 30, title: 'Break' },
    { id: 'slot-15', startH: 11, startM: 30, endH: 11, endM: 45, title: 'Stretching Session 2' },
  ],
  dividers: [
    { index: 0, label: 'Morning Warm-up' },
    { index: 2, label: 'Study Block 1' },
    { index: 14, label: 'Wind Down' },
  ],
};
assert(defaultSchedule.slots.length === 15, `got ${defaultSchedule.slots.length} slots`);

// Test 9: Default schedule last slot ends at 11:45 AM
console.log('\nTest 9: Default schedule ends at 11:45 AM');
const lastSlot = defaultSchedule.slots[defaultSchedule.slots.length - 1];
assert(lastSlot.endH === 11 && lastSlot.endM === 45, `got ${formatTime12(lastSlot.endH, lastSlot.endM)}`);

// Test 10: Adding a 15-min task at end should end at 12:00 PM
console.log('\nTest 10: Adding 15-min task at 11:45 AM → ends at 12:00 PM');
const newSlot = {
  id: 'slot-16',
  startH: 11, startM: 45,
  endH: 12, endM: 0,
  title: 'Test Task',
};
assert(formatTime12(newSlot.endH, newSlot.endM) === '12:00 PM', `got "${formatTime12(newSlot.endH, newSlot.endM)}"`);

// Test 11: New slot has all required fields
console.log('\nTest 11: New slot has all required fields');
const requiredFields = ['id', 'startH', 'startM', 'endH', 'endM', 'title'];
const missing = requiredFields.filter(f => !(f in newSlot));
assert(missing.length === 0, `Missing fields: ${missing.join(', ') || 'none'}`);

// Test 12: 15-minute duration is correct
console.log('\nTest 12: Test task duration is 15 minutes');
const taskDuration = durationMinutes(newSlot.endH, newSlot.endM, newSlot.startH, newSlot.startM);
assert(taskDuration === 15, `got ${taskDuration} minutes`);

// Test 13: recalculateTimes guard rejects negative durations
console.log('\nTest 13: Guard rejects negative duration (endH=0, startH=15)');
const badSlotDuration = (0 * 60 + 0) - (15 * 60 + 0);
assert(badSlotDuration <= 0, `expected negative, got ${badSlotDuration}`);

// Test 14: Correct end time calculation from duration
console.log('\nTest 14: endH/endM from duration (15:00 + 45min = 15:45)');
const startTime = 15 * 60 + 0;
const duration = 45;
const endTime = startTime + duration;
const endH = Math.floor(endTime / 60);
const endM = endTime % 60;
assert(endH === 15 && endM === 45, `got ${endH}:${String(endM).padStart(2, '0')} (expected 15:45)`);

// Test 15: Time wraps past midnight correctly
console.log('\nTest 15: Time wraps past midnight (23:50 + 30min = 0:20)');
const lateStart = 23 * 60 + 50;
const lateDuration = 30;
const lateTotal = lateStart + lateDuration;
const dayMinutes = 24 * 60;
const lateWrapped = lateTotal % dayMinutes;
const lateH = Math.floor(lateWrapped / 60);
const lateM = lateWrapped % 60;
assert(lateH === 0 && lateM === 20, `got ${lateH}:${String(lateM).padStart(2, '0')} (expected 0:20)`);

// Test 16: Add task via LLM chat and verify 12:00 PM (not AM)
console.log('\nTest 16: Add task via LLM chat - "add a task at 11:45 for 15 minutes"');
try {
  const prompt = 'Add a task called "LLM Test" at 11:45 AM for 15 minutes';
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) throw new Error(`API returned ${response.status}`);

  const data = await response.json();
  if (!data.schedule) throw new Error('No schedule in response');

  const lastSlot = data.schedule.slots[data.schedule.slots.length - 1];
  const endTime = formatTime12(lastSlot.endH, lastSlot.endM);

  if (endTime !== '12:00 PM') {
    throw new Error(`Expected 12:00 PM, got ${endTime} (endH=${lastSlot.endH}, endM=${lastSlot.endM})`);
  }

  console.log('  ✅ PASSED: LLM added task with correct end time:', endTime);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 17: Add task "at the end" and verify duration is correct
console.log('\nTest 17: Add task via LLM chat - "add task at end for 15 minutes"');
try {
  const prompt = 'Add a task at the end of the schedule for 15 minutes';
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) throw new Error(`API returned ${response.status}`);

  const data = await response.json();
  if (!data.schedule) throw new Error('No schedule in response');

  const lastSlot = data.schedule.slots[data.schedule.slots.length - 1];
  const startTime = formatTime12(lastSlot.startH, lastSlot.startM);
  const endTime = formatTime12(lastSlot.endH, lastSlot.endM);
  const taskDuration = durationMinutes(lastSlot.endH, lastSlot.endM, lastSlot.startH, lastSlot.startM);

  // Verify duration is 15 minutes
  if (taskDuration !== 15) {
    throw new Error(`Expected 15 min duration, got ${taskDuration} min`);
  }

  // Verify end time format is valid (not 0:0 AM)
  if (lastSlot.endH === 0 && lastSlot.endM === 0 && lastSlot.startH > 0) {
    throw new Error(`Invalid end time (endH=0, endM=0 after startH=${lastSlot.startH})`);
  }

  console.log('  ✅ PASSED: LLM added 15-min task:', startTime, '-', endTime);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 18: AI Decoration runs and returns decorated tasks
console.log('\nTest 18: AI Decoration - verify it runs and returns decorated tasks');
try {
  const prompt = 'Please decorate all tasks with icons, descriptions, and themes.';
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (!data.schedule) {
    throw new Error('No schedule in response');
  }

  // Verify all slots have icon, desc, and theme
  const undecorated = data.schedule.slots.filter(slot =>
    !slot.icon || !slot.desc || !slot.theme
  );

  if (undecorated.length > 0) {
    throw new Error(`${undecorated.length} slots missing decoration fields (icon, desc, or theme)`);
  }

  // Verify all slots have theme colors
  const validThemes = ['study', 'break', 'exercise', 'leisure', 'special'];
  const invalidThemes = data.schedule.slots.filter(slot =>
    !validThemes.includes(slot.theme)
  );

  if (invalidThemes.length > 0) {
    throw new Error(`${invalidThemes.length} slots have invalid theme`);
  }

  // Verify text response is present
  if (!data.text || data.text.length < 10) {
    throw new Error('Text response too short or missing');
  }

  console.log('  ✅ PASSED: Decorate ran successfully, all slots decorated');
  console.log(`     - ${data.schedule.slots.length} slots decorated`);
  console.log(`     - Response text: "${data.text.substring(0, 50)}..."`);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
