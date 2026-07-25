import { generateText, tool, isStepCount } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getModelInstance, clearConfigCache } from '@/lib/llm';
import * as schedule from '@/lib/schedule';
import { getApiKey } from '@/lib/keyring';
import type { ScheduleData, TimeBlock, ToolOutput } from '@/lib/types';

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly, helpful AI assistant that manages a daily time-blocked schedule.

## Capabilities
- Add new tasks to the schedule
- Delete existing tasks
- Reset the schedule to default tasks
- Delete ALL tasks (leaving an empty schedule)
- Get schedule details (IDs, times, titles, themes)
- Reorder tasks by arranging them into a new sequence
- Decorate tasks by assigning icons, descriptions, and themes
- Modify existing tasks (change title, duration, or start time)

## Tools
You have these tools available:
- **addTask**: Add a new task. Takes title, duration in minutes, and optional start time (hour + minute).
- **deleteTask**: Remove a task by its ID (e.g., 'slot-1').
- **resetTasks**: Reset the schedule back to the original default set of 15 tasks. Use this when the user says "reset schedule" or "restore defaults".
- **deleteAllTasks**: Delete ALL tasks from the schedule, leaving an empty schedule. Use this ONLY when the user explicitly says "delete all tasks", "clear the schedule", or "remove everything". This is different from resetTasks.
- **getScheduleDetails**: Get the current schedule details including all task IDs, titles, start/end times, durations, and themes. Call this FIRST before any delete or reorder operations to learn which tasks exist and their IDs.
- **reorderTasks**: Reorder all tasks. Provide an array of task IDs in the desired order.
- **decorateTasks**: Enrich all current tasks by assigning appropriate icons, descriptions, and themes. Use this when the user asks to "decorate", "add icons", "add descriptions", or "add themes" to their schedule.
- **modifyTask**: Update an existing task. Specify the taskId and any of: title, durationMin, startH, startM.

## Rules
- After any schedule-modifying tool call, always end your response with "Schedule updated successfully!"
- Use 12-hour time format when mentioning times (e.g., "8:00 AM", "2:30 PM").
- Tasks should have reasonable durations — typically 5 to 120 minutes.
- Be conversational and helpful. Explain what you changed in natural language.
- When deleting tasks, always call getScheduleDetails first to see the current tasks and their IDs.
- When the user wants to decorate their schedule, call decorateTasks immediately — it will analyze all current task titles and assign appropriate icons, descriptions, and themes.
- The schedule is always provided in the context. Use it to answer questions about current tasks.

