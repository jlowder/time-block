import type { ToolOutput, ScheduleData } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';

interface ChatInterfaceProps {
  isVisible: boolean;
  onScheduleChange?: (data: ScheduleData) => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  toolOutputs?: ToolOutput[];
}

export function ChatInterface({ isVisible, onScheduleChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (isVisible) {
      textareaRef.current?.focus();
    }
  }, [isVisible]);

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTools(new Set(['all']));
  };

  const collapseAll = () => {
    setExpandedTools(new Set());
  };

  const send = async () => {
    if (loading || !input.trim()) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: '❌ Failed to reach the LLM server. Is it running?',
          },
        ]);
      } else {
        // Update parent state if schedule was modified
        if (data.schedule && onScheduleChange) {
          onScheduleChange(data.schedule);
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.text,
            toolOutputs: data.toolOutputs,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '❌ Failed to reach the LLM server. Is it running?',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex h-full flex-col bg-gray-900/80 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">🤖 Schedule Assistant</h2>
        {messages.some((m) => m.toolOutputs?.length) && (
          <div className="flex gap-2 text-xs text-gray-400">
            <button onClick={expandAll} className="hover:text-white transition-colors">
              Expand all
            </button>
            <span className="text-gray-600">|</span>
            <button onClick={collapseAll} className="hover:text-white transition-colors">
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <p>Ask the assistant to add, edit, or decorate your schedule!</p>
          </div>
        )}

        {messages.map((msg, msgIndex) => (
          <div
            key={msgIndex}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {/* Tool outputs */}
              {msg.toolOutputs && msg.toolOutputs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.toolOutputs.map((tool, toolIdx) => {
                    const isExpanded = expandedTools.has('all') || expandedTools.has(String(toolIdx));
                    return (
                      <div
                        key={toolIdx}
                        className="rounded-md border border-white/10 bg-black/30 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleTool(String(toolIdx))}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            {tool.tool}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                            {tool.command}
                          </span>
                          <span className="ml-auto text-gray-500 text-xs">
                            {isExpanded ? '▾' : '▸'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-2 space-y-1">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Command</div>
                            <pre className="text-[11px] text-gray-300 font-mono bg-black/40 rounded p-2 overflow-x-auto">
                              {tool.command}
                            </pre>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-2">Result</div>
                            <pre className="text-[11px] text-green-400 font-mono bg-green-500/5 rounded p-2 overflow-x-auto">
                              {typeof tool.result === 'string'
                                ? tool.result
                                : JSON.stringify(tool.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the assistant..."
            rows={1}
            className="flex-1 resize-none rounded-l-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 h-12"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 rounded-r-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 text-sm font-medium text-white transition-colors"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
