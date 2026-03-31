// /montree/admin/guru/page.tsx
// Principal Admin Guru — conversational AI copilot for school operations
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SendHorizontal, Loader, ChevronDown, ChevronRight } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinkingContent?: string;
  toolCalls?: ToolCallInfo[];
}

interface ToolCallInfo {
  name: string;
  label: string;
  input: Record<string, unknown>;
  success?: boolean;
  result?: unknown;
}

// SSE event types matching chat/route.ts output
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; success: boolean; result: unknown }
  | { type: 'error'; error: string }
  | { type: 'done' };

/** Map raw tool names to human-readable step labels */
function getToolLabel(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'query_school_data':
      return `Querying ${input.table || 'school data'}`;
    case 'query_school_stats':
      return `Calculating ${input.operation || 'stats'} on ${input.table || 'data'}`;
    case 'search_school':
      return `Searching for "${input.query || '...'}"`;
    case 'get_school_overview':
      return 'Loading school overview';
    case 'get_classroom_detail':
      return 'Loading classroom details';
    case 'get_student_detail':
      return 'Loading student details';
    case 'get_teacher_list':
      return 'Loading teacher list';
    case 'get_progress_summary':
      return 'Analyzing curriculum progress';
    case 'get_guru_usage':
      return 'Checking AI usage patterns';
    case 'get_parent_engagement':
      return 'Checking parent engagement';
    case 'get_media_summary':
      return 'Analyzing photo documentation';
    case 'toggle_school_feature':
      return `Toggling feature: ${input.feature_name || '...'}`;
    default:
      return name.replace(/_/g, ' ');
  }
}