## ⚠️ CRITICAL RULES — READ CAREFULLY
- NEVER call resetTasks unless the user EXPLICITLY says "reset the schedule", "restore defaults", or "start over"
- NEVER call resetTasks as part of add, delete, or reorder operations
- resetTasks should ONLY be called when the user explicitly wants to restore the original default schedule
- When adding tasks between existing tasks, calculate the correct start times based on the current schedule (use the end time of the preceding task)
- When deleting tasks, use deleteTask with the specific task ID — this removes only that one task, NOT resetTasks`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const addTaskTool = tool({
  description: 'Add a new task to the schedule. Before adding, ALWAYS call getScheduleDetails first to see the current schedule. Calculate the start time based on the user\'s request. If inserting between tasks, use the end time of the previous task as your start time. Recalculates all times after adding.',
  inputSchema: z.object({
    title: z.string().describe('The title/name of the task'),
    durationMin: z
      .number()
      .min(1)
      .max(480)
      .describe('Duration in minutes (1-480)'),
    startH: z.number().min(0).max(23).describe('Start hour (0-23)'),
    startM: z
      .number()
      .min(0)
      .max(59)
      .default(0)
      .describe('Start minutes (0-59)'),
  }),
  execute: async ({ title, durationMin, startH, startM }) => {
    const currentSchedule = schedule.loadSchedule();
    const endTime = startH * 60 + startM + durationMin;
    const endH = Math.floor(endTime / 60);
    const endM = endTime % 60;
    const newSlot: TimeBlock = {
      id: `slot-${Date.now()}`,
      startH,
      startM,
      endH,
      endM,
      title,
    };
    // Find the correct insertion position based on start time
    const startTotal = startH * 60 + startM;
    let insertIndex = currentSchedule.slots.length;
    for (let i = 0; i < currentSchedule.slots.length; i++) {
      const slotStartTotal = currentSchedule.slots[i].startH * 60 + currentSchedule.slots[i].startM;
      if (startTotal <= slotStartTotal) {
        insertIndex = i;
        break;
      }
    }
    const newSlots = [
      ...currentSchedule.slots.slice(0, insertIndex),
      newSlot,
      ...currentSchedule.slots.slice(insertIndex),
    ];
    const recalculated = schedule.recalculateTimes(newSlots);
    const updatedSchedule: ScheduleData = {
      ...currentSchedule,
      slots: recalculated,
    };
    schedule.saveSchedule(updatedSchedule);
    return { success: true, message: `Added "${title}" at ${schedule.formatTime12(startH, startM)}` };
  },
});

const deleteTaskTool = tool({
  description: 'Delete a task from the schedule by its ID',
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to delete (e.g., 'slot-1')"),
  }),
  execute: async ({ taskId }) => {
    const currentSchedule = schedule.loadSchedule();
    const remaining = currentSchedule.slots.filter((s) => s.id !== taskId);
    if (remaining.length === currentSchedule.slots.length) {
      return { success: false, message: `Task "${taskId}" not found` };
    }
    const recalculated = schedule.recalculateTimes(remaining);
    const updatedSchedule: ScheduleData = {
      ...currentSchedule,
      slots: recalculated,
    };
    schedule.saveSchedule(updatedSchedule);
    return { success: true, message: `Deleted task "${taskId}"` };
  },
});

// Tool: Get schedule details (LLM reads this to know slot IDs, times, titles)
const getScheduleDetailsTool = tool({
  description:
    'Get the current schedule details including all task IDs, titles, start/end times, durations, and themes. Call this first before any delete or reorder operations to learn which tasks exist.',
  inputSchema: z.object({}),
  execute: async () => {
    const currentSchedule = schedule.loadSchedule();
    const details = currentSchedule.slots
      .map((slot, index) => {
        const durationMin =
          (slot.endH * 60 + slot.endM) - (slot.startH * 60 + slot.startM);
        const hours = Math.floor(durationMin / 60);
        const mins = durationMin % 60;
        const badge =
          hours > 0
            ? mins > 0
              ? `${hours}h ${mins}min`
              : `${hours}h`
            : `${mins}min`;
        return `Slot ${
          index + 1
        } [ID: ${slot.id}]: "${slot.title}" at ${schedule.formatTime12(
          slot.startH,
          slot.startM,
        )} - ${schedule.formatTime12(slot.endH, slot.endM)} (${badge}, ${
          slot.theme || 'none'
        })${slot.desc ? ' - ' + slot.desc : ''}`;
      })
      .join('\n');

    return {
      success: true,
      message: `Schedule has ${currentSchedule.slots.length} tasks:\n\n${details}`,
      tasks: currentSchedule.slots.map((s) => ({
        id: s.id,
        title: s.title,
        startH: s.startH,
        startM: s.startM,
        endH: s.endH,
        endM: s.endM,
        theme: s.theme,
        durationMin: (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM),
      })),
    };
  },
});

// Tool: Reset to default schedule (renamed from deleteAllTasks)
const resetTasksTool = tool({
  description:
    '⚠️ CRITICAL: Only call this tool when the user EXPLICITLY says "reset the schedule", "restore defaults", or "start over". This tool restores the original 15 default tasks. DO NOT call this when adding, deleting, or reordering tasks. This should almost NEVER be called.',
  inputSchema: z.object({}),
  execute: async () => {
    const fresh = schedule.resetSchedule();
    schedule.setServerSchedule(fresh);
    return { success: true, message: 'Schedule reset to defaults' };
  },
});

// Tool: Delete ALL tasks (actual deletion, leaves empty schedule)
const deleteAllTasksTool = tool({
  description:
    'Delete ALL tasks from the schedule, leaving an empty schedule. This is different from resetTasks which restores the default tasks. Use this when the user says "delete all tasks" or "clear the schedule".',
  inputSchema: z.object({}),
  execute: async () => {
    const emptySchedule: ScheduleData = { slots: [] };
    schedule.setServerSchedule(emptySchedule);
    return { success: true, message: 'All tasks deleted' };
  },
});

const reorderTasksTool = tool({
  description: 'Reorder all tasks in the schedule. Provide task IDs in the desired order.',
  inputSchema: z.object({
    taskIds: z
      .array(z.string())
      .describe('Array of task IDs in the new order'),
  }),
  execute: async ({ taskIds }) => {
    const currentSchedule = schedule.loadSchedule();
    const idToSlot = new Map<string, TimeBlock>(currentSchedule.slots.map((s) => [s.id, s]));
    const orderedSlots = taskIds
      .map((id) => idToSlot.get(id))
      .filter((s): s is TimeBlock => s !== undefined);
    if (orderedSlots.length !== currentSchedule.slots.length) {
      return {
        success: false,
        message: `Could not find all requested task IDs. Found ${orderedSlots.length} of ${taskIds.length}.`,
      };
    }
    const recalculated = schedule.recalculateTimes(orderedSlots);
    const updatedSchedule: ScheduleData = {
      ...currentSchedule,
      slots: recalculated,
    };
    schedule.saveSchedule(updatedSchedule);
    return { success: true, message: `Reordered ${taskIds.length} tasks` };
  },
});

const decorateTasksTool = tool({
  description:
    'Enrich all current schedule tasks by assigning appropriate icons, descriptions, and themes. ' +
    'Call this when the user asks to "decorate", "add icons", "add descriptions", or "add themes" to their schedule.',
  inputSchema: z.object({}),
  execute: async () => {
    const currentSchedule = schedule.loadSchedule();
    const apiKey = (await getApiKey()) || 'omlx-om5hh4rsln2h3f8w';

    const prompt = `You are a schedule decorator. For each task below, assign an appropriate emoji icon, a brief description, and a theme. Respond with ONLY a JSON array (no markdown, no explanation) in this exact format:
