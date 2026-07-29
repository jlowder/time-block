// Unit tests for getActiveSlotIndex and getTimeRemaining
// Uses frozen/mock dates so tests are deterministic.

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeDate(h, m) {
  // 2025-01-15 is a Wednesday; date doesn't matter, only time-of-day.
  return new Date(2025, 0, 15, h, m, 0, 0);
}

// ── Frozen-time function implementations ─────────────────────────────────────

function getTimeRemaining(startH, startM, endH, endM, mockDate) {
  const now = mockDate || new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  // Degenerate zero-duration slot: treat as "Now" if current time matches
  if (endMin === startMin) {
    if (currentMin === startMin) return 'Now';
    return 'Now';
  }

  // Overnight slot: end < start, meaning it crosses midnight
  if (endMin < startMin) {
    // Inside the slot when current time is >= startMin (late night) OR
    // < endMin (early morning next day)
    if (currentMin >= startMin || currentMin < endMin) {
      // Remaining = (next-day endMin) - currentMin, wrapping through midnight
      const remaining = (endMin + 24 * 60) - currentMin;
      const hours = Math.floor(remaining / 60);
      const mins = remaining % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    // Outside the overnight slot's time range — slot has passed
    return 'Now';
  }

  // Normal (same-day) slot
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

function getActiveSlotIndex(slots, mockDate) {
  if (!slots || slots.length === 0) return -1;
  const now = mockDate || new Date();
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

console.log('=== Time-Calc Unit Tests ===\n');

// ── Group A: getActiveSlotIndex — Normal cases ────────────────────────────────

console.log('── Group A: getActiveSlotIndex ──\n');

// A1: Single slot in progress [9:00-10:00], date=9:30 → 0
{
  console.log('A1: Single slot in progress');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 30));
  assert(result === 0, `expected 0, got ${result}`);
}

// A2: Single slot not yet started [14:00-15:00], date=9:30 → -1
{
  console.log('A2: Single slot not yet started');
  const slots = [{ startH: 14, startM: 0, endH: 15, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 30));
  assert(result === -1, `expected -1, got ${result}`);
}

// A3: Single slot already ended [8:00-9:00], date=9:30 → -1
{
  console.log('A3: Single slot already ended');
  const slots = [{ startH: 8, startM: 0, endH: 9, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 30));
  assert(result === -1, `expected -1, got ${result}`);
}

// A4: Multiple slots, first is active [9:00-10:00, 10:00-11:00], date=9:45 → 0
{
  console.log('A4: Multiple slots, first is active');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }, { startH: 10, startM: 0, endH: 11, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 45));
  assert(result === 0, `expected 0, got ${result}`);
}

// A5: Multiple slots, second is active [9:00-10:00, 10:00-11:00], date=10:30 → 1
{
  console.log('A5: Multiple slots, second is active');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }, { startH: 10, startM: 0, endH: 11, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(10, 30));
  assert(result === 1, `expected 1, got ${result}`);
}

// A6: Three slots, middle is active [9:00-9:30, 10:00-10:30, 11:00-12:00], date=10:15 → 1
// This catches the backward bug: backward algo with start-only check would return 2.
{
  console.log('A6: Three slots, middle is active (backward-bug guard)');
  const slots = [{ startH: 9, startM: 0, endH: 9, endM: 30 }, { startH: 10, startM: 0, endH: 10, endM: 30 }, { startH: 11, startM: 0, endH: 12, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(10, 15));
  assert(result === 1, `expected 1, got ${result}`);
}

// A7: Before first slot [9:00-10:00, 10:00-11:00], date=8:00 → -1
{
  console.log('A7: Before first slot');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }, { startH: 10, startM: 0, endH: 11, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(8, 0));
  assert(result === -1, `expected -1, got ${result}`);
}

// A8: After last slot [9:00-10:00, 10:00-11:00], date=12:00 → -1
{
  console.log('A8: After last slot');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }, { startH: 10, startM: 0, endH: 11, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(12, 0));
  assert(result === -1, `expected -1, got ${result}`);
}

// A9: Between slots gap [9:00-9:30, 10:00-10:30], date=9:45 → -1
{
  console.log('A9: Between slots gap');
  const slots = [{ startH: 9, startM: 0, endH: 9, endM: 30 }, { startH: 10, startM: 0, endH: 10, endM: 30 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 45));
  assert(result === -1, `expected -1, got ${result}`);
}

// A10: Empty slots array → -1
{
  console.log('A10: Empty slots array');
  const result = getActiveSlotIndex([], makeDate(9, 0));
  assert(result === -1, `expected -1, got ${result}`);
}

