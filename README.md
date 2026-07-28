# Time Block

String together some activities to create a time-blocked schedule. AI features let you do it with natural language.

# Background

I am prone to picking up things that I want to do each day. Various books, study guides, and online courses - it's easy to imagine that you
can find 15 minutes a day for them. But after a while, these things tend to fade away unless you actively make time for them. This is
the tool to do that.

## What it does

Time Block lets you plan a sequence of time-blocked activities. You set start times, give each block a title, and the app keeps the rest flowing.

**Edit mode** is where you build. Add blocks through a chatbot interface - local LLMs work great - or drag cards to reorder them. Turn off edit mode and the LLM fills in icons, descriptions, and color themes for each block.

**View mode** let the activities play out: the active block glows gold, past blocks fade. A status bar shows what you're doing now and how much time is left. An audio chime plays when you switch blocks.

You can export a schedule as JSON, import it back later, or publish a self-contained HTML file that runs on any phone or tablet with no server needed.

## Getting started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

| Feature | How to use |
|---------|------------|
| **Chat-based scheduling** | Toggle Edit mode, then type "Add a 30 minute workout at 7am" |
| **Drag-and-drop reordering** | Toggle Edit mode, grab a card and move it |
| **Auto-decoration** | Toggle off Edit mode to trigger the LLM to fill icons, themes, descriptions |
| **Live highlighting** | View mode highlights the current block in gold, dims the rest |
| **Audio chimes** | Toggle sound in the toolbar. Plays on block transitions |
| **Import/Export** | JSON files with `slots` array. `daily-schedule.json` |
| **Publish** | Generates a single `schedule.html` file that runs standalone in any browser |
| **Settings** | Configure LLM endpoint, model, and API key |

## Chatbot Task Examples

You can tell it what you want in natural language. If you "add" a task, it needs to know what time it should start. If you "append" a
task, it always goes at the end. Otherwise you can insert tasks relative to other ones.

o Delete all tasks
o Add a 30 minute workout at 7am
o Append a task called "Read Quantum Programming book" for 15 minutes
o Insert a 5 minute break between all reading tasks
o Delete all tasks that relate to eating
o Change all breaks to be 4 minutes instead of 5
o Insert a walk for 10 mins after Lunch

## License

MIT
