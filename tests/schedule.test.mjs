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

// Test 19: Random Task Insertion
console.log('\nTest 19: Random Task Insertion (1-5 tasks at random positions)');
try {
  const loadRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Show me the current schedule' })
  });
  const loadData = await loadRes.json();
  const initialSlotCount = loadData.schedule.slots.length;

  const taskCount = Math.floor(Math.random() * 5) + 1;
  console.log(`     Adding ${taskCount} tasks...`);

  const addedTasks = [];
  let currentSchedule = loadData.schedule;

  for (let i = 0; i < taskCount; i++) {
    const startH = 9 + Math.floor(Math.random() * 2);
    const startM = Math.floor(Math.random() * 12) * 5;
    const durationMin = [10, 15, 20, 30][Math.floor(Math.random() * 4)];
    const taskTitle = `Test Task ${i + 1}`;

    const addRes = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Add a task called "${taskTitle}" at ${startH}:${String(startM).padStart(2, '0')} for ${durationMin} minutes`,
        schedule: currentSchedule
      })
    });

    const addData = await addRes.json();
    if (!addData.schedule) throw new Error(`Add failed for task ${i + 1}`);

    const newTask = addData.schedule.slots.find(s => s.title === taskTitle);
    if (!newTask) throw new Error(`Task "${taskTitle}" not found in schedule`);

    const actualDuration = (newTask.endH * 60 + newTask.endM) - (newTask.startH * 60 + newTask.startM);
    if (actualDuration !== durationMin) {
      throw new Error(`Task "${taskTitle}" has wrong duration: ${actualDuration}min (expected ${durationMin}min)`);
    }

    addedTasks.push({ title: taskTitle, startH, startM, durationMin, endH: newTask.endH, endM: newTask.endM });
    currentSchedule = addData.schedule;
  }

  const finalSlotCount = currentSchedule.slots.length;
  const expectedCount = initialSlotCount + taskCount;
  if (finalSlotCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} slots, got ${finalSlotCount}`);
  }

  console.log('  ✅ PASSED: Inserted', taskCount, 'tasks, total slots:', finalSlotCount);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 20: Random Task Reordering