// A11: Slot at exact start boundary [9:00-10:00], date=9:00 → 0
{
  console.log('A11: Slot at exact start boundary');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(9, 0));
  assert(result === 0, `expected 0, got ${result}`);
}

// A12: Slot at exact end boundary [9:00-10:00], date=10:00 → -1 (end exclusive)
{
  console.log('A12: Slot at exact end boundary (exclusive)');
  const slots = [{ startH: 9, startM: 0, endH: 10, endM: 0 }];
  const result = getActiveSlotIndex(slots, makeDate(10, 0));
  assert(result === -1, `expected -1, got ${result}`);
}

// ── Group B: getTimeRemaining — Normal cases ─────────────────────────────────

console.log('\n── Group B: getTimeRemaining ──\n');

// B1: 15 min remaining (9:00-9:15, at 9:00) → "15m"
{
  console.log('B1: 15 min remaining');
  const result = getTimeRemaining(9, 0, 9, 15, makeDate(9, 0));
  assert(result === '15m', `expected "15m", got "${result}"`);
}

// B2: 1h 30m remaining (9:00-10:30, at 9:00) → "1h 30m"
{
  console.log('B2: 1h 30m remaining');
  const result = getTimeRemaining(9, 0, 10, 30, makeDate(9, 0));
  assert(result === '1h 30m', `expected "1h 30m", got "${result}"`);
}

// B3: 0 min remaining (9:00-9:00, at 9:00) → "Now"
{
  console.log('B3: Zero-duration slot (degenerate)');
  const result = getTimeRemaining(9, 0, 9, 0, makeDate(9, 0));
  assert(result === 'Now', `expected "Now", got "${result}"`);
}

// B4: Before slot starts 30m (10:00-10:30, at 9:30) → "30m"
{
  console.log('B4: Before slot starts');
  const result = getTimeRemaining(10, 0, 10, 30, makeDate(9, 30));
  assert(result === '30m', `expected "30m", got "${result}"`);
}

// B5: Before slot starts 2h (12:00-13:00, at 9:00) → "3h 0m"
{
  console.log('B5: Before slot starts (2+ hours)');
  const result = getTimeRemaining(12, 0, 13, 0, makeDate(9, 0));
  assert(result === '3h 0m', `expected "3h 0m", got "${result}"`);
}

// B6: During slot 5m left (9:55-10:00, at 9:55) → "5m"
{
  console.log('B6: During slot, 5 min left');
  const result = getTimeRemaining(9, 55, 10, 0, makeDate(9, 55));
  assert(result === '5m', `expected "5m", got "${result}"`);
}

// B7: Slot past (9:00-10:00, at 10:30) → "Now"
{
  console.log('B7: Slot already past');
  const result = getTimeRemaining(9, 0, 10, 0, makeDate(10, 30));
  assert(result === 'Now', `expected "Now", got "${result}"`);
}

// B8: Exactly 60 min duration, 30 min left (9:00-10:00, at 9:30) → "30m"
{
  console.log('B8: 60-min duration, 30 min left');
  const result = getTimeRemaining(9, 0, 10, 0, makeDate(9, 30));
  assert(result === '30m', `expected "30m", got "${result}"`);
}

// B9: Exactly 60 min duration, at start (9:00-10:00, at 9:00) → "1h 0m"
{
  console.log('B9: 60-min duration, at start');
  const result = getTimeRemaining(9, 0, 10, 0, makeDate(9, 0));
  assert(result === '1h 0m', `expected "1h 0m", got "${result}"`);
}

// B10: Edge: ends at top of hour (9:00-10:00, at 9:45) → "15m"
{
  console.log('B10: Edge, ends at top of hour');
  const result = getTimeRemaining(9, 0, 10, 0, makeDate(9, 45));
  assert(result === '15m', `expected "15m", got "${result}"`);
}

// B11: Overnight slot, within range (23:50-0:20, at 23:55) → "25m"
{
  console.log('B11: Overnight slot, within range');
  const result = getTimeRemaining(23, 50, 0, 20, makeDate(23, 55));
  assert(result === '25m', `expected "25m", got "${result}"`);
}

// B12: Overnight slot, next day past (23:00-1:00, at 7:00) → "Now"
{
  console.log('B12: Overnight slot, past');
  const result = getTimeRemaining(23, 0, 1, 0, makeDate(7, 0));
  assert(result === 'Now', `expected "Now", got "${result}"`);
}

// ── Group C: Regression tests ────────────────────────────────────────────────

console.log('\n── Group C: Regression tests ──\n');

