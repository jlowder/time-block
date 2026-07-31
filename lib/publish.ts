import { ScheduleData, TimeBlock } from './types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime24(h: number, m: number): string {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTime12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function calculateDuration(startH: number, startM: number, endH: number, endM: number): string {
  const totalMin = (endH * 60 + endM) - (startH * 60 + startM);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}min`);
  return parts.join(' ');
}

// ── Theme color maps ───────────────────────────────────────────────────────────

const themeColorMap: Record<string, string> = {
  study:    '#D4A053',
  break:    '#7EB5D6',
  exercise: '#7CB89A',
  leisure:  '#B08DB8',
  special:  '#D47B7B',
};

const themeBgMap: Record<string, string> = {
  study:    'rgba(212, 160, 83, 0.08)',
  break:    'rgba(126, 181, 214, 0.12)',
  exercise: 'rgba(124, 184, 154, 0.10)',
  leisure:  'rgba(176, 141, 184, 0.10)',
  special:  'rgba(212, 123, 123, 0.10)',
};

const themeBadgeBgMap: Record<string, string> = {
  study:    'rgba(212, 160, 83, 0.12)',
  break:    'rgba(126, 181, 214, 0.15)',
  exercise: 'rgba(124, 184, 154, 0.13)',
  leisure:  'rgba(176, 141, 184, 0.13)',
  special:  'rgba(212, 123, 123, 0.13)',
};

const themeBadgeTextMap: Record<string, string> = {
  study:    '#9A7230',
  break:    '#4A8BAD',
  exercise: '#4A8B6D',
  leisure:  '#7D5E8C',
  special:  '#9A4A4A',
};

// ── Build card HTML ────────────────────────────────────────────────────────────

function buildCardsHTML(slots: TimeBlock[]): string {
  return slots.map((slot) => {
    const theme = slot.theme || 'study';
    const themeBg = themeBgMap[theme];
    const themeColor = themeColorMap[theme];
    const badge = slot.badge || calculateDuration(slot.startH, slot.startM, slot.endH, slot.endM);
    const themeBadgeBg = themeBadgeBgMap[theme];
    const themeBadgeText = themeBadgeTextMap[theme];

    return `<div class="schedule-item" data-index="__INDEX__" style="--slot-color: ${themeColor}">
        <div class="time-label">${formatTime24(slot.startH, slot.startM)}</div>
        <div class="timeline-connector">
          <div class="card-dot"></div>
        </div>
        <div class="card">
          <div class="card-inner">
            <div class="icon-container" style="background: ${themeBg}">${slot.icon || '\u2022'}</div>
            <div class="card-content">
              <div class="card-meta">
                <span class="time-range">${formatTime24(slot.startH, slot.startM)}\u2013${formatTime24(slot.endH, slot.endM)}</span>
                ${slot.badge ? `<span class="duration-badge" style="background: ${themeBadgeBg}; color: ${themeBadgeText}">${escapeHtml(badge)}</span>` : ''}
              </div>
              <h3 class="card-title"><span class="title-text">${escapeHtml(slot.title)}</span><span class="live-badge" style="display:none"><span class="live-dot"></span>LIVE</span></h3>
              ${slot.desc ? `<p class="card-desc">${escapeHtml(slot.desc)}</p>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('\n');
}

function buildLegendHTML(): string {
  return Object.entries(themeColorMap)
    .map(([key, color]) => {
      const bg = themeBgMap[key];
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `<div class="legend-item"><span class="legend-dot" style="background-color: ${color}; border-color: ${color}; background-image: radial-gradient(circle, ${bg} 40%, transparent 40%); background-size: 8px 8px;"></span><span class="legend-label">${label}</span></div>`;
    })
    .join('');
}

// ── CSS (used inside the published HTML) ───────────────────────────────────────

const CSS = `
:root {
  --bg-page: #FAFAF8;
  --bg-surface: #FFFFFF;
  --bg-surface-hover: #F5F5F3;
  --text-primary: #111110;
  --text-secondary: #6B6B66;
  --text-muted: #9A9A94;
  --border-subtle: #E8E6E1;
  --border-medium: #D4D2CC;
  --accent-indigo: #2D2A54;
  --accent-gold: #C8A44E;
  --accent-gold-light: rgba(200, 164, 78, 0.15);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --theme-study: #D4A053;
  --theme-break: #7EB5D6;
  --theme-exercise: #7CB89A;
  --theme-leisure: #B08DB8;
  --theme-special: #D47B7B;
  --theme-study-bg: rgba(212, 160, 83, 0.08);
  --theme-break-bg: rgba(126, 181, 214, 0.12);
  --theme-exercise-bg: rgba(124, 184, 154, 0.10);
  --theme-leisure-bg: rgba(176, 141, 184, 0.10);
  --theme-special-bg: rgba(212, 123, 123, 0.10);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; }

body {
  background-color: var(--bg-page);
  color: var(--text-primary);
  font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.header {
  padding: 32px 16px 16px;
  text-align: center;
  flex-shrink: 0;
}
.header h1 {
  font-size: 42px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
}
.header p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.toolbar {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
.toolbar-inner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 12px;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.tb-btn:hover { background: var(--bg-surface-hover); }
.tb-btn:active { transform: scale(0.96); }
.tb-btn--circle {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
}
.tb-divider {
  width: 1px;
  height: 20px;
  background: var(--border-subtle);
}
.tb-btn svg { flex-shrink: 0; }

.main-content {
  flex: 1;
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding-right: 16px;
  gap: 40px;
  overflow: hidden;
}
.schedule-wrapper {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding-bottom: 48px;
}

.legend {
  width: 144px;
  flex-shrink: 0;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  height: fit-content;
  position: sticky;
  top: 0;
}
.legend-title {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.legend-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid;
  flex-shrink: 0;
  background-size: 8px 8px;
}
.legend-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.schedule {
  position: relative;
  padding-left: 0;
}
.timeline-line {
  position: absolute;
  left: 56px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent 0%, #2D2A54 5%, #2D2A54 95%, transparent 100%);
  opacity: 0.15;
}

.schedule-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}
.time-label {
  width: 40px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
.timeline-connector {
  width: 12px;
  flex-shrink: 0;
  position: relative;
}
.card-dot {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  border-color: var(--slot-color);
  background: var(--bg-surface);
  top: 3px;
  transition: all 0.3s ease;
}

.card {
  flex: 1;
  border-radius: 8px;
  background: var(--bg-surface);
  border-left: 4px solid var(--slot-color);
  box-shadow: var(--shadow-sm);
  transition: opacity 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
.card:hover { box-shadow: var(--shadow-md); }
.card-inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
}
.icon-container {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-primary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}
.card-content {
  min-width: 0;
  flex: 1;
  padding-top: 2px;
}
.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.time-range {
  font-size: 11px;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
}
.duration-badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.7;
}

/* ── Active (LIVE) slot ── */

.schedule-item.active .card-dot {
  width: 12px;
  height: 12px;
  border-color: var(--accent-gold);
  background: var(--accent-gold-light);
  box-shadow: 0 0 8px 2px var(--accent-gold-light);
  animation: pulse-dot 2s ease-in-out infinite;
}
.schedule-item.active .card {
  background: var(--accent-gold-light);
  border-left-color: var(--accent-gold);
  box-shadow: var(--shadow-md);
}
.schedule-item.active .icon-container {
  width: 56px;
  height: 56px;
  font-size: 24px;
  color: var(--accent-gold);
  box-shadow: 0 0 20px 4px var(--accent-gold-light);
  border: 2px solid;
  border-color: var(--accent-gold);
}
.schedule-item.active .card-title {
  font-size: 20px;
  font-weight: 700;
}
.schedule-item.active .card-desc {
  opacity: 1;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--accent-gold);
  background: var(--accent-gold-light);
}
.live-badge .live-dot {
  position: relative;
  display: inline-flex;
  width: 6px;
  height: 6px;
}
.live-badge .live-dot::before,
.live-badge .live-dot::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-gold);
}
.live-badge .live-dot::after {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes ping {
  75%, 100% { transform: scale(2.5); opacity: 0; }
}

.schedule-item.past { opacity: 0.35; }
.schedule-item.future { opacity: 0.8; }

.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  font-size: 13px;
}
.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.status-icon {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-gold);
  opacity: 0.6;
  flex-shrink: 0;
}
.status-title {
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-message p {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}
.status-center {
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-center span {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
.status-clock {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.status-divider {
  width: 1px;
  height: 12px;
  background: var(--border-subtle);
}

@media (max-width: 499px) {
  .main-content {
    flex-direction: column;
    gap: 12px;
    padding-right: 0;
  }
  .legend {
    width: 100%;
    position: static;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }
  .legend-title { display: none; }
  .legend-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .header h1 { font-size: 28px; }
  .card-inner { padding: 12px; gap: 10px; }
  .icon-container { width: 36px; height: 36px; font-size: 16px; }
  .schedule-item.active .icon-container { width: 44px; height: 44px; font-size: 20px; }
  .card-title { font-size: 14px; }
  .schedule-item.active .card-title { font-size: 16px; }
}

@media print {
  body { background: white; }
  .toolbar, .status-bar, .legend { display: none !important; }
  .schedule-item.past { opacity: 1; }
  .schedule-item.future { opacity: 1; }
  .schedule-item .card { box-shadow: none; border: 1px solid #e0e0e0; }
}
`;

// ── JavaScript (used inside the published HTML) ────────────────────────────────

function buildJS(data: ScheduleData): string {
  const slots = data.slots || [];
  const dataJson = JSON.stringify(data);

  return `
// Embedded schedule data
var SCHEDULE_DATA = ${dataJson};

var THEME_COLORS = ${JSON.stringify(themeColorMap)};
var THEME_BGS = ${JSON.stringify(themeBgMap)};
var THEME_BADGE_BGS = ${JSON.stringify(themeBadgeBgMap)};
var THEME_BADGE_TEXTS = ${JSON.stringify(themeBadgeTextMap)};

var audioCtx = null;
var lastActiveIndex = null;
var soundEnabled = true;

(function() {
  try {
    var stored = localStorage.getItem('dailySchedule');
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.slots && parsed.slots.length > 0) {
        SCHEDULE_DATA = parsed;
      }
    }
  } catch(e) {}

  renderSchedule();
  updateActiveSlot();
  scrollToActiveSlot();
  startTimers();
  buildToolbar();
  updateStatusBar(getActiveSlotIndex(SCHEDULE_DATA.slots || []));
})();

function renderSchedule() {
  var slots = SCHEDULE_DATA.slots || [];
  var scheduleEl = document.getElementById('schedule');
  if (!slots.length) return;

  var activeIdx = getActiveSlotIndex(slots);

  var items = scheduleEl.querySelectorAll('.schedule-item');
  items.forEach(function(item, i) {
    var slot = slots[i];
    var theme = slot.theme || 'study';
    var themeColor = THEME_COLORS[theme] || THEME_COLORS.study;
    var themeBg = THEME_BGS[theme] || THEME_BGS.study;
    var badge = slot.badge || calcDuration(slot.startH, slot.startM, slot.endH, slot.endM);
    var themeBadgeBg = THEME_BADGE_BGS[theme] || THEME_BADGE_BGS.study;
    var themeBadgeText = THEME_BADGE_TEXTS[theme] || THEME_BADGE_TEXTS.study;

    item.style.setProperty('--slot-color', themeColor);
    item.setAttribute('data-index', String(i));

    var dot = item.querySelector('.card-dot');
    if (dot) { dot.style.borderColor = themeColor; }

    var icon = item.querySelector('.icon-container');
    if (icon) {
      icon.style.background = themeBg;
      icon.textContent = slot.icon || '\\u2022';
    }

    var timeRange = item.querySelector('.time-range');
    if (timeRange) {
      timeRange.textContent = fmt24(slot.startH, slot.startM) + '\\u2013' + fmt24(slot.endH, slot.endM);
    }

    var badgeEl = item.querySelector('.duration-badge');
    if (badgeEl) {
      badgeEl.textContent = badge;
      badgeEl.style.background = themeBadgeBg;
      badgeEl.style.color = themeBadgeText;
    }

    var titleText = item.querySelector('.title-text');
    if (titleText) { titleText.textContent = slot.title; }

    var badge = item.querySelector('.live-badge');
    if (badge) { badge.style.display = i === activeIdx ? '' : 'none'; }

    var desc = item.querySelector('.card-desc');
    if (desc) {
      desc.textContent = slot.desc || '';
      desc.style.display = slot.desc ? '' : 'none';
    }
  });
}

function getActiveSlotIndex(slots) {
  if (!slots || slots.length === 0) return -1;
  var now = new Date();
  var currentMin = now.getHours() * 60 + now.getMinutes();

  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];
    var slotStart = slot.startH * 60 + slot.startM;
    var slotEnd = slot.endH * 60 + slot.endM;

    if (currentMin >= slotStart && currentMin < slotEnd) {
      return i;
    }
  }
  return -1;
}

function updateActiveSlot() {
  var slots = SCHEDULE_DATA.slots || [];
  var index = getActiveSlotIndex(slots);
  var items = document.querySelectorAll('.schedule-item');

  items.forEach(function(item, i) {
    item.classList.remove('active', 'past', 'future');
    if (i === index) {
      item.classList.add('active');
    } else if (i < index) {
      item.classList.add('past');
    } else {
      item.classList.add('future');
    }
  });

  if (lastActiveIndex !== null && lastActiveIndex !== index) {
    if (soundEnabled) { playChime(); }
    scrollToActiveSlot();
  }
  lastActiveIndex = index;

  updateStatusBar(index);
}

function playChime() {
  try {
    var Ctx = window.AudioContext || (window.webkitAudioContext);
    if (!Ctx) return;
    var ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();

    var notes = [523.25, 659.25, 783.99, 1046.50];
    var now = ctx.currentTime;

    notes.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      var start = now + i * 0.15;
      var end = start + 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, end);
      osc.start(start);
      osc.stop(end + 0.01);
    });

    var bellStart = now + notes.length * 0.15;
    var bellOsc = ctx.createOscillator();
    var bellGain = ctx.createGain();
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.type = 'sine';
    bellOsc.frequency.value = 880;
    var bellEnd = bellStart + 0.5;
    bellGain.gain.setValueAtTime(0, bellStart);
    bellGain.gain.linearRampToValueAtTime(0.4, bellStart + 0.01);
    bellGain.gain.exponentialRampToValueAtTime(0.01, bellEnd);
    bellOsc.start(bellStart);
    bellOsc.stop(bellEnd + 0.01);
  } catch(e) {}
}