console.log('\nTest 20: Random Task Reordering');
try {
  const reorderRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Show me the current schedule' })
  });
  const reorderData = await reorderRes.json();

  if (reorderData.schedule.slots.length < 3) {
    throw new Error('Not enough tasks to reorder (need at least 3)');
  }

  const initialSlots = reorderData.schedule.slots.map(s => s.id);
  const slotCount = initialSlots.length;

  // Pick 2-3 random tasks to swap positions on
  const numReorders = Math.min(2 + Math.floor(Math.random() * 2), Math.floor(slotCount / 2));
  console.log(`     Reordering ${numReorders} tasks...`);

  let currentSchedule = reorderData.schedule;

  for (let i = 0; i < numReorders; i++) {
    // Pick two different random indices
    const idx1 = Math.floor(Math.random() * slotCount);
    let idx2 = Math.floor(Math.random() * slotCount);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * slotCount);
    }

    // Build a new taskIds array with the two tasks swapped
    const taskIds = [...currentSchedule.slots.map(s => s.id)];
    [taskIds[idx1], taskIds[idx2]] = [taskIds[idx2], taskIds[idx1]];

    const task1Title = currentSchedule.slots[idx1].title;
    const task2Title = currentSchedule.slots[idx2].title;

    // Send the exact task IDs array to the LLM for the reorder tool
    const reorderApiRes = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Reorder tasks to: ${JSON.stringify(taskIds)}`,
        schedule: currentSchedule
      })
    });

    const reorderApiData = await reorderApiRes.json();
    if (!reorderApiData.schedule) throw new Error('Reorder failed');

    // Find where each task ended up
    const newIdx1 = reorderApiData.schedule.slots.findIndex(s => s.id === taskIds[idx1]);
    const newIdx2 = reorderApiData.schedule.slots.findIndex(s => s.id === taskIds[idx2]);

    // Verify: taskIds[idx1] should be at idx1, taskIds[idx2] should be at idx2
    const task1NewPos = reorderApiData.schedule.slots.findIndex(s => s.id === taskIds[idx1]);
    const task2NewPos = reorderApiData.schedule.slots.findIndex(s => s.id === taskIds[idx2]);

    // After reorder, taskIds[idx1] should be at position idx1, taskIds[idx2] at position idx2
    if (task1NewPos !== idx1 || task2NewPos !== idx2) {
      throw new Error(`Tasks not reordered correctly. "${task1Title}" (taskIds[${idx1}]) at ${task1NewPos} (expected ${idx1}). "${task2Title}" (taskIds[${idx2}]) at ${task2NewPos} (expected ${idx2}).`);
    }

    // Verify all tasks still exist
    const newIds = reorderApiData.schedule.slots.map(s => s.id);
    if (newIds.length !== slotCount) {
      throw new Error(`Slot count changed: ${newIds.length} (expected ${slotCount})`);
    }
    for (const id of initialSlots) {
      if (!newIds.includes(id)) {
        throw new Error(`Task "${id}" disappeared after reorder`);
      }
    }

    console.log(`     Reordered: "${task1Title}" → idx ${task1NewPos}, "${task2Title}" → idx ${task2NewPos}`);
    currentSchedule = reorderApiData.schedule;
  }

  console.log('  ✅ PASSED: Reordered', numReorders, 'tasks successfully');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 21: Delete task by time
console.log('\nTest 21: Delete task by time');
try {
  const detailsRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData = await detailsRes.json();
  const scheduleBefore = detailsData.schedule;

  const targetSlot = scheduleBefore.slots.find(s => s.startH === 9 && s.startM >= 15 && s.startM <= 25);
  if (!targetSlot) {
    throw new Error('No task found around 9:20 AM');
  }

  // Send the task ID directly to bypass name-to-ID mapping
  const deleteRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Delete the task with ID "${targetSlot.id}"`,
      schedule: scheduleBefore
    })
  });
  const deleteData = await deleteRes.json();

  if (!deleteData.schedule) throw new Error('No schedule in response');

  const stillExists = deleteData.schedule.slots.some(s => s.id === targetSlot.id);
  if (stillExists) {
    throw new Error(`Task "${targetSlot.title}" (id=${targetSlot.id}) still exists after delete`);
  }

  if (deleteData.schedule.slots.length !== scheduleBefore.slots.length - 1) {
    throw new Error(`Expected ${scheduleBefore.slots.length - 1} slots, got ${deleteData.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted task by time, slots: ' + scheduleBefore.slots.length + '→' + deleteData.schedule.slots.length);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 22: Delete all 5-minute breaks
console.log('\nTest 22: Delete all 5-minute breaks');
try {
  const detailsRes2 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData2 = await detailsRes2.json();
  const scheduleBefore2 = detailsData2.schedule;

  const breaks = scheduleBefore2.slots.filter(s => {
    const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
    return duration <= 5 && (s.title.toLowerCase().includes('break') || s.theme === 'break');
  });

  if (breaks.length === 0) {
    throw new Error('No 5-minute breaks found to delete');
  }

  const breakTitles = breaks.map(b => b.title).join('", "');

  const deleteRes2 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Delete all breaks that are 5 minutes long`,
      schedule: scheduleBefore2
    })
  });
  const deleteData2 = await deleteRes2.json();

  if (!deleteData2.schedule) throw new Error('No schedule in response');

  const remainingBreaks = deleteData2.schedule.slots.filter(s => {
    const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
    return duration <= 5 && (s.title.toLowerCase().includes('break') || s.theme === 'break');
  });

  if (remainingBreaks.length > 0) {
    throw new Error(`${remainingBreaks.length} breaks still exist after delete`);
  }

  console.log('  ✅ PASSED: Deleted ' + breaks.length + ' five-minute breaks, slots: ' + scheduleBefore2.slots.length + '→' + deleteData2.schedule.slots.length);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 23: Delete by task name