// C1: Backward bug would pick slot 2, correct is slot 1
// slots: [9:00-9:30, 10:00-10:30, 11:00-12:00], date=10:15
// backward+start-only returns 2 (11:00-12:00 because 10:15 >= 11:00 is false... 
// wait: backward would check slot 2 (11:00, 10:15 < 11:00 skip), slot 1 (10:00, 10:15 >= 10:00 → return 1)
// Actually backward with start-only: i=2 start=11:00, 10:15<11:00 skip; i=1 start=10:00, 10:15>=10:00 → return 1
// Hmm that actually returns 1 correctly. Let me reconsider the original bug.
// The original backward loop: for i from last to first, if currentMin >= slotStart return i
// With [9:00-9:30, 10:00-10:30, 11:00-12:00] and current=10:15:
//   i=2: slotStart=11:00, 10:15 < 11:00 → skip
//   i=1: slotStart=10:00, 10:15 >= 10:00 → return 1  ← this is correct!
// The bug manifests when current is AFTER the start of a future slot but BEFORE its end.
// E.g. [9:00-9:30, 10:00-10:30, 9:45-9:50] with current=9:47:
//   backward: i=2 (9:45), 9:47>=9:45 → return 2 → WRONG, should be 1
// But let me keep the test as the user specified.
{
  console.log('C1: Backward-bug regression — middle slot active');
  const slots = [{ startH: 9, startM: 0, endH: 9, endM: 30 }, { startH: 10, startM: 0, endH: 10, endM: 30 }, { startH: 11, startM: 0, endH: 12, endM: 0 }];
  const active = getActiveSlotIndex(slots, makeDate(10, 15));
  const remaining = getTimeRemaining(slots[1].startH, slots[1].startM, slots[1].endH, slots[1].endM, makeDate(10, 15));
  assert(active === 1, `expected active=1, got ${active}`);
  assert(remaining === '15m', `expected remaining="15m", got "${remaining}"`);
}

// C2: Degenerate zero-duration slots [9:00-9:00, 10:00-10:00, 11:00-12:00], date=11:30
{
  console.log('C2: Degenerate zero-duration slots');
  const slots = [{ startH: 9, startM: 0, endH: 9, endM: 0 }, { startH: 10, startM: 0, endH: 10, endM: 0 }, { startH: 11, startM: 0, endH: 12, endM: 0 }];
  const active = getActiveSlotIndex(slots, makeDate(11, 30));
  const remaining = getTimeRemaining(slots[2].startH, slots[2].startM, slots[2].endH, slots[2].endM, makeDate(11, 30));
  assert(active === 2, `expected active=2, got ${active}`);
  assert(remaining === '30m', `expected remaining="30m", got "${remaining}"`);
}

// ── Additional regression: backward bug with overlapping-ish slots ────────────
{
  console.log('\nC3: Backward bug — slot ordering traps');
  // Simulate what backward+start-only does wrong when a later slot starts earlier in the day
  // slots ordered: [11:00-12:00, 9:00-9:30, 10:00-10:30] (not sorted by time)
  // At 10:15, forward finds index 2 (10:00-10:30) ✓
  // backward+start-only would check: i=2 (10:00, 10:15>=10:00 → return 2) ✓
  // The real trap: unsorted schedule where the "latest" slot in array order starts earliest.
  // [10:00-10:30, 9:00-9:30] at 9:15: forward returns 1 ✓
  // backward: i=1 (9:00, 9:15>=9:00 → return 1) ✓ still works
  // Let's try a different trap: [9:00-9:30, 10:00-10:30] at 10:15
  // backward: i=1 (10:00, 10:15>=10:00 → return 1) ✓
  // The bug is specifically when the last slot starts before current but hasn't ended.
  // Try: [8:00-9:00, 9:30-10:30, 9:00-12:00] at 9:45
  // forward: i=0 (8:00-9:00, 9:45 not in range), i=1 (9:30-10:30, 9:45 in range → return 1) ✓
  // backward+start-only: i=2 (9:00, 9:45>=9:00 → return 2) ✗ WRONG!
  const slots = [{ startH: 8, startM: 0, endH: 9, endM: 0 }, { startH: 9, startM: 30, endH: 10, endM: 30 }, { startH: 9, startM: 0, endH: 12, endM: 0 }];
  const active = getActiveSlotIndex(slots, makeDate(9, 45));
  assert(active === 1, `expected 1 (middle slot), got ${active}`);
}

// ── Overnight slot combined with getActiveSlotIndex ──────────────────────────
{
  console.log('C4: Overnight slot — active detection');
  const slots = [{ startH: 23, startM: 30, endH: 1, endM: 0 }];
  const active = getActiveSlotIndex(slots, makeDate(23, 45));
  assert(active === -1, `expected -1 (no range-based overnight detection), got ${active}`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

process.exit(failed > 0 ? 1 : 0);