/** Render markdown-ish text as React elements (bold, tables, bullet lists) */
function renderMarkdown(text: string) {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table (line with | chars, next line is separator)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?\s*[-:]+/.test(lines[i + 1])
    ) {
      // Collect all table lines
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse table
      const parseRow = (row: string) => {
        const cells = row.split('|').map((c) => c.trim());
        // Remove leading/trailing empty strings from outer pipes: |a|b|c| → ['','a','b','c','']
        if (cells.length > 0 && cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        return cells;
      };

      const headers = parseRow(tableLines[0]);
      const dataRows = tableLines.slice(2).map(parseRow);

      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th
                    key={hi}
                    className="border border-slate-600 bg-slate-800 px-2 py-1 text-left font-semibold text-slate-200"
                  >
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-slate-600 px-2 py-1 text-slate-300"
                    >
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet list items
    if (/^\s*[-*]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-1 space-y-0.5">
          {listItems.map((item, li) => (
            <li key={li}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Headings
    if (/^#{1,3}\s/.test(line)) {
      const level = (line.match(/^#+/) || [''])[0].length;
      const text = line.replace(/^#+\s+/, '');
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      const cls =
        level === 1
          ? 'text-base font-bold mt-3 mb-1'
          : level === 2
          ? 'text-sm font-bold mt-2 mb-1'
          : 'text-sm font-semibold mt-2 mb-0.5';
      elements.push(
        <Tag key={`h-${i}`} className={cls}>
          {renderInlineMarkdown(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={`p-${i}`} className="my-0.5">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

/** Render inline markdown: **bold**, `code` */
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code `text`
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find earliest match
    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity;

    if (boldIdx === Infinity && codeIdx === Infinity) {
      // No more matches
      parts.push(remaining);
      break;
    }

    if (boldIdx <= codeIdx && boldMatch) {
      if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (codeMatch) {
      if (codeIdx > 0) parts.push(remaining.slice(0, codeIdx));
      parts.push(
        <code
          key={key++}
          className="bg-black/30 px-1 rounded text-emerald-300 font-mono text-xs"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeIdx + codeMatch[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

export default function PrincipalAdminGuruPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [streamingDone, setStreamingDone] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Read school name from localStorage for display
    const schoolData = localStorage.getItem('montree_school');
    if (schoolData) {
      try {
        const s = JSON.parse(schoolData);
        setSchoolName(s.name || '');
      } catch {
        /* ignore */
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build Anthropic-compatible MessageParam array from our messages
  const buildApiMessages = useCallback(
    (
      currentMessages: Message[]
    ): Array<{ role: 'user' | 'assistant'; content: string }> => {
      return currentMessages
        .filter((m) => m.content.trim())
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput) return;

      // Build the updated messages array BEFORE setting state
      const updatedMessages = [
        ...messages,
        { role: 'user' as const, content: trimmedInput },
      ];

      setMessages(updatedMessages);
      setInput('');
      setLoading(true);
      setStreamingDone(false);
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/montree/admin/guru/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Send httpOnly cookie
          body: JSON.stringify({
            messages: buildApiMessages(updatedMessages),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errText = await response
            .text()
            .catch(() => response.statusText);
          throw new Error(`API error (${response.status}): ${errText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null — streaming not supported');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let thinkingContent = '';
        const toolCalls: ToolCallInfo[] = [];
        let buffer = '';

        try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep incomplete last line in buffer
          buffer = lines.pop() || '';

          const processLine = (line: string) => {
            if (!line.startsWith('data: ')) return;
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              if (event.type === 'text') {
                assistantContent += event.text;
                // Live-update the assistant message — always merge with existing assistant message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content: assistantContent,
                        thinkingContent: thinkingContent || undefined,
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content: assistantContent,
                      thinkingContent: thinkingContent || undefined,
                    },
                  ];
                });
              } else if (event.type === 'thinking') {
                thinkingContent += event.text;
                // Live-update thinking content while tools are running
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        thinkingContent,
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content: '',
                      thinkingContent,
                    },
                  ];
                });
              } else if (event.type === 'tool_call') {
                toolCalls.push({
                  name: event.tool,
                  label: getToolLabel(event.tool, event.input),
                  input: event.input,
                });
                // Live-update tool calls on the message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        toolCalls: [...toolCalls],
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content: '',
                      thinkingContent: thinkingContent || undefined,
                      toolCalls: [...toolCalls],
                    },
                  ];
                });
              } else if (event.type === 'tool_result') {
                // Match to the most recent unresolved tool call with the same name
                const tc = [...toolCalls]
                  .reverse()
                  .find(
                    (t) =>
                      t.name === event.tool &&
                      t.success === undefined
                  );
                if (tc) {
                  tc.success = event.success;
                  tc.result = event.result;
                }
                // Live-update with resolved tool result
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        toolCalls: [...toolCalls],
                      },
                    ];
                  }
                  return prev;
                });
              } else if (event.type === 'error') {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: `Error: ${event.error}`,
                  },
                ]);
              } else if (event.type === 'done') {
                setStreamingDone(true);
                // Finalize: merge all accumulated data into the existing assistant message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content:
                          assistantContent || last.content || '(No text response)',
                        thinkingContent:
                          thinkingContent || last.thinkingContent || undefined,
                        toolCalls:
                          toolCalls.length > 0
                            ? [...toolCalls]
                            : last.toolCalls || undefined,
                      },
                    ];
                  }
                  // No existing assistant message — create one
                  return [
                    ...prev,
                    {
                      role: 'assistant',
                      content:
                        assistantContent || '(No text response)',
                      thinkingContent: thinkingContent || undefined,
                      toolCalls:
                        toolCalls.length > 0
                          ? [...toolCalls]
                          : undefined,
                    },
                  ];
                });
              }
            } catch {
              // Ignore parse errors for incomplete JSON chunks
            }
          };

          for (const line of lines) {
            processLine(line);
          }
        }

        // Flush remaining buffer after stream ends
        if (buffer.trim()) {
          processLine(buffer);
        }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Connection error: ${error.message}`,
            },
          ]);
        }
      } finally {
        setLoading(false);
        setStreamingDone(true);
      }
    },
    [input, messages, buildApiMessages]
  );

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setStreamingDone(true);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            🧠 Admin Guru
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {schoolName
              ? `AI copilot for ${schoolName}`
              : 'School operations copilot'}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded font-medium"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-slate-400">
              <p className="text-lg font-medium mb-2">
                Welcome to Admin Guru
              </p>
              <p className="text-sm max-w-md">
                Ask me about your school&apos;s data — classrooms,
                teachers, students, progress, parent engagement, and
                more.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {[
                  'Give me an overview of my school',
                  'Which classrooms have the highest mastery rates?',
                  'Show me teachers who haven\'t logged in this week',
                  'How is parent engagement across classrooms?',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="text-left text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'user' ? (
              <div className="max-w-2xl rounded-lg p-3 bg-emerald-600 text-white">
                <p className="whitespace-pre-wrap text-sm">
                  {msg.content}
                </p>
              </div>
            ) : (
              <div className="max-w-2xl w-full space-y-2">
                {/* Tool execution steps — compact progress indicators */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                      Steps
                    </p>
                    {msg.toolCalls.map((tc, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-slate-400">
                        {tc.success === true ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] flex-shrink-0">✓</span>
                        ) : tc.success === false ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-[10px] flex-shrink-0">✗</span>
                        ) : (
                          <Loader className="w-3 h-3 animate-spin text-amber-400 flex-shrink-0" />
                        )}
                        <span>{tc.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thinking content — collapsible, de-emphasized */}
                {msg.thinkingContent && (
                  <ThinkingBlock
                    text={msg.thinkingContent}
                    isStreaming={!streamingDone && i === messages.length - 1 && !msg.content}
                  />
                )}

                {/* Main answer — prominent, rendered with markdown */}
                {msg.content && (
                  <div className="bg-slate-700 text-slate-100 rounded-lg p-4 text-sm">
                    {renderMarkdown(msg.content)}
                  </div>
                )}

                {/* If still loading and no content yet, show thinking indicator */}
                {!msg.content && !msg.thinkingContent && !msg.toolCalls?.length && (
                  <div className="bg-slate-700 text-slate-400 rounded-lg p-3 text-sm italic">
                    Preparing response...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-100 rounded-lg p-3 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Guru is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 bg-slate-800/50 backdrop-blur p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the Guru about your school..."
            disabled={loading}
            className="flex-1 bg-slate-700 text-white placeholder-slate-400 rounded-lg px-4 py-2 border border-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />
          {loading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <SendHorizontal className="w-4 h-4" />
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/** Collapsible thinking block — open while streaming, collapsed after */
function ThinkingBlock({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming) {
      setIsOpen(false);
    }
  }, [isStreaming]);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-400 bg-slate-800/30 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <span className="font-medium">Thinking</span>
        {isStreaming && (
          <Loader className="w-2.5 h-2.5 animate-spin ml-1" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 py-2 text-xs text-slate-500 italic whitespace-pre-wrap border-t border-slate-700/30">
          {text}
        </div>
      )}
    </div>
  );
}