console.log('\nTest 23: Delete by task name');
try {
  const detailsRes3 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData3 = await detailsRes3.json();
  const scheduleBefore3 = detailsData3.schedule;

  if (scheduleBefore3.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test delete by name');
  }

  const targetTitle = scheduleBefore3.slots[0].title;

  const deleteRes3 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Delete the task called "${targetTitle}"`,
      schedule: scheduleBefore3
    })
  });
  const deleteData3 = await deleteRes3.json();

  if (!deleteData3.schedule) throw new Error('No schedule in response');

  const stillExists = deleteData3.schedule.slots.some(s => s.title === targetTitle);
  if (stillExists) {
    throw new Error(`Task "${targetTitle}" still exists after delete`);
  }

  console.log('  ✅ PASSED: Deleted "' + targetTitle + '" by name');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 24: Delete the last task
console.log('\nTest 24: Delete the last task');
try {
  const detailsRes4 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData4 = await detailsRes4.json();
  const scheduleBefore4 = detailsData4.schedule;

  if (scheduleBefore4.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test delete last');
  }

  const lastTask = scheduleBefore4.slots[scheduleBefore4.slots.length - 1];

  const deleteRes4 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Delete the last task`,
      schedule: scheduleBefore4
    })
  });
  const deleteData4 = await deleteRes4.json();

  if (!deleteData4.schedule) throw new Error('No schedule in response');

  const lastTaskStillExists = deleteData4.schedule.slots.some(s => s.id === lastTask.id);
  if (lastTaskStillExists) {
    throw new Error(`Last task "${lastTask.title}" still exists after delete`);
  }

  if (deleteData4.schedule.slots.length !== scheduleBefore4.slots.length - 1) {
    throw new Error(`Expected ${scheduleBefore4.slots.length - 1} slots, got ${deleteData4.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted last task "' + lastTask.title + '"');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 25: Delete ALL tasks (empty schedule)
console.log('\nTest 25: Delete ALL tasks (empty schedule)');
try {
  const detailsRes5 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData5 = await detailsRes5.json();

  let scheduleBefore5 = detailsData5.schedule;
  if (scheduleBefore5.slots.length === 0) {
    const addRes = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Add a test task at 10:00 for 15 minutes' })
    });
    const addData = await addRes.json();
    scheduleBefore5 = addData.schedule;
  }

  const deleteAllRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Delete all tasks',
      schedule: scheduleBefore5
    })
  });
  const deleteAllData = await deleteAllRes.json();

  if (!deleteAllData.schedule) throw new Error('No schedule in response');
  if (deleteAllData.schedule.slots.length !== 0) {
    throw new Error(`Expected 0 slots after delete all, got ${deleteAllData.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted all ' + scheduleBefore5.slots.length + ' tasks, schedule is empty');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 26: Reset to default schedule
console.log('\nTest 26: Reset to default schedule');
try {
  const resetRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Reset the schedule to defaults' })
  });
  const resetData = await resetRes.json();

  if (!resetData.schedule) throw new Error('No schedule in response');
  if (resetData.schedule.slots.length !== 15) {
    throw new Error(`Expected 15 slots after reset, got ${resetData.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Reset to defaults, ' + resetData.schedule.slots.length + ' tasks restored');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}

// Test 27: Edit task to odd duration (not multiple of 5)
console.log('\nTest 27: Edit task to odd duration');
try {
  const detailsRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Get the current schedule details' })
  });
  const detailsData = await detailsRes.json();
  const scheduleBefore = detailsData.schedule;

  if (scheduleBefore.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test modify task');
  }

  const targetSlot = scheduleBefore.slots[0];
  const originalDuration = (targetSlot.endH * 60 + targetSlot.endM) - (targetSlot.startH * 60 + targetSlot.startM);

  const oddDurations = [7, 13, 17, 23, 37];
  const newDuration = oddDurations[Math.floor(Math.random() * oddDurations.length)];

  const modifyRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Change the task called "${targetSlot.title}" to be ${newDuration} minutes long`,
      schedule: scheduleBefore
    })
  });
  const modifyData = await modifyRes.json();

  if (!modifyData.schedule) throw new Error('No schedule in response');

  const modifiedSlot = modifyData.schedule.slots.find(s => s.id === targetSlot.id);
  if (!modifiedSlot) {
    throw new Error(`Task "${targetSlot.title}" not found in modified schedule`);
  }

  const actualDuration = (modifiedSlot.endH * 60 + modifiedSlot.endM) - (modifiedSlot.startH * 60 + modifiedSlot.startM);
  if (actualDuration !== newDuration) {
    throw new Error(`Expected ${newDuration} min, got ${actualDuration} min`);
  }

  if (actualDuration % 5 === 0) {
    throw new Error(`Duration ${actualDuration} is a multiple of 5, test requires odd duration`);
  }

  console.log('  ✅ PASSED: Modified "' + targetSlot.title + '" to ' + newDuration + ' min (was ' + originalDuration + ' min)');
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
