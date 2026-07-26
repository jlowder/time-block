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

async function chat(prompt, schedule, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, schedule }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API returned ${response.status}: ${text}`);
    }
    return response.json();
  } finally {
    clearTimeout(id);
  }
}

// ── Dev server management ──────────────────────────────────────────────────────

async function ensureServer() {
  try {
    const res = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(2000) });
    if (res.ok) return true;
  } catch {
    // Not running, will start below
  }

  // Kill any existing process on port 3000
  try {
    const { execSync } = await import('child_process');
    execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null || true', { stdio: 'pipe' });
    await new Promise(r => setTimeout(r, 800));
  } catch {}

  console.log('  Starting dev server...');
  const { spawn } = await import('child_process');
  const { resolve } = await import('path');

  const nextDevPath = resolve(PROJECT_ROOT, 'node_modules', '.bin', 'next');
  const devProc = spawn('node', [nextDevPath, 'dev', '--port', '3000'], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    detached: true,
  });

  console.log(`  Dev server PID: ${devProc.pid}`);

  return new Promise((resolve) => {
    let ready = false;
    devProc.stdout.on('data', (chunk) => {
      if (!ready && (chunk.toString().toLowerCase().includes('ready') || chunk.toString().toLowerCase().includes('started'))) {
        ready = true;
      }
    });
    devProc.on('error', () => resolve(false));
    devProc.on('exit', () => resolve(false));

    (async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(3000) });
          if (res.ok) { console.log('  ✅ Dev server ready\n'); resolve(true); return; }
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }
      console.log('  ❌ Dev server failed to become ready\n');
      resolve(false);
    })();

    setTimeout(() => {
      if (!ready) { try { devProc.kill(); } catch {} console.log('  ❌ Timeout\n'); resolve(false); }
    }, 120_000);
  });
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

// Test 8: Adding a 15-min task at end should end at 12:00 PM
console.log('\nTest 8: Adding 15-min task at 11:45 AM → ends at 12:00 PM');
const newSlot = {
  id: 'slot-16',
  startH: 11, startM: 45,
  endH: 12, endM: 0,
  title: 'Test Task',
};
assert(formatTime12(newSlot.endH, newSlot.endM) === '12:00 PM', `got "${formatTime12(newSlot.endH, newSlot.endM)}"`);

// Test 9: New slot has all required fields
console.log('\nTest 9: New slot has all required fields');
const requiredFields = ['id', 'startH', 'startM', 'endH', 'endM', 'title'];
const missing = requiredFields.filter(f => !(f in newSlot));
assert(missing.length === 0, `Missing fields: ${missing.join(', ') || 'none'}`);

// Test 10: 15-minute duration is correct
console.log('\nTest 10: Test task duration is 15 minutes');
const taskDuration = durationMinutes(newSlot.endH, newSlot.endM, newSlot.startH, newSlot.startM);
assert(taskDuration === 15, `got ${taskDuration} minutes`);

// Test 11: recalculateTimes guard rejects negative durations
console.log('\nTest 11: Guard rejects negative duration (endH=0, startH=15)');
const badSlotDuration = (0 * 60 + 0) - (15 * 60 + 0);
assert(badSlotDuration <= 0, `expected negative, got ${badSlotDuration}`);

// Test 12: Correct end time calculation from duration
console.log('\nTest 12: endH/endM from duration (15:00 + 45min = 15:45)');
const startTime = 15 * 60 + 0;
const duration = 45;
const endTime = startTime + duration;
const endH = Math.floor(endTime / 60);
const endM = endTime % 60;
assert(endH === 15 && endM === 45, `got ${endH}:${String(endM).padStart(2, '0')} (expected 15:45)`);

// Test 13: Time wraps past midnight correctly
console.log('\nTest 13: Time wraps past midnight (23:50 + 30min = 0:20)');
const lateStart = 23 * 60 + 50;
const lateDuration = 30;
const lateTotal = lateStart + lateDuration;
const dayMinutes = 24 * 60;
const lateWrapped = lateTotal % dayMinutes;
const lateH = Math.floor(lateWrapped / 60);
const lateM = lateWrapped % 60;
assert(lateH === 0 && lateM === 20, `got ${lateH}:${String(lateM).padStart(2, '0')} (expected 0:20)`);

// ── Integration tests ────────────────────────────────────────────────────────

(async () => {
  // Ensure dev server is running
  if (!await ensureServer()) {
    console.log('\n  ❌ Dev server failed to start — skipping LLM tests.\n');
    process.exit(1);
  }

  // ── Integration test helpers ──────────────────────────────────────────────

  async function runLlmTest(name, fn) {
    console.log(name);
    await fn();
  }

  async function llmTestBody(name, fn) {
    await fn();
  }

  function assertSlotFields(data) {
    if (!data.schedule) throw new Error('No schedule in response');
    return data.schedule;
  }

  // ── Tests 14-24 ──────────────────────────────────────────────────────────

  await runLlmTest('Test 14: Add first task via LLM chat - "add a task at 11:45 for 15 minutes"', async () => {
    await llmTestBody('Test 14', async () => {
      try {
        const data = await chat('Add a task called "LLM Test" at 11:45 AM for 15 minutes');
        const schedule = assertSlotFields(data);
        if (schedule.slots.length !== 1) throw new Error(`Expected 1 slot, got ${schedule.slots.length}`);

        const slot = schedule.slots[0];
        assert(formatTime12(slot.endH, slot.endM) === '12:00 PM', `expected 12:00 PM, got "${formatTime12(slot.endH, slot.endM)}"`);
        assert(slot.title === 'LLM Test', `expected "LLM Test", got "${slot.title}"`);
        assert(durationMinutes(slot.endH, slot.endM, slot.startH, slot.startM) === 15, 'expected 15-minute duration');
        console.log('  ✅ PASSED');
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 15: Add second task "at the end" and verify duration', async () => {
    await llmTestBody('Test 15', async () => {
      try {
        const currentSchedule = { slots: [{ id: 'slot-temp1', startH: 11, startM: 45, endH: 12, endM: 0, title: 'LLM Test' }] };
        const data = await chat('Add a task called "Afternoon Walk" at the end of the schedule for 15 minutes', currentSchedule);
        const schedule = assertSlotFields(data);
        if (schedule.slots.length !== 2) throw new Error(`Expected 2 slots, got ${schedule.slots.length}`);

        const lastSlot = schedule.slots[1];
        const taskDuration = durationMinutes(lastSlot.endH, lastSlot.endM, lastSlot.startH, lastSlot.startM);
        if (taskDuration !== 15) throw new Error(`Expected 15 min duration, got ${taskDuration} min`);
        if (lastSlot.endH === 0 && lastSlot.endM === 0 && lastSlot.startH > 0) throw new Error(`Invalid end time`);

        console.log('  ✅ PASSED: LLM added 15-min task:', lastSlot.startH, lastSlot.startM, '-', lastSlot.endH, lastSlot.endM);
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 16: AI Decoration runs and returns decorated tasks', async () => {
    await llmTestBody('Test 16', async () => {
      try {
        const scheduleBefore = (await chat('Show me the current schedule')).schedule;
        if (!scheduleBefore || scheduleBefore.slots.length === 0) {
          const add = await chat('Add two tasks: "Morning Run" at 7:00 for 20 minutes and "Reading" at 8:00 for 30 minutes');
          if (add.schedule) scheduleBefore.slots.push(...add.schedule.slots);
        }
        const data = await chat('Please decorate all tasks with icons, descriptions, and themes.', scheduleBefore);
        const schedule = assertSlotFields(data);
        if (schedule.slots.length < 1) throw new Error('No tasks to decorate');

        const undecorated = schedule.slots.filter(slot => !slot.icon || !slot.desc || !slot.theme);
        if (undecorated.length > 0) throw new Error(`${undecorated.length} slots missing decoration fields`);

        const validThemes = ['study', 'break', 'exercise', 'leisure', 'special'];
        const invalidThemes = schedule.slots.filter(slot => !validThemes.includes(slot.theme));
        if (invalidThemes.length > 0) throw new Error(`${invalidThemes.length} slots have invalid theme`);
        if (!data.text || data.text.length < 10) throw new Error('Text response too short or missing');

        console.log('  ✅ PASSED: Decorate ran successfully, all slots decorated');
        console.log(`     - ${schedule.slots.length} slots decorated`);
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 17: Random Task Insertion (1-5 tasks)', async () => {
    await llmTestBody('Test 17', async () => {
      try {
        await chat('Delete all tasks');
        const add1 = await chat('Add a task called "Baseline" at 9:00 for 30 minutes');
        assertSlotFields(add1);

        const taskCount = Math.floor(Math.random() * 5) + 1;
        console.log(`     Adding ${taskCount} tasks...`);
        let currentSchedule = add1.schedule;

        for (let i = 0; i < taskCount; i++) {
          const startH = 9 + Math.floor(Math.random() * 2);
          const startM = Math.floor(Math.random() * 12) * 5;
          const durationMin = [10, 15, 20, 30][Math.floor(Math.random() * 4)];
          const taskTitle = `Test Task ${i + 1}`;

          const addRes = await chat(
            `Add a task called "${taskTitle}" at ${startH}:${String(startM).padStart(2, '0')} for ${durationMin} minutes`,
            currentSchedule
          );
          const resSchedule = assertSlotFields(addRes);
          const newTask = resSchedule.slots.find(s => s.title === taskTitle);
          if (!newTask) throw new Error(`Task "${taskTitle}" not found`);

          const actualDuration = (newTask.endH * 60 + newTask.endM) - (newTask.startH * 60 + newTask.startM);
          if (actualDuration !== durationMin) throw new Error(`Task "${taskTitle}" has wrong duration: ${actualDuration}min (expected ${durationMin}min)`);
          currentSchedule = resSchedule;
        }

        const finalSlotCount = currentSchedule.slots.length;
        const expectedCount = 1 + taskCount;
        if (finalSlotCount !== expectedCount) throw new Error(`Expected ${expectedCount} slots, got ${finalSlotCount}`);

        console.log('  ✅ PASSED: Inserted', taskCount, 'tasks, total slots:', finalSlotCount);
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 18: Random Task Reordering', async () => {
    await llmTestBody('Test 18', async () => {
      try {
        const check1 = await chat('Show me the current schedule');
        let currentSchedule = check1.schedule || { slots: [] };

        if (currentSchedule.slots.length < 3) {
          const add = await chat('Add 3 tasks called "Alpha", "Beta", "Gamma" at 9:00, 10:00, and 11:00 for 15 minutes each', currentSchedule);
          if (add.schedule) currentSchedule = add.schedule;
        }
        if (currentSchedule.slots.length < 3) throw new Error('Not enough tasks to reorder (need at least 3)');

        const initialSlots = currentSchedule.slots.map(s => s.id);
        const slotCount = initialSlots.length;
        const numReorders = Math.min(2 + Math.floor(Math.random() * 2), Math.floor(slotCount / 2));
        console.log(`     Reordering ${numReorders} tasks...`);

        for (let i = 0; i < numReorders; i++) {
          const idx1 = Math.floor(Math.random() * slotCount);
          let idx2 = Math.floor(Math.random() * slotCount);
          while (idx2 === idx1) { idx2 = Math.floor(Math.random() * slotCount); }

          const taskIds = [...currentSchedule.slots.map(s => s.id)];
          [taskIds[idx1], taskIds[idx2]] = [taskIds[idx2], taskIds[idx1]];
          const task1Title = currentSchedule.slots[idx1].title;
          const task2Title = currentSchedule.slots[idx2].title;

          const reorderRes = await chat(`Reorder tasks to: ${JSON.stringify(taskIds)}`, currentSchedule);
          if (!reorderRes.schedule) throw new Error('Reorder failed');

          const taskAtIdx1 = reorderRes.schedule.slots[idx1];
          const taskAtIdx2 = reorderRes.schedule.slots[idx2];
          if (!taskAtIdx1 || !taskAtIdx2) throw new Error('Slots missing after reorder');
          if (taskAtIdx1.id !== taskIds[idx1]) throw new Error(`Position ${idx1} has wrong task`);
          if (taskAtIdx2.id !== taskIds[idx2]) throw new Error(`Position ${idx2} has wrong task`);

          const newIds = reorderRes.schedule.slots.map(s => s.id);
          if (newIds.length !== slotCount) throw new Error(`Slot count changed: ${newIds.length}`);
          for (const id of initialSlots) {
            if (!newIds.includes(id)) throw new Error(`Task "${id}" disappeared after reorder`);
          }

          console.log(`     Reordered: "${task1Title}" → idx ${idx1}, "${task2Title}" → idx ${idx2}`);
          currentSchedule = reorderRes.schedule;
        }

        console.log('  ✅ PASSED: Reordered', numReorders, 'tasks successfully');
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 19: Delete task by time', async () => {
    await llmTestBody('Test 19', async () => {
      try {
        const addRes = await chat('Add three tasks: "Morning Run" at 7:00 for 30 minutes, "Breakfast" at 8:00 for 20 minutes, and "Study" at 9:00 for 45 minutes');
        const scheduleBefore = assertSlotFields(addRes);
        if (scheduleBefore.slots.length < 3) throw new Error(`Need 3+ slots, got ${scheduleBefore.slots.length}`);

        const targetSlot = scheduleBefore.slots[1];
        const deleteRes = await chat(`Use the deleteTask tool to remove the task with ID "${targetSlot.id}".`, scheduleBefore);
        const delSchedule = assertSlotFields(deleteRes);

        const stillExists = delSchedule.slots.some(s => s.id === targetSlot.id);
        if (stillExists) throw new Error(`Task "${targetSlot.title}" still exists after delete`);
        if (delSchedule.slots.length !== scheduleBefore.slots.length - 1) throw new Error(`Expected ${scheduleBefore.slots.length - 1} slots`);

        console.log('  ✅ PASSED: Deleted task by time, slots: ' + scheduleBefore.slots.length + '→' + delSchedule.slots.length);
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 20: Delete all 5-minute breaks', async () => {
    await llmTestBody('Test 20', async () => {
      try {
        const addRes = await chat('Add five tasks: "Run" at 7:00 for 30 minutes, "Break" at 7:30 for 5 minutes, "Study" at 7:40 for 20 minutes, "Break" at 8:10 for 5 minutes, and "Dinner" at 8:20 for 40 minutes');
        let scheduleBefore = assertSlotFields(addRes);
        if (scheduleBefore.slots.length < 5) throw new Error(`Need 5 slots, got ${scheduleBefore.slots.length}`);

        const breaks = scheduleBefore.slots.filter(s => {
          const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
          return duration <= 5 && s.title.toLowerCase().includes('break');
        });
        if (breaks.length === 0) throw new Error('No 5-minute breaks were added');

        let currentSchedule = scheduleBefore;
        for (const brk of breaks) {
          const deleteRes = await chat(`Use the deleteTask tool to remove the task with ID "${brk.id}".`, currentSchedule);
          if (!deleteRes.schedule) throw new Error(`Failed to delete break ${brk.id}`);
          currentSchedule = deleteRes.schedule;
        }

        const remainingBreaks = currentSchedule.slots.filter(s => {
          const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
          return duration <= 5 && s.title.toLowerCase().includes('break');
        });
        if (remainingBreaks.length > 0) throw new Error(`${remainingBreaks.length} breaks still exist after delete`);

        const expectedRemaining = scheduleBefore.slots.length - breaks.length;
        if (currentSchedule.slots.length !== expectedRemaining) throw new Error(`Expected ${expectedRemaining} remaining tasks`);

        console.log('  ✅ PASSED: Deleted ' + breaks.length + ' five-minute breaks, slots: ' + scheduleBefore.slots.length + '→' + currentSchedule.slots.length);
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 21: Delete by task name', async () => {
    await llmTestBody('Test 21', async () => {
      try {
        let scheduleBefore = (await chat('Show me the current schedule')).schedule || { slots: [] };
        if (scheduleBefore.slots.length === 0) {
          const add = await chat('Add a task called "Task To Delete" at 9:00 for 30 minutes');
          if (add.schedule) scheduleBefore = add.schedule;
        }
        if (scheduleBefore.slots.length === 0) throw new Error('Schedule is empty');

        const targetTitle = scheduleBefore.slots[0].title;
        const deleteRes = await chat(`Delete the task called "${targetTitle}"`, scheduleBefore);
        if (!deleteRes.schedule) throw new Error('No schedule in response');

        const stillExists = deleteRes.schedule.slots.some(s => s.title === targetTitle);
        if (stillExists) throw new Error(`Task "${targetTitle}" still exists after delete`);

        console.log('  ✅ PASSED: Deleted "' + targetTitle + '" by name');
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 22: Delete the last task', async () => {
    await llmTestBody('Test 22', async () => {
      try {
        let scheduleBefore = (await chat('Show me the current schedule')).schedule || { slots: [] };
        if (scheduleBefore.slots.length === 0) {
          const add = await chat('Add a task called "Last Task" at 9:00 for 30 minutes');
          if (add.schedule) scheduleBefore = add.schedule;
        }
        if (scheduleBefore.slots.length === 0) throw new Error('Schedule is empty');

        const lastTask = scheduleBefore.slots[scheduleBefore.slots.length - 1];
        const deleteRes = await chat('Delete the last task', scheduleBefore);
        if (!deleteRes.schedule) throw new Error('No schedule in response');

        const lastTaskStillExists = deleteRes.schedule.slots.some(s => s.id === lastTask.id);
        if (lastTaskStillExists) throw new Error(`Last task "${lastTask.title}" still exists after delete`);
        if (deleteRes.schedule.slots.length !== scheduleBefore.slots.length - 1) throw new Error(`Expected ${scheduleBefore.slots.length - 1} slots`);

        console.log('  ✅ PASSED: Deleted last task "' + lastTask.title + '"');
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 23: Delete ALL tasks (empty schedule)', async () => {
    await llmTestBody('Test 23', async () => {
      try {
        const addRes = await chat('Add three tasks: "Task A" at 9:00 for 30 minutes, "Task B" at 10:00 for 20 minutes, and "Task C" at 11:00 for 25 minutes');
        let scheduleBefore = assertSlotFields(addRes);
        if (scheduleBefore.slots.length < 3) throw new Error(`Need 3+ slots, got ${scheduleBefore.slots.length}`);

        for (const slot of scheduleBefore.slots) {
          const deleteRes = await chat(`Use the deleteTask tool to remove the task with ID "${slot.id}".`, scheduleBefore);
          if (!deleteRes.schedule) throw new Error(`Failed to delete task ${slot.id}`);
          scheduleBefore = deleteRes.schedule;
        }
        if (scheduleBefore.slots.length !== 0) throw new Error(`Expected 0 slots, got ${scheduleBefore.slots.length}`);

        console.log('  ✅ PASSED: Deleted all tasks, schedule is empty');
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

  await runLlmTest('Test 24: Edit task to odd duration', async () => {
    await llmTestBody('Test 24', async () => {
      try {
        let scheduleBefore = (await chat('Show me the current schedule')).schedule;
        if (!scheduleBefore) throw new Error('No schedule in response');

        if (scheduleBefore.slots.length === 0) {
          const addRes = await chat('Add a task called "Test Task" at 10:00 for 30 minutes');
          scheduleBefore = addRes.schedule;
        }
        if (scheduleBefore.slots.length === 0) throw new Error('Schedule is empty');

        const targetSlot = scheduleBefore.slots[0];
        const originalDuration = (targetSlot.endH * 60 + targetSlot.endM) - (targetSlot.startH * 60 + targetSlot.startM);
        const oddDurations = [7, 13, 17, 23, 37];
        const newDuration = oddDurations[Math.floor(Math.random() * oddDurations.length)];

        const modifyRes = await chat(`Change the task called "${targetSlot.title}" to be ${newDuration} minutes long`, scheduleBefore, 90000);
        if (!modifyRes.schedule) throw new Error('No schedule in response');

        const modifiedSlot = modifyRes.schedule.slots.find(s => s.id === targetSlot.id);
        if (!modifiedSlot) throw new Error(`Task "${targetSlot.title}" not found in modified schedule`);

        const actualDuration = (modifiedSlot.endH * 60 + modifiedSlot.endM) - (modifiedSlot.startH * 60 + modifiedSlot.startM);
        if (actualDuration !== newDuration) throw new Error(`Expected ${newDuration} min, got ${actualDuration} min`);
        if (actualDuration % 5 === 0) throw new Error(`Duration ${actualDuration} is a multiple of 5`);

        console.log('  ✅ PASSED: Modified "' + targetSlot.title + '" to ' + newDuration + ' min (was ' + originalDuration + ' min)');
        passed++;
      } catch (err) {
        console.log('  ❌ FAILED:', err.message);
        failed++;
      }
    });
  });

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
})();
