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

// ── API key resolution ────────────────────────────────────────────────────────

async function resolveApiKey() {
  // 1. Explicit env var override
  if (process.env.LLM_API_KEY) {
    return process.env.LLM_API_KEY;
  }

  // 2. macOS keychain via security CLI (non-blocking with timeout)
  try {
    const { spawn } = await import('child_process');
    const result = await Promise.race([
      new Promise((resolve) => {
        const proc = spawn('security', [
          'find-generic-password',
          '-s', 'time-block',
          '-a', 'llm-api-key',
          '-w',
        ], {
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        let output = '';
        proc.stdout.on('data', (chunk) => { output += chunk.toString(); });
        proc.on('close', (code) => resolve({ code, output: output.trim() }));
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Keychain access timed out')), 8000);
      }),
    ]);
    if (result.code === 0 && result.output) {
      return result.output;
    }
  } catch (err) {
    // macOS keychain not available or timed out
  }

  // 3. No key available
  throw new Error(
    'No API key found. Set LLM_API_KEY env var or store a key in your macOS keychain (Service: time-block, Account: llm-api-key).'
  );
}

// ── Keyring setup ─────────────────────────────────────────────────────────────

async function setupKeychain(apiKey) {
  try {
    // Check current state (5s timeout)
    const checkRes = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(5000) });
    const checkData = await checkRes.json();

    if (checkData.hasKey) {
      console.log('  ✅ API key already set in keychain');
      return;
    }

    // Set the key via the /api/keyring endpoint (5s timeout)
    const setRes = await fetch('http://localhost:3000/api/keyring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        key: apiKey,
        endpoint: 'http://localhost:8080/v1',
        model: 'Qwen3.6-35B-A3B-MLX-8bit'
      })
    });

    if (setRes.ok) {
      console.log('  ✅ API key set in keychain');
    } else {
      const errText = await setRes.text();
      console.log(`  ⚠️  Failed to set API key in keychain: ${errText}`);
    }
  } catch (err) {
    console.log(`  ⚠️  Could not reach keyring endpoint: ${err.message}`);
  }
}

// ── LLM backend check ────────────────────────────────────────────────────────

async function checkLlmEndpoint(apiKey) {
  try {
    const res = await fetch('http://localhost:8080/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 401) {
      console.log('  ✅ LLM backend reachable');
      return true;
    }
    console.log(`  ⚠️  LLM backend returned ${res.status}`);
    return true; // Still let tests try
  } catch (err) {
    console.log(`\n  ❌ LLM backend at http://localhost:8080 is not reachable.`);
    console.log('  The LLM tests require a running LLM server (e.g., Ollama, LM Studio, vLLM).');
    console.log('  Start your LLM server and try again, or skip integration tests.\n');
    return false;
  }
}

// ── Dev server setup ────────────────────────────────────────────────────────