[{"id":"slot-1","icon":"🧩","desc":"A short description of this activity","theme":"study"}]

Current tasks (with duration in minutes):
${currentSchedule.slots
  .map((s) => {
    const durMin = (s.endH * 60 + s.endM) - (s.startH * 60 + s.startM);
    return `  - ${s.id}: "${s.title}" (${durMin} min)`;
  })
  .join('\n')}

Themes to choose from: study, break, exercise, leisure, special`;

    let enriched: { id: string; icon: string; desc: string; theme: string }[];
    try {
      const response = await fetch('http://localhost:8080/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'Qwen3-Coder-Next-MLX-6bit',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `LLM API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as { choices: { message: { content: string } }[] };
      const text = data.choices[0]?.message.content ?? '';

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON found');
      enriched = JSON.parse(jsonMatch[0]);
    } catch {
      return {
        success: false,
        message: 'Failed to decorate tasks. Try again.',
      };
    }

    const updatedSlots = currentSchedule.slots.map((slot) => {
      const enrichment = enriched.find((e) => e.id === slot.id);
      if (!enrichment) return slot;

      const durMin = (slot.endH * 60 + slot.endM) - (slot.startH * 60 + slot.startM);
      const hours = Math.floor(durMin / 60);
      const mins = durMin % 60;
      const badge = hours > 0 ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`) : `${mins}min`;
      const badgeClass = `badge-${enrichment.theme}`;

      return {
        ...slot,
        icon: enrichment.icon,
        desc: enrichment.desc,
        theme: enrichment.theme as typeof slot.theme,
        badge,
        badgeClass,
      };
    });

    const updatedSchedule: ScheduleData = { ...currentSchedule, slots: updatedSlots };
    schedule.setServerSchedule(updatedSchedule);
    return {
      success: true,
      message: `Decorated ${enriched.length} tasks with icons, descriptions, and themes`,
    };
  },
});

const modifyTaskTool = tool({
  description: 'Modify an existing task (title, duration, or start time)',
  inputSchema: z.object({
    taskId: z.string().describe('The ID of the task to modify (e.g., "slot-1")'),
    title: z.string().optional().describe('New title for the task'),
    durationMin: z
      .number()
      .min(1)
      .max(480)
      .optional()
      .describe('New duration in minutes'),
    startH: z.number().min(0).max(23).optional().describe('New start hour (0-23)'),
    startM: z
      .number()
      .min(0)
      .max(59)
      .optional()
      .describe('New start minutes (0-59)'),
  }),
  execute: async ({ taskId, title, durationMin, startH, startM }) => {
    const currentSchedule = schedule.loadSchedule();
    const slotIndex = currentSchedule.slots.findIndex((s) => s.id === taskId);
    if (slotIndex === -1) {
      return { success: false, message: `Task "${taskId}" not found` };
    }

    const slot = currentSchedule.slots[slotIndex];

    if (title !== undefined) {
      slot.title = title;
    }
    if (startH !== undefined || startM !== undefined) {
      slot.startH = startH ?? slot.startH;
      slot.startM = startM ?? slot.startM;
    }

    if (durationMin !== undefined) {
      const currentDuration = slot.endH * 60 + slot.endM - (slot.startH * 60 + slot.startM);
      if (durationMin !== currentDuration) {
        // Directly calculate new end time from start + duration
        const startTotal = slot.startH * 60 + slot.startM;
        const endWrapped = (startTotal + durationMin) % 1440;
        slot.endH = Math.floor(endWrapped / 60);
        slot.endM = endWrapped % 60;

        // Recalculate subsequent slots to maintain continuous flow
        const updatedSlots = [...currentSchedule.slots];
        updatedSlots[slotIndex] = slot;
        const recalculated = schedule.recalculateTimes(updatedSlots);
        const updatedSchedule: ScheduleData = {
          ...currentSchedule,
          slots: recalculated,
        };
        schedule.saveSchedule(updatedSchedule);
        return {
          success: true,
          message: `Modified "${slot.title}" — duration changed to ${durationMin} minutes`,
        };
      }
    }

    // Recalculate end times since start may have shifted
    const recalculated = schedule.recalculateTimes(currentSchedule.slots);
    const updatedSchedule: ScheduleData = {
      ...currentSchedule,
      slots: recalculated,
    };
    schedule.saveSchedule(updatedSchedule);
    return {
      success: true,
      message: `Modified "${slot.title}"`,
    };
  },
});

const tools = {
  addTask: addTaskTool,
  deleteTask: deleteTaskTool,
  reorderTasks: reorderTasksTool,
  decorateTasks: decorateTasksTool,
  modifyTask: modifyTaskTool,
  getScheduleDetails: getScheduleDetailsTool,
  resetTasks: resetTasksTool,
  deleteAllTasks: deleteAllTasksTool,
};

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userPrompt: string = body.prompt;
    const providedSchedule: ScheduleData | undefined = body.schedule;

    const currentSchedule = providedSchedule ?? schedule.loadSchedule();

    // Initialize server-side schedule state for tool execution
    schedule.setServerSchedule(currentSchedule);

    // Get LLM provider (async — reads from keyring)
    const model = await getModelInstance();

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools,
      stopWhen: isStepCount(5),
    });

    // Map tool calls/results to flat output array
    const toolOutputs: ToolOutput[] = [];
    for (const tc of result.toolCalls ?? []) {
      const matchingResult = result.toolResults?.find(
        (tr) => tr.toolCallId === tc.toolCallId,
      );
      toolOutputs.push({
        tool: tc.toolName,
        command: JSON.stringify(tc.input),
        result: matchingResult ?? null,
      });
    }

    // Re-read the schedule AFTER tool execution to get the updated state
    const updatedSchedule = schedule.loadSchedule();

    // Clean up server schedule state and config cache for next request
    schedule.resetServerSchedule();
    clearConfigCache();

    return NextResponse.json({
      text: result.text,
      toolOutputs,
      schedule: updatedSchedule,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
