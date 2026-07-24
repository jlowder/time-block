# Interactive Daily Schedule — Operations Specification

## Overview

The Interactive Daily Schedule is a web-based application for creating, managing, and tracking a daily schedule of time-blocked activities. It provides visual highlighting of the current/next activity, drag-and-drop reordering, persistent storage via localStorage, and audio chimes when transitions occur.

---

## Core Operations

### 1. Schedule Management

| Operation | Description |
|-----------|-------------|
| **Load Default** | Initialize schedule with the predefined set of 15 time-blocked activities (Morning Warm-up through Wind Down). |
| **Load from localStorage** | On app load, retrieve saved schedule from browser storage. If invalid or missing, fall back to default. |
| **Save to localStorage** | Persist all schedule slots to browser storage after any modification. |
| **Reset to Default** | Discard all custom changes and restore the original 15-slot schedule. |

### 2. Time-Block Structure

Each schedule slot (`time-block`) contains the following properties:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the slot |
| `startH` | integer (0–23) | Start hour (24-hour format) |
| `startM` | integer (0–59) | Start minute |
| `endH` | integer (0–23) | End hour |
| `endM` | integer (0–59) | End minute |
| `title` | string | Activity name (e.g., "Puzzles & Newsletters") |
| `desc` | string | Optional description |
| `icon` | string | Emoji icon (1–2 chars) |
| `theme` | enum | One of: `study`, `break`, `exercise`, `leisure`, `special` |
| `badge` | string | Auto-calculated duration string (e.g., "60 min") |
| `badgeClass` | string | CSS class for color-coded badge styling |

**Duration Calculation:**  
`duration = (endH × 60 + endM) − (startH × 60 + startM)` minutes  
Formatted as: `Xh Ymin`, `Xh`, or `Ymin`.

### 4. Edit Mode Operations

**Toggle Edit Mode**
- Enables/disables the chatbot interface
- When toggled from enabled to disabled, the LLM will be queried to "decorate" the tasks: this will generate the following fields: icon, desc, theme, badge, and badge class.
- While edit mode is active, cards are draggable and can be re-ordered by drag and drop.
- Dropping on another card shifts the dragged card to that position.
- All intermediate slots shift accordingly.
- Call `recalculateTimes()` to ensure continuous time progression.
- The first task retains its original start time.
- Each subsequent task starts when the previous one ends (duration preserved).
- Duration badges are updated to reflect new end times.
- Save to localStorage.
- Show success notification.

**LLM Chatbot Interface**
- In edit mode, tasks may be added, edited, or deleted via the chatbot interface.
- the chat implementation is agentic using Vercel AI SDK
- the LLM interacts with the task list via the use of tools
- Examples are: "delete all tasks", "add a task called Read Quantum Programming for 15 minutes starting at 9:00 AM", and "Insert breaks between study blocks".

### 7. Time Recalculation

**Recalculate Times Function**
- Ensures continuous flow by computing start times based on accumulated duration.
- The first task retains its original start time (its duration is preserved).
- Each subsequent task starts when the previous one ends.
- All durations are preserved during reordering.
- Duration badges are updated after recalculation.

**Example:**
- Original: Task A (04:00-05:00), Task B (05:00-06:00), Task C (06:00-07:00)
- After dragging C before A: Task C (04:00-05:00), Task A (05:00-06:00), Task B (06:00-07:00)
- The durations (60min each) remain unchanged, only the start times shift to maintain continuity.

### 8. Real-Time Status Highlighting

**Active Slot Detection**
- Compares current system time (minutes since midnight) against each slot's time range.
- Returns the index of the currently active slot, or `-1` if between activities.

**Highlighting Behavior**
- Current slot is highlighted with a pulsing gold border and icon scale.
- All prior slots are dimmed (opacity 0.35).
- "LIVE" indicator appears next to the active task title.

**Live Status Bar**
- Updates every 30 seconds with:
  - **Current activity** (or status message if none active)
  - **Current time** (12-hour format with AM/PM)

