import type { ToolOutput, ScheduleData } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';

interface ChatInterfaceProps {
  isVisible: boolean;
  scheduleData: ScheduleData;
  onScheduleChange?: (data: ScheduleData) => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  toolOutputs?: ToolOutput[];
}

export function ChatInterface({ isVisible, scheduleData, onScheduleChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
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
        body: JSON.stringify({
          prompt: userText,
          schedule: scheduleData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Failed to reach the LLM server. Is it running?' },
        ]);
      } else {
        if (data.schedule && onScheduleChange) {
          onScheduleChange(data.schedule);
        }
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.text, toolOutputs: data.toolOutputs },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Failed to reach the LLM server. Is it running?' },
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
    <div
      className="flex h-full flex-col rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid var(--border-subtle)`,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Schedule Assistant
        </h2>
        {messages.some((m) => m.toolOutputs?.length) && (
          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <button
              onClick={expandAll}
              className="text-xs hover:underline transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Expand all
            </button>
            <span className="mx-1" style={{ color: 'var(--border-medium)' }}>|</span>
            <button
              onClick={collapseAll}
              className="text-xs hover:underline transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ background: 'var(--bg-surface-hover)' }}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask the assistant to add, edit, or decorate your schedule
            </p>
          </div>
        )}

        {messages.map((msg, msgIndex) => (
          <div
            key={msgIndex}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[85%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: msg.role === 'user'
                  ? 'rgba(45, 42, 84, 0.06)'
                  : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: msg.role === 'assistant'
                  ? `1px solid var(--border-subtle)`
                  : 'none',
              }}
            >
              <p>{msg.text}</p>

              {/* Tool outputs */}
              {msg.toolOutputs && msg.toolOutputs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.toolOutputs.map((tool, toolIdx) => {
                    const isExpanded = expandedTools.has('all') || expandedTools.has(String(toolIdx));
                    return (
                      <div
                        key={toolIdx}
                        className="rounded-md border overflow-hidden"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <button
                          onClick={() => toggleTool(String(toolIdx))}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-[var(--bg-surface-hover)] transition-colors"
                        >
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                            style={{
                              background: 'rgba(45, 42, 84, 0.08)',
                              color: 'var(--accent-indigo)',
                            }}
                          >
                            {tool.tool}
                          </span>
                          <span
                            className="text-xs truncate max-w-[220px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {tool.command}
                          </span>
                          <span
                            className="ml-auto text-xs flex-shrink-0"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {isExpanded ? '\u25BE' : '\u25B8'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-2">
                            <div
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Command
                            </div>
                            <pre
                              className="text-xs font-mono rounded p-2 overflow-x-auto"
                              style={{
                                background: 'var(--bg-surface-hover)',
                                color: 'var(--text-secondary)',
                                border: `1px solid var(--border-subtle)`,
                              }}
                            >
                              {tool.command}
                            </pre>
                            <div
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Result
                            </div>
                            <pre
                              className="text-xs font-mono rounded p-2 overflow-x-auto"
                              style={{
                                background: 'rgba(124, 184, 154, 0.08)',
                                color: '#5a9a78',
                                border: `1px solid rgba(124, 184, 154, 0.2)`,
                              }}
                            >
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
            <div
              className="rounded-lg p-3"
              style={{
                background: 'var(--bg-surface)',
                border: `1px solid var(--border-subtle)`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: 'var(--accent-indigo)',
                    animationDelay: '0ms',
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: 'var(--accent-indigo)',
                    animationDelay: '150ms',
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: 'var(--accent-indigo)',
                    animationDelay: '300ms',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the assistant..."
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm chat-input transition-colors"
            style={{
              background: 'var(--bg-surface-hover)',
              color: 'var(--text-primary)',
              border: `1px solid var(--border-subtle)`,
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: loading || !input.trim()
                ? 'var(--bg-surface-hover)'
                : 'var(--accent-indigo)',
              color: loading || !input.trim()
                ? 'var(--text-muted)'
                : '#ffffff',
              cursor: loading || !input.trim()
                ? 'not-allowed'
                : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                (e.currentTarget as HTMLButtonElement).style.background = '#3d3a68';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && input.trim()) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-indigo)';
              }
            }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
