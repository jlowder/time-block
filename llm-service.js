// LLM Service for OpenAI-compatible endpoints
class LLMService {
  constructor() {
    this.config = null;
    this.configLoaded = false;
  }

  async loadConfig() {
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (!isFileProtocol) {
      try {
        const response = await fetch('.llm-config.json');
        if (response.ok) {
          this.config = await response.json();
          this.configLoaded = true;
          return;
        }
      } catch (error) {
        // Config file not found or blocked, continue to default
      }
    }
  }

  async generateScheduleFields(schedule) {
    if (!this.config || !this.configLoaded || !this.config.endpoint) {
      return null;
    }

    const titles = schedule.map(slot => `• ${slot.title}`).join('\n');

    const prompt = `Output a JSON array of objects for these schedule titles. Each object has: title (string), data object with icon (1-2 char emoji), theme (study/break/exercise/leisure/special), description (1 short sentence).

Output ONLY valid JSON array. No markdown, no explanations. Full JSON must be complete with all 16 items.

Titles:
${titles}`;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: 'Output ONLY valid JSON. Ensure the JSON is complete and well-formed.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.config.apiKey && this.config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      console.log('LLM Response length:', content.length);
      console.log('LLM Response start:', content.substring(0, 300));
      console.log('LLM Response end:', content.substring(content.length - 300));

      // Clean up thinking/reasoning blocks
      let jsonContent = content;
      
      // Remove thinking process prefixes
      jsonContent = jsonContent.replace(/Here's a thinking process:[\s\S]*?(?=\[|$)/i, '');
      jsonContent = jsonContent.replace(/Let me think about this:[\s\S]*?(?=\[|$)/i, '');
      jsonContent = jsonContent.replace(/Thought process:[\s\S]*?(?=\[|$)/i, '');
      
      // Remove markdown code blocks
      jsonContent = jsonContent.replace(/```(?:json)?/g, '');
      
      // Remove numbered list items that look like thinking
      jsonContent = jsonContent.replace(/^\d+\.\s*\*.*?\*:[\s\S]*?/gm, '');
      jsonContent = jsonContent.trim();

      // Try to parse as array of objects
      try {
        // Try direct parse first
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed)) {
          const result = {};
          parsed.forEach(item => {
            if (item.title && item.data) {
              result[item.title] = item.data;
            }
          });
          console.log('Parsed all', Object.keys(result).length, 'items');
          return result;
        }
        return parsed;
      } catch (e1) {
        console.warn('Direct parse failed:', e1.message);
      }

      // Try to extract complete JSON objects from array
      // Parse character by character to find complete objects
      let objectsFound = [];
      let braceDepth = 0;
      let bracketDepth = 0;
      let currentObj = '';
      
      for (let i = 0; i < jsonContent.length; i++) {
        const char = jsonContent[i];
        
        if (char === '[') {
          bracketDepth++;
        } else if (char === ']') {
          bracketDepth--;
          if (bracketDepth === 0 && braceDepth === 0) {
            break; // End of array
          }
        } else if (char === '{') {
          braceDepth++;
          currentObj += char;
        } else if (char === '}') {
          braceDepth--;
          currentObj += char;
          if (braceDepth === 0 && bracketDepth > 0) {
            // Complete object found
            try {
              const obj = JSON.parse(currentObj);
              if (obj.title && obj.data) {
                objectsFound.push(obj);
              }
            } catch (e) {
              // Incomplete object, skip
            }
            currentObj = '';
          } else {
            currentObj += char;
          }
        } else if (braceDepth > 0) {
          currentObj += char;
        }
      }
      
      if (objectsFound.length > 0) {
        const result = {};
        objectsFound.forEach(item => {
          result[item.title] = item.data;
        });
        console.log('Extracted', objectsFound.length, 'complete objects from', jsonContent.length, 'chars');
        return result;
      }
      
      // Try extracting complete array
      const arrayMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            const result = {};
            parsed.forEach(item => {
              if (item.title && item.data) {
                result[item.title] = item.data;
              }
            });
            return result;
          }
          return parsed;
        } catch (e2) {
          console.warn('Array extract failed:', e2.message);
        }
      }

      // Try object at end
      const lastObjectMatch = jsonContent.match(/\{[\s\S]*\}\s*$/);
      if (lastObjectMatch) {
        try {
          return JSON.parse(lastObjectMatch[0]);
        } catch (e3) {
          console.warn('Object extract failed:', e3.message);
        }
      }

      throw new Error(`Could not parse LLM response. Content: ${content.substring(0, 300)}...`);
    } catch (error) {
      console.error('Error generating schedule fields:', error);
      return null;
    }
  }

  // Interpret natural language chat command into structured action
  async interpretChatCommand(command, schedule) {
    if (!this.config || !this.configLoaded || !this.config.endpoint) {
      throw new Error('AI service is not configured');
    }

    const scheduleContext = schedule.map((slot, i) => 
      `${i + 1}. ${slot.title} (${this.formatTime(slot.startH, slot.startM)} - ${this.formatTime(slot.endH, slot.endM)}) - ${slot.theme}`
    ).join('\n');

    const systemPrompt = `You are a JSON-only API. Output NOTHING but a JSON object.

JSON schema:
{
  "action": "INSERT|DELETE|DELETE_ALL|MODIFY_DURATION|MOVE|SET_THEME|BULK_UPDATE|COMPOUND",
  "target": "task title or reference",
  "params": {},
  "confirmation": "Brief confirmation message"
}

Action details:
- INSERT: Add a single task. Use target for placement reference (e.g., "after:Exercise", "before:Lunch", or a time like "4:30 AM").
- DELETE: Remove one task by title.
- DELETE_ALL: Remove all tasks with "all" or "everything" in target.
- MODIFY_DURATION: Change one task's duration. Params: {"duration": "15 minutes"}.
- MOVE: Reposition a task. Params: {"to": "after:Exercise"}.
- SET_THEME: Change task theme. Params: {"theme": "study"}.
- BULK_UPDATE: Apply changes to multiple tasks at once.
  - For "SET_DURATION": Params: {"action": "SET_DURATION", "filter": "breaks"|"study"|"all", "duration": "10 minutes"}.
  - For "INSERT_AFTER": Insert tasks after each matching task. Params: {"action": "INSERT_AFTER", "filter": "breaks"|"study"|"all", "title": "Break", "duration": "5 minutes"}.
- COMPOUND: Execute multiple actions in one response. Use when the user request requires more than one operation that can't be combined into a single action. Params: {"subActions": [{"action": ..., "target": ..., "params": ...}, ...]}. Each subAction follows the same schema as the main object (minus the confirmation field).

Special cases:
- Inserting breaks between ALL tasks: Use BULK_UPDATE with action "INSERT_AFTER", filter "all".
- Inserting breaks before AND after a single task: Use COMPOUND with two INSERT subActions (one with "before:X", one with "after:X").
- Multiple unrelated operations: Use COMPOUND with multiple subActions.

Rules:
- ONLY output the JSON object
- NO natural language before, after, or around the JSON
- NO explanations
- NO thinking process
- NO markdown formatting
- The response must be parseable by JSON.parse()

Current schedule:
${scheduleContext}
`;

    const userPrompt = command;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    };

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.config.apiKey && this.config.apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Extract JSON object from content: strip everything before first { and after last }
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error(`No valid JSON found in LLM response: ${content.substring(0, 200).replace(/\n/g, ' ')}`);
      }
      
      const jsonStr = content.substring(firstBrace, lastBrace + 1);
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error(`Invalid JSON in LLM response: ${e.message}. Content: ${jsonStr.substring(0, 200).replace(/\n/g, ' ')}`);
      }
      
      console.log('Interpreted command:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error interpreting chat command:', error);
      throw error;
    }
  }

  // Format time as 12-hour string
  formatTime(h, m) {
    h = (h != null ? h : 0);
    m = (m != null ? m : 0);
    const minutes = String(m).padStart(2, '0');
    if (h === 0) return '12:' + minutes + ' AM';
    if (h === 12) return '12:' + minutes + ' PM';
    if (h > 12) return (h - 12) + ':' + minutes + ' PM';
    return h + ':' + minutes + ' AM';
  }

  isEnabled() {
    return this.configLoaded && this.config && this.config.endpoint;
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
    this.configLoaded = !!this.config.endpoint;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMService;
}