**Status Messages**
- Before schedule start (04:00): "Day hasn't started yet — ☕ relax"
- After schedule end (12:25+): "Morning block complete! 🎉"
- Between activities: "Between activities"

### 9. Audio Chimes

**Trigger**
- Plays when the active slot changes.
- 4-note ascending chime sequence (C5, E5, G5, C6) followed by a bell tone.

**Controls**
- Toggle button in bottom-right corner.
- State persisted in `soundEnabled` flag.
- Audio context created on first user interaction (browser policy compliance).

### 10. Import / Export

**Export**
- Generate JSON file with `slots` array.
- Filename: `daily-schedule.json`
- Triggers browser download.

**Import**
- Accepts `.json` or `.txt` files.
- Validates presence of `slots` array.
- Replaces current schedule.
- Triggers re-render and saves to localStorage.

### 11. UI Updates

**Total Duration & Task Count**
- Updated after any schedule modification.
- Displayed in footer.

**Notifications**
- Temporary toast messages in bottom-center.
- Types: `info`, `success` (green), `error` (red).
- Auto-dismiss after 3 seconds.

### 12. AI Field Regeneration

**Configuration**
- Config file: `.llm-config.json` (JSON format) in same directory as `index.html`
- Required fields:
  - `endpoint`: URL of OpenAI-compatible API endpoint (e.g., `https://api.openai.com/v1/chat/completions`)
  - `model`: Model name to use (e.g., `gpt-4o-mini`)
- Optional fields:
  - `apiKey`: API key for authentication (if required by endpoint)

**Config File Example:**
```json
{
  "endpoint": "https://api.openai.com/v1/chat/completions",
  "model": "gpt-4o-mini",
  "apiKey": "sk-..."
}
```

**Runtime Configuration**
- AI service can also be configured via browser console:
```javascript
window.llmService.setConfig({
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: 'sk-...'
});
```

**Prompt Strategy**
- AI receives all schedule titles in context
- AI is asked to generate: icon, theme, description for each title
- Themes must be: `study`, `break`, `exercise`, `leisure`, or `special`
- Icons must be 1-2 character emoji
- Descriptions must be 1 short, engaging sentence
- Response format: JSON object with titles as keys

**Error Handling**
- If config is missing: use default values, log info to console
- If API call fails: use default values, show error notification
- If JSON parsing fails: use default values, show error notification
- Network errors: handled gracefully, no UI disruption

**Visual Feedback**
- Show loading spinner during AI regeneration
- Show success message when complete: "AI regenerated N field(s)"
- Show info message if AI unavailable: "AI service unavailable, using defaults"
- Show error message if regeneration fails

---

## Data Persistence

| Storage Key | Contents | Type |
|-------------|----------|------|
| `dailySchedule` | `{"slots": [...]}` | JSON string |

---

## State Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `scheduleSlots` | Module | Current array of time-block objects |
| `isEditMode` | Module | Whether inline editing is active |
| `editingSlotId` | Module | ID of slot currently being edited (not actively used) |
| `lastActiveSlot` | Module | Index of previously active slot (for chime trigger) |
| `soundEnabled` | Module | Whether audio chimes are enabled |
| `audioCtx` | Module | Web AudioContext instance |

---

## Event Loop

| Interval | Action |
|----------|--------|
| 30 seconds | `highlightActiveSlot()` — recompute active slot and update highlighting |
| 1 minute | Update live time display only |

**Event Listeners**
- `dragstart` / `dragover` / `drop` — schedule reordering
- `click` / `touchstart` — initialize audio context
- File input — import schedule JSON

---

## Visual Styling

- **Theme Colors:**
  - Study: orange (`#f7971e`, `#ffd200`)
  - Break: cyan (`#4fc3f7`)
  - Exercise: green (`#a5d6a7`)
  - Leisure: purple (`#ce93d8`)
  - Special: red (`#ef9a9a`)
- **Background:** Dark gradient (`#0f0c29` → `#302b63` → `#24243e`)
- **Font:** Inter (Google Fonts)
- **Responsive:** Stacked layout on screens < 500px width
