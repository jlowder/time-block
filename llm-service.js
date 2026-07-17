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

    const systemPrompt = `You are a schedule management assistant that parses natural language commands into structured JSON actions.

Available actions:
1. INSERT - Add a new task. Target: "after:Title", "before:Title", or "TIME" (e.g., "4:30 AM")
2. DELETE - Remove a task. Target: task title or reference
3. MODIFY_DURATION - Change a task's duration. Target: task title
4. MOVE - Move a task. Target: task title, params.to: "after:X" or "before:X"
5. SET_THEME - Change a task's theme. Target: task title
6. BULK_UPDATE - Update multiple tasks. Params.filter: "breaks", "study", "exercise", "all"

Themes: study, break, exercise, leisure, special

Current schedule:
${scheduleContext}

Output ONLY valid JSON with this exact structure:
{
  "action": "INSERT|DELETE|MODIFY_DURATION|MOVE|SET_THEME|BULK_UPDATE",
  "target": "task title or reference",
  "params": { ... action-specific parameters },
  "confirmation": "Natural language explanation of what will be done"
}`;

    const userPrompt = command;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
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
      
      // Clean up response
      let jsonContent = content.replace(/```(?:json)?/g, '').trim();
      
      const parsed = JSON.parse(jsonContent);
      console.log('Interpreted command:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error interpreting chat command:', error);
      throw error;
    }
  }

  // Format time as 12-hour string
  formatTime(h, m) {
    const minutes = m.toString().padStart(2, '0');
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