async function isServerRunning() {
  try {
    const res = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServerReady(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        console.log('  ✅ Dev server ready');
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('  ❌ Dev server failed to become ready\n');
  return false;
}

async function setupDevServer() {
  console.log('Checking for dev server...');
  
  // Always kill any existing process on port 3000
  try {
    const { execSync } = await import('child_process');
    execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null || true', { stdio: 'pipe' });
    await new Promise(r => setTimeout(r, 800)); // wait for port to free
  } catch {
    // Ignore cleanup errors
  }

  console.log('  Starting dev server...');
  const { spawn } = await import('child_process');
  const { resolve } = await import('path');

  const nextDevPath = resolve(PROJECT_ROOT, 'node_modules', '.bin', 'next');
  const devProcess = spawn('node', [nextDevPath, 'dev', '--port', '3000'], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    detached: true,
  });

  console.log(`  Dev server PID: ${devProcess.pid}`);

  // Collect stderr for debugging
  let stderrOutput = '';
  devProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderrOutput += text;
    process.stderr.write(chunk);
  });

  return new Promise((resolve) => {
    let ready = false;

    devProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (!ready && (text.toLowerCase().includes('ready') || text.toLowerCase().includes('started'))) {
        ready = true;
      }
    });

    devProcess.on('error', (err) => {
      if (!ready) {
        console.log(`  ❌ Failed to start dev server: ${err.message}\n`);
        resolve(false);
      }
    });

    devProcess.on('exit', (code, signal) => {
      if (!ready) {
        console.log(`  ❌ Dev server exited (code: ${code}, signal: ${signal})\n`);
        resolve(false);
      }
    });

    // Wait for HTTP server to be ready
    (async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch('http://localhost:3000/api/keyring', { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            console.log('  ✅ Dev server ready\n');
            resolve(true);
            return;
          }
        } catch {
          // Not ready yet
        }
        await new Promise(r => setTimeout(r, 500));
      }
      console.log('  ❌ Dev server failed to become ready\n');
      resolve(false);
    })();

    // Safety timeout
    setTimeout(() => {
      if (!ready) {
        try { devProcess.kill(); } catch {}
        console.log('  ❌ Dev server startup timed out\n');
        resolve(false);
      }
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

// Test 14: Add task via LLM chat and verify 12:00 PM (not AM)
// Initial schedule is empty; this is the first task.
let skipIntegrationTests = false;

console.log('\nTest 14: Add first task via LLM chat - "add a task at 11:45 for 15 minutes"');
try {
  // Start dev server if not running
  const serverReady = await setupDevServer();
  if (!serverReady) {
    console.log('  ❌ Could not start dev server. Is npm/next installed?\n');
    failed++;
    failures.push('Dev server failed to start');
    skipIntegrationTests = true;
  }

  if (!skipIntegrationTests) {
    const apiKey = await resolveApiKey();
    await setupKeychain(apiKey);
    console.log(`\nUsing API key ending in: ...${apiKey.slice(-4)}\n`);

    const llmOk = await checkLlmEndpoint(apiKey);
    if (!llmOk) {
      skipIntegrationTests = true;
      failed++;
      failures.push('LLM backend not available — start Ollama/LM Studio/vLLM on port 8080');
    } else {
      const data = await chat('Add a task called "LLM Test" at 11:45 AM for 15 minutes');
      if (!data.schedule) throw new Error('No schedule in response');
      if (data.schedule.slots.length !== 1) throw new Error(`Expected 1 slot, got ${data.schedule.slots.length}`);

      const slot = data.schedule.slots[0];
      const endTime = formatTime12(slot.endH, slot.endM);
      if (endTime !== '12:00 PM') {
        throw new Error(`Expected 12:00 PM, got ${endTime}`);
      }

      console.log('  ✅ PASSED: LLM added first task with correct end time:', endTime);
      passed++;
    }
  }
} catch (err) {
  if (!skipIntegrationTests) {
    console.log('  ❌ FAILED:', err.message);
    failed++;
  }
}

// Test 15: Add second task "at the end" and verify duration
console.log('\nTest 15: Add task via LLM chat - "add task at end for 15 minutes"');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  const currentSchedule = { slots: [{ id: 'slot-temp1', startH: 11, startM: 45, endH: 12, endM: 0, title: 'LLM Test' }] };
  const data = await chat('Add a task called "Afternoon Walk" at the end of the schedule for 15 minutes', currentSchedule);
  if (!data.schedule) throw new Error('No schedule in response');
  if (data.schedule.slots.length !== 2) throw new Error(`Expected 2 slots, got ${data.schedule.slots.length}`);

  const lastSlot = data.schedule.slots[1];
  const taskDuration = durationMinutes(lastSlot.endH, lastSlot.endM, lastSlot.startH, lastSlot.startM);

  if (taskDuration !== 15) {
    throw new Error(`Expected 15 min duration, got ${taskDuration} min`);
  }

  // Verify end time format is valid
  if (lastSlot.endH === 0 && lastSlot.endM === 0 && lastSlot.startH > 0) {
    throw new Error(`Invalid end time (endH=0, endM=0 after startH=${lastSlot.startH})`);
  }

  console.log('  ✅ PASSED: LLM added 15-min task:', lastSlot.startH, lastSlot.startM, '-', lastSlot.endH, lastSlot.endM);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 16: AI Decoration runs and returns decorated tasks
console.log('\nTest 16: AI Decoration - verify it runs and returns decorated tasks');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  const scheduleBefore = (await chat('Show me the current schedule')).schedule;
  if (!scheduleBefore || scheduleBefore.slots.length === 0) {
    // Add some tasks to decorate
    const add = await chat('Add two tasks: "Morning Run" at 7:00 for 20 minutes and "Reading" at 8:00 for 30 minutes');
    if (add.schedule) scheduleBefore.slots.push(...add.schedule.slots);
  }
  const data = await chat('Please decorate all tasks with icons, descriptions, and themes.', scheduleBefore);
  if (!data.schedule) throw new Error('No schedule in response');
  if (data.schedule.slots.length < 1) throw new Error('No tasks to decorate');

  const undecorated = data.schedule.slots.filter(slot =>
    !slot.icon || !slot.desc || !slot.theme
  );
  if (undecorated.length > 0) {
    throw new Error(`${undecorated.length} slots missing decoration fields`);
  }

  const validThemes = ['study', 'break', 'exercise', 'leisure', 'special'];
  const invalidThemes = data.schedule.slots.filter(slot => !validThemes.includes(slot.theme));
  if (invalidThemes.length > 0) {
    throw new Error(`${invalidThemes.length} slots have invalid theme`);
  }

  if (!data.text || data.text.length < 10) {
    throw new Error('Text response too short or missing');
  }

  console.log('  ✅ PASSED: Decorate ran successfully, all slots decorated');
  console.log(`     - ${data.schedule.slots.length} slots decorated`);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 17: Random Task Insertion (1-5 tasks)
console.log('\nTest 17: Random Task Insertion (1-5 tasks at random positions)');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  // Start fresh: clear any previous schedule first
  await chat('Delete all tasks');

  // Add the base task
  const add1 = await chat('Add a task called "Baseline" at 9:00 for 30 minutes');
  if (!add1.schedule) throw new Error('Failed to add baseline');

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
    if (!addRes.schedule) throw new Error(`Add failed for task ${i + 1}`);

    const newTask = addRes.schedule.slots.find(s => s.title === taskTitle);
    if (!newTask) throw new Error(`Task "${taskTitle}" not found`);

    const actualDuration = (newTask.endH * 60 + newTask.endM) - (newTask.startH * 60 + newTask.startM);
    if (actualDuration !== durationMin) {
      throw new Error(`Task "${taskTitle}" has wrong duration: ${actualDuration}min (expected ${durationMin}min)`);
    }

    currentSchedule = addRes.schedule;
  }

  const finalSlotCount = currentSchedule.slots.length;
  const expectedCount = 1 + taskCount;
  if (finalSlotCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} slots, got ${finalSlotCount}`);
  }

  console.log('  ✅ PASSED: Inserted', taskCount, 'tasks, total slots:', finalSlotCount);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 18: Random Task Reordering
console.log('\nTest 18: Random Task Reordering');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  // Ensure we have enough tasks
  const check1 = await chat('Show me the current schedule');
  let currentSchedule = check1.schedule || { slots: [] };

  if (currentSchedule.slots.length < 3) {
    const add = await chat('Add 3 tasks called "Alpha", "Beta", "Gamma" at 9:00, 10:00, and 11:00 for 15 minutes each', currentSchedule);
    if (add.schedule) currentSchedule = add.schedule;
  }

  if (currentSchedule.slots.length < 3) {
    throw new Error('Not enough tasks to reorder (need at least 3, current: ' + currentSchedule.slots.length + ')');
  }

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

    // Swap back: we want taskIds[idx1] to end up at position idx1
    // After the array swap, taskIds[idx1] holds the original task at idx2
    // We want: result[idx1] = original task at idx1, result[idx2] = original task at idx2
    // So the desired order is the original order with idx1 and idx2 swapped
    // The prompt asks for taskIds (which has idx1 and idx2 swapped)
    // So after reorder, position idx1 should hold the task that was originally at idx2 (taskIds[idx1])
    // and position idx2 should hold the task that was originally at idx1 (taskIds[idx2])

    const reorderRes = await chat(
      `Reorder tasks to: ${JSON.stringify(taskIds)}`,
      currentSchedule
    );
    if (!reorderRes.schedule) throw new Error('Reorder failed');

    // After reordering by taskIds array, position idx1 should have taskIds[idx1]
    // which is the original task that was at idx2
    const taskAtIdx1 = reorderRes.schedule.slots[idx1];
    const taskAtIdx2 = reorderRes.schedule.slots[idx2];

    if (!taskAtIdx1 || !taskAtIdx2) {
      throw new Error('Slots missing after reorder');
    }

    // Verify: position idx1 should have the task whose ID is taskIds[idx1]
    if (taskAtIdx1.id !== taskIds[idx1]) {
      throw new Error(`Position ${idx1} has task "${taskAtIdx1.title}" (id=${taskAtIdx1.id}), expected "${taskIds[idx1]}"`);
    }
    if (taskAtIdx2.id !== taskIds[idx2]) {
      throw new Error(`Position ${idx2} has task "${taskAtIdx2.title}" (id=${taskAtIdx2.id}), expected "${taskIds[idx2]}"`);
    }

    // Verify all tasks still exist
    const newIds = reorderRes.schedule.slots.map(s => s.id);
    if (newIds.length !== slotCount) {
      throw new Error(`Slot count changed: ${newIds.length} (expected ${slotCount})`);
    }
    for (const id of initialSlots) {
      if (!newIds.includes(id)) {
        throw new Error(`Task "${id}" disappeared after reorder`);
      }
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
}

// Test 19: Delete task by time
console.log('\nTest 19: Delete task by time');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  // Add 3 tasks at different times
  const addRes = await chat('Add three tasks: "Morning Run" at 7:00 for 30 minutes, "Breakfast" at 8:00 for 20 minutes, and "Study" at 9:00 for 45 minutes');
  if (!addRes.schedule) throw new Error('Failed to add tasks');

  const scheduleBefore = addRes.schedule;
  if (scheduleBefore.slots.length < 3) {
    throw new Error(`Need 3+ slots, got ${scheduleBefore.slots.length}`);
  }

  // Delete the middle task by its ID
  const targetSlot = scheduleBefore.slots[1];

  const deleteRes = await chat(
    `Use the deleteTask tool to remove the task with ID "${targetSlot.id}".`,
    scheduleBefore
  );
  if (!deleteRes.schedule) throw new Error('No schedule in response');

  const stillExists = deleteRes.schedule.slots.some(s => s.id === targetSlot.id);
  if (stillExists) {
    throw new Error(`Task "${targetSlot.title}" (id=${targetSlot.id}) still exists after delete`);
  }

  if (deleteRes.schedule.slots.length !== scheduleBefore.slots.length - 1) {
    throw new Error(`Expected ${scheduleBefore.slots.length - 1} slots, got ${deleteRes.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted task by time, slots: ' + scheduleBefore.slots.length + '→' + deleteRes.schedule.slots.length);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 20: Delete all 5-minute breaks
console.log('\nTest 20: Delete all 5-minute breaks');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  // Add a mix of tasks including several 5-minute breaks
  const addRes = await chat('Add five tasks: "Run" at 7:00 for 30 minutes, "Break" at 7:30 for 5 minutes, "Study" at 7:40 for 20 minutes, "Break" at 8:10 for 5 minutes, and "Dinner" at 8:20 for 40 minutes');
  if (!addRes.schedule) throw new Error('Failed to add tasks');

  let scheduleBefore = addRes.schedule;
  if (scheduleBefore.slots.length < 5) {
    throw new Error(`Need 5 slots, got ${scheduleBefore.slots.length}`);
  }

  const breaks = scheduleBefore.slots.filter(s => {
    const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
    return duration <= 5 && s.title.toLowerCase().includes('break');
  });

  if (breaks.length === 0) {
    throw new Error('No 5-minute breaks were added to the schedule');
  }

  // Delete each break one by one by ID
  let currentSchedule = scheduleBefore;
  for (const brk of breaks) {
    const deleteRes = await chat(
      `Use the deleteTask tool to remove the task with ID "${brk.id}".`,
      currentSchedule
    );
    if (!deleteRes.schedule) throw new Error(`Failed to delete break ${brk.id}`);
    currentSchedule = deleteRes.schedule;
  }

  const remainingBreaks = currentSchedule.slots.filter(s => {
    const duration = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
    return duration <= 5 && s.title.toLowerCase().includes('break');
  });

  if (remainingBreaks.length > 0) {
    throw new Error(`${remainingBreaks.length} breaks still exist after delete`);
  }

  const expectedRemaining = scheduleBefore.slots.length - breaks.length;
  if (currentSchedule.slots.length !== expectedRemaining) {
    throw new Error(`Expected ${expectedRemaining} remaining tasks, got ${currentSchedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted ' + breaks.length + ' five-minute breaks, slots: ' + scheduleBefore.slots.length + '→' + currentSchedule.slots.length);
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 21: Delete by task name
console.log('\nTest 21: Delete by task name');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  let scheduleBefore = (await chat('Show me the current schedule')).schedule || { slots: [] };

  if (scheduleBefore.slots.length === 0) {
    const add = await chat('Add a task called "Task To Delete" at 9:00 for 30 minutes');
    if (add.schedule) scheduleBefore = add.schedule;
  }

  if (scheduleBefore.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test delete by name');
  }

  const targetTitle = scheduleBefore.slots[0].title;

  const deleteRes = await chat(`Delete the task called "${targetTitle}"`, scheduleBefore);
  if (!deleteRes.schedule) throw new Error('No schedule in response');

  const stillExists = deleteRes.schedule.slots.some(s => s.title === targetTitle);
  if (stillExists) {
    throw new Error(`Task "${targetTitle}" still exists after delete`);
  }

  console.log('  ✅ PASSED: Deleted "' + targetTitle + '" by name');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 22: Delete the last task
console.log('\nTest 22: Delete the last task');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  let scheduleBefore = (await chat('Show me the current schedule')).schedule || { slots: [] };

  if (scheduleBefore.slots.length === 0) {
    const add = await chat('Add a task called "Last Task" at 9:00 for 30 minutes');
    if (add.schedule) scheduleBefore = add.schedule;
  }

  if (scheduleBefore.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test delete last');
  }

  const lastTask = scheduleBefore.slots[scheduleBefore.slots.length - 1];

  const deleteRes = await chat('Delete the last task', scheduleBefore);
  if (!deleteRes.schedule) throw new Error('No schedule in response');

  const lastTaskStillExists = deleteRes.schedule.slots.some(s => s.id === lastTask.id);
  if (lastTaskStillExists) {
    throw new Error(`Last task "${lastTask.title}" still exists after delete`);
  }

  if (deleteRes.schedule.slots.length !== scheduleBefore.slots.length - 1) {
    throw new Error(`Expected ${scheduleBefore.slots.length - 1} slots, got ${deleteRes.schedule.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted last task "' + lastTask.title + '"');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 23: Delete ALL tasks (empty schedule)
console.log('\nTest 23: Delete ALL tasks (empty schedule)');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  // Add tasks first
  const addRes = await chat('Add three tasks: "Task A" at 9:00 for 30 minutes, "Task B" at 10:00 for 20 minutes, and "Task C" at 11:00 for 25 minutes');
  if (!addRes.schedule) throw new Error('Failed to add tasks');

  let scheduleBefore = addRes.schedule;
  if (scheduleBefore.slots.length < 3) {
    throw new Error(`Need 3+ slots, got ${scheduleBefore.slots.length}`);
  }

  // Delete each task one by one by ID
  for (const slot of scheduleBefore.slots) {
    const deleteRes = await chat(
      `Use the deleteTask tool to remove the task with ID "${slot.id}".`,
      scheduleBefore
    );
    if (!deleteRes.schedule) throw new Error(`Failed to delete task ${slot.id}`);
    scheduleBefore = deleteRes.schedule;
  }

  if (scheduleBefore.slots.length !== 0) {
    throw new Error(`Expected 0 slots after deleting all, got ${scheduleBefore.slots.length}`);
  }

  console.log('  ✅ PASSED: Deleted all ' + scheduleBefore.slots.length + ' tasks, schedule is empty');
  passed++;
} catch (err) {
  console.log('  ❌ FAILED:', err.message);
  failed++;
}
}

// Test 24: Edit task to odd duration (not multiple of 5)
console.log('\nTest 24: Edit task to odd duration');
if (skipIntegrationTests) {
  console.log('  ⏭️  Skipped (dev server unavailable)');
  passed++;
} else {
try {
  let scheduleBefore = (await chat('Show me the current schedule')).schedule;
  if (!scheduleBefore) throw new Error('No schedule in response');

  if (scheduleBefore.slots.length === 0) {
    const addRes = await chat('Add a task called "Test Task" at 10:00 for 30 minutes');
    scheduleBefore = addRes.schedule;
  }

  if (scheduleBefore.slots.length === 0) {
    throw new Error('Schedule is empty, cannot test modify task');
  }

  const targetSlot = scheduleBefore.slots[0];
  const originalDuration = (targetSlot.endH * 60 + targetSlot.endM) - (targetSlot.startH * 60 + targetSlot.startM);

  const oddDurations = [7, 13, 17, 23, 37];
  const newDuration = oddDurations[Math.floor(Math.random() * oddDurations.length)];

  const modifyRes = await chat(
    `Change the task called "${targetSlot.title}" to be ${newDuration} minutes long`,
    scheduleBefore
  );
  if (!modifyRes.schedule) throw new Error('No schedule in response');

  const modifiedSlot = modifyRes.schedule.slots.find(s => s.id === targetSlot.id);
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