function fmt12(h, m) {
  var period = h >= 12 ? 'PM' : 'AM';
  var hour12 = h % 12 === 0 ? 12 : h % 12;
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period;
}

function fmt24(h, m) {
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function getTimeRemaining(startH, startM, endH, endM) {
  var now = new Date();
  var currentMin = now.getHours() * 60 + now.getMinutes();
  var startMin = startH * 60 + startM;
  var endMin = endH * 60 + endM;

  if (currentMin < startMin) {
    var diff = startMin - currentMin;
    var hours = Math.floor(diff / 60);
    var mins = diff % 60;
    return hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
  }
  if (currentMin >= startMin && currentMin < endMin) {
    var diff = endMin - currentMin;
    var hours = Math.floor(diff / 60);
    var mins = diff % 60;
    return hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
  }
  return 'Now';
}

function updateStatusBar(activeIndex) {
  var slots = SCHEDULE_DATA.slots || [];
  var bar = document.getElementById('statusBar');
  if (!bar) return;

  var now = new Date();
  var currentTime = fmt12(now.getHours(), now.getMinutes());

  if (slots.length === 0) {
    bar.innerHTML = '<div class="status-message"><div class="status-icon"></div><p>Schedule is empty</p></div><div class="status-clock">' + currentTime + '</div>';
    return;
  }

  var firstSlot = slots[0];
  var lastSlot = slots[slots.length - 1];
  var firstSlotStart = firstSlot.startH * 60 + firstSlot.startM;
  var lastSlotEnd = (lastSlot.endH || 23) * 60 + (lastSlot.endM || 59);
  var currentMin = now.getHours() * 60 + now.getMinutes();

  if (activeIndex >= 0 && activeIndex < slots.length) {
    var slot = slots[activeIndex];
    var theme = slot.theme || 'study';
    var themeColor = THEME_COLORS[theme] || THEME_COLORS.study;
    var remaining = getTimeRemaining(slot.startH, slot.startM, slot.endH || 23, slot.endM || 59);
    var icon = slot.icon || '\\u2022';

    bar.innerHTML =
      '<div class="status-left">' +
        '<div class="status-icon" style="background: ' + themeColor + '"></div>' +
        '<span class="status-title">' + escapeHtml(slot.icon || '\\u2022') + ' ' + escapeHtml(slot.title) + '</span>' +
      '</div>' +
      '<div class="status-center">' +
        '<span>Ends in ' + remaining + '</span>' +
        '<div class="status-divider"></div>' +
      '</div>' +
      '<div class="status-clock">' + currentTime + '</div>';
  } else if (currentMin < firstSlotStart) {
    bar.innerHTML = '<div class="status-message"><div class="status-icon"></div><p>Schedule hasn\\'t started yet \\u2014 \\u2615 relax</p></div><div class="status-clock">' + currentTime + '</div>';
  } else if (currentMin >= lastSlotEnd) {
    bar.innerHTML = '<div class="status-message"><div class="status-icon"></div><p>Activity block complete! \\ud83c\\udf89</p></div><div class="status-clock">' + currentTime + '</div>';
  } else {
    bar.innerHTML = '<div class="status-message"><div class="status-icon"></div><p>Between activities</p></div><div class="status-clock">' + currentTime + '</div>';
  }
}

function buildToolbar() {
  var toolbar = document.getElementById('toolbar');
  if (!toolbar) return;

  toolbar.innerHTML =
    '<div class="toolbar-inner">' +
      '<button class="tb-btn tb-btn--circle" id="soundBtn" title="Toggle sound">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
      '</button>' +
      '<div class="tb-divider"></div>' +
      '<button class="tb-btn" id="importBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Import</button>' +
      '<button class="tb-btn" id="exportBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Export</button>' +
      '<div class="tb-divider"></div>' +
      '<button class="tb-btn" id="printBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</button>' +
      '<input type="file" id="importFile" accept=".json" style="display:none">' +
    '</div>';

  document.getElementById('soundBtn').addEventListener('click', function() {
    soundEnabled = !soundEnabled;
    var btn = document.getElementById('soundBtn');
    if (soundEnabled) {
      playChime();
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    } else {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    }
  });

  document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (data && data.slots) {
          SCHEDULE_DATA = data;
          renderSchedule();
          updateActiveSlot();
        } else {
          alert('Invalid schedule file: missing slots array');
        }
      } catch(err) {
        alert('Failed to parse schedule file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('exportBtn').addEventListener('click', function() {
    var blob = new Blob([JSON.stringify(SCHEDULE_DATA, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'daily-schedule.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('printBtn').addEventListener('click', function() {
    window.print();
  });
}

function startTimers() {
  setInterval(updateActiveSlot, 30000);
  setInterval(function() { updateStatusBar(lastActiveIndex); }, 1000);
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') { updateActiveSlot(); }
  });
}

function scrollToActiveSlot() {
  var activeEl = document.querySelector('.schedule-item.active');
  if (!activeEl) return;

  // Mobile viewport changes (address bar) can invalidate scroll positions.
  // Use scrollIntoView which re-evaluates at scroll time, and add a small
  // delay so the mobile browser has settled after layout / visibility change.
  setTimeout(function() {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 50);
}

// Re-scroll when the mobile viewport resizes (address bar show/hide)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function() {
    // Only re-scroll if there's an active slot and user isn't scrolling
    if (document.querySelector('.schedule-item.active')) {
      setTimeout(scrollToActiveSlot, 100);
    }
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function calcDuration(startH, startM, endH, endM) {
  var totalMin = (endH * 60 + endM) - (startH * 60 + startM);
  var hours = Math.floor(totalMin / 60);
  var mins = totalMin % 60;
  var parts = [];
  if (hours > 0) parts.push(hours + 'h');
  if (mins > 0 || parts.length === 0) parts.push(mins + 'min');
  return parts.join(' ');
}
`;
}

// ── buildHtml: generates the full standalone HTML document ─────────────────────

function buildHtml(data: ScheduleData): string {
  const slots = data.slots || [];
  const cardsHtml = slots.length === 0 ? '' : buildCardsHTML(slots);
  const legendHtml = buildLegendHTML();
  const jsCode = buildJS(data);

  const emptyState = slots.length === 0
    ? `<div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--border-medium); margin-bottom: 16px;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p style="font-size: 14px; font-weight: 500; color: var(--text-secondary); margin: 0;">No activities scheduled</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Daily Schedule</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23C8A44E'/%3E%3Ctext x='32' y='42' text-anchor='middle' font-size='28' font-family='system-ui' fill='white' font-weight='700'%3ETB%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Space+Grotesk:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
${CSS}
</style>
</head>
<body>
<div id="app">
  <header class="header">
    <h1>Time Block</h1>
    <p>Your daily schedule</p>
  </header>

  <div class="toolbar" id="toolbar"></div>

  <main class="main-content">
    <aside class="legend" id="legend">
      <span class="legend-title">Themes</span>
      <div class="legend-list">${legendHtml}</div>
    </aside>
    <div class="schedule-wrapper">
      ${emptyState}
      <div class="schedule" id="schedule">
        <div class="timeline-line"></div>
        ${cardsHtml}
      </div>
    </div>
  </main>

  <footer class="status-bar" id="statusBar"></footer>
</div>

<script>
${jsCode}
</script>
</body>
</html>`;
}

/**
 * Public API: call with your schedule data to trigger a download
 * of a self-contained schedule.html file.
 */
export function publishSchedule(data: ScheduleData): void {
  const html = buildHtml(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'schedule.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { buildHtml, formatTime24, formatTime12, calculateDuration };
