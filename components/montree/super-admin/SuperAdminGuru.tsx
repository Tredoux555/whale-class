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
  input: Record<string, unknown>;
  success?: boolean;
  result?: unknown;
}

// SSE event types matching route.ts output
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; success: boolean; result: unknown }
  | { type: 'confirmation_required'; confirmation_id: string; description: string; tool: string; input: Record<string, unknown> }
  | { type: 'error'; error: string }
  | { type: 'done' };

interface SuperAdminGuruProps {
  saToken: string;
}

// ---------------------------------------------------------------------------
// Human-readable tool labels
// ---------------------------------------------------------------------------
function getToolLabel(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'query_table':
      return `Querying ${input.table_name || 'table'}`;
    case 'query_stats':
      return `Running stats on ${input.table_name || 'table'}`;
    case 'query_custom':
      return `Running ${input.query_name || 'custom query'}`;
    case 'search_across_tables':
      return `Searching for "${input.search_term || '...'}"`;
    case 'get_system_health':
      return 'Checking system health';
    case 'get_school_detail':
      return 'Getting school details';
    case 'get_audit_log':
      return 'Reviewing audit log';
    case 'delete_school':
      return 'Deleting school (requires confirmation)';
    case 'update_school_settings':
      return 'Updating school settings';
    case 'toggle_feature':
      return `Toggling feature: ${input.feature_name || '...'}`;
    case 'manage_lead':
      return 'Managing lead';
    case 'get_lead_overview':
      return 'Getting lead overview';
    case 'draft_email':
      return 'Drafting email';
    case 'get_campaign_stats':
      return 'Getting campaign stats';
    case 'run_named_query':
      return `Running: ${input.query_name || 'named query'}`;
    default:
      return name.replace(/_/g, ' ');
  }
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** and `code`
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={`b${keyIdx++}`} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<code key={`c${keyIdx++}`} className="bg-black/30 px-1 py-0.5 rounded text-emerald-300 text-xs">{match[3]}</code>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tables: detect header row followed by separator
    if (
      i + 1 < lines.length &&
      line.includes('|') &&
      lines[i + 1].includes('|') &&
      lines[i + 1].replace(/[|\s:-]/g, '') === ''
    ) {
      const parseRow = (row: string) => {
        const cells = row.split('|').map((c) => c.trim());
        if (cells.length > 0 && cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        return cells;
      };
      const headers = parseRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      elements.push(
        <div key={`tbl${i}`} className="overflow-x-auto my-3">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left px-3 py-1.5 font-semibold text-slate-200">
                    {renderInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-700/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-slate-300">
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

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(<h4 key={`h4${i}`} className="font-semibold text-slate-200 mt-3 mb-1 text-sm">{renderInlineMarkdown(line.slice(5))}</h4>);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3${i}`} className="font-semibold text-white mt-3 mb-1 text-base">{renderInlineMarkdown(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2${i}`} className="font-bold text-white mt-4 mb-2 text-lg">{renderInlineMarkdown(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1${i}`} className="font-bold text-white mt-4 mb-2 text-xl">{renderInlineMarkdown(line.slice(2))}</h1>);
      i++;
      continue;
    }

    // Bullet lists
    if (line.match(/^[\s]*[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s/)) {
        items.push(lines[i].replace(/^[\s]*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul${i}`} className="list-disc list-inside my-2 space-y-1 text-slate-300">
          {items.map((item, ii) => (
            <li key={ii}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered lists
    if (line.match(/^[\s]*\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s/)) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol${i}`} className="list-decimal list-inside my-2 space-y-1 text-slate-300">
          {items.map((item, ii) => (
            <li key={ii}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraphs
    elements.push(
      <p key={`p${i}`} className="text-slate-200 my-1.5 leading-relaxed">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ---------------------------------------------------------------------------
// ThinkingBlock component
// ---------------------------------------------------------------------------
function ThinkingBlock({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!isStreaming) {
      setIsOpen(false);
    }
  }, [isStreaming]);

  if (!content || !content.trim()) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>{isStreaming ? 'Thinking...' : 'Thinking'}</span>
        {isStreaming && (
          <Loader className="w-3 h-3 animate-spin ml-1" />
        )}
      </button>
      {isOpen && (
        <div className="mt-1.5 pl-5 text-xs text-slate-400 whitespace-pre-wrap border-l-2 border-slate-700 leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SuperAdminGuru({ saToken }: SuperAdminGuruProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingDone, setStreamingDone] = useState(true);
  const [confirmationPending, setConfirmationPending] = useState<{
    confirmation_id: string;
    description: string;
    tool: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build Anthropic-compatible MessageParam array from our messages
  const buildApiMessages = useCallback(
    (currentMessages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> => {
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
    async (e: React.FormEvent, confirmationId?: string) => {
      e.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput && !confirmationId) return;

      const updatedMessages = trimmedInput
        ? [...messages, { role: 'user' as const, content: trimmedInput }]
        : messages;

      if (trimmedInput) {
        setMessages(updatedMessages);
      }

      setInput('');
      setLoading(true);
      setStreamingDone(false);
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/montree/super-admin/guru', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-super-admin-token': saToken,
          },
          body: JSON.stringify({
            messages: buildApiMessages(updatedMessages),
            confirmation_id: confirmationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText);
          throw new Error(`API error (${response.status}): ${errText}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let thinkingContent = '';
        const toolCalls: ToolCallInfo[] = [];
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const processLine = (line: string) => {
            if (!line.startsWith('data: ')) return;
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              if (event.type === 'thinking') {
                thinkingContent += event.text;
                // Update existing assistant message or create new one
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, thinkingContent },
                    ];
                  }
                  return [
                    ...prev,
                    { role: 'assistant', content: '', thinkingContent },
                  ];
                });
              } else if (event.type === 'text') {
                assistantContent += event.text;
                // Always merge with existing assistant message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content: assistantContent,
                        thinkingContent: thinkingContent || last.thinkingContent || undefined,
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
              } else if (event.type === 'tool_call') {
                toolCalls.push({
                  name: event.tool,
                  input: event.input,
                });
                // Show tool call in message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, toolCalls: [...toolCalls] },
                    ];
                  }
                  return [
                    ...prev,
                    { role: 'assistant', content: '', toolCalls: [...toolCalls] },
                  ];
                });
              } else if (event.type === 'tool_result') {
                const tc = [...toolCalls].reverse().find((t) => t.name === event.tool && t.success === undefined);
                if (tc) {
                  tc.success = event.success;
                  tc.result = event.result;
                }
                // Update tool calls in message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, toolCalls: [...toolCalls] },
                    ];
                  }
                  return prev;
                });
              } else if (event.type === 'confirmation_required') {
                setConfirmationPending({
                  confirmation_id: event.confirmation_id,
                  description: event.description,
                  tool: event.tool,
                });
              } else if (event.type === 'error') {
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: (last.content || '') + `\n\n❌ Error: ${event.error}` },
                    ];
                  }
                  return [...prev, { role: 'assistant', content: `❌ Error: ${event.error}` }];
                });
              } else if (event.type === 'done') {
                setStreamingDone(true);
                // Merge all accumulated data into final message
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content: assistantContent || last.content || '(No text response)',
                        thinkingContent: thinkingContent || last.thinkingContent || undefined,
                        toolCalls: toolCalls.length > 0 ? [...toolCalls] : last.toolCalls || undefined,
                      },
                    ];
                  }
                  if (assistantContent || toolCalls.length > 0) {
                    return [
                      ...prev,
                      {
                        role: 'assistant',
                        content: assistantContent || '(No text response)',
                        thinkingContent: thinkingContent || undefined,
                        toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
                      },
                    ];
                  }
                  return prev;
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

        // Flush remaining buffer
        if (buffer.trim()) {
          processLine(buffer);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `❌ Connection error: ${error.message}` },
          ]);
        }
      } finally {
        setLoading(false);
        setStreamingDone(true);
      }
    },
    [input, messages, saToken, buildApiMessages]
  );

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setStreamingDone(true);
  };

  const handleClearChat = () => {
    setMessages([]);
    setConfirmationPending(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🧠 Super-Admin Guru</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-access AI copilot for platform operations
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
              <p className="text-lg font-medium mb-2">Welcome to Super-Admin Guru</p>
              <p className="text-sm max-w-md">
                Ask me to query schools, manage classrooms, analyze usage, run
                outreach campaigns, or perform platform operations.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {[
                  'Show all schools with their student counts',
                  'What are the total API costs this month?',
                  'List recent visitor activity from China',
                  'Show me the audit log for today',
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
            <div
              className={`max-w-2xl rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <>
                  {/* Tool steps — compact progress indicators */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {msg.toolCalls.map((tc, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs text-slate-300">
                          {tc.success === true ? (
                            <span className="text-emerald-400">✓</span>
                          ) : tc.success === false ? (
                            <span className="text-red-400">✗</span>
                          ) : (
                            <Loader className="w-3 h-3 animate-spin text-slate-400" />
                          )}
                          <span>{getToolLabel(tc.name, tc.input)}</span>
                          {tc.result !== undefined && (
                            <details className="inline">
                              <summary className="cursor-pointer text-slate-500 hover:text-slate-400 ml-1">
                                details
                              </summary>
                              <pre className="mt-1 bg-black/30 p-2 rounded overflow-x-auto text-slate-400 max-h-32 overflow-y-auto text-[11px]">
                                {typeof tc.result === 'string'
                                  ? tc.result
                                  : JSON.stringify(tc.result, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thinking block — collapsible */}
                  {msg.thinkingContent && (
                    <ThinkingBlock
                      content={msg.thinkingContent}
                      isStreaming={!streamingDone && i === messages.length - 1}
                    />
                  )}

                  {/* Answer — rendered with markdown */}
                  {msg.content ? (
                    <div className="text-sm">
                      {renderMarkdown(msg.content)}
                    </div>
                  ) : (
                    // Fallback while streaming
                    !streamingDone && i === messages.length - 1 && !msg.thinkingContent && !msg.toolCalls?.length && (
                      <span className="text-sm text-slate-400">Preparing response...</span>
                    )
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Confirmation modal */}
        {confirmationPending && (
          <div className="border-l-4 border-amber-500 bg-amber-500/10 p-4 rounded my-4">
            <h3 className="font-bold text-amber-100 mb-2">⚠️ Confirmation Required</h3>
            <p className="text-sm text-amber-50 mb-4">{confirmationPending.description}</p>
            <div className="flex gap-2">
              <button
                onClick={(e) =>
                  handleSubmit(e, confirmationPending.confirmation_id)
                }
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded font-medium disabled:opacity-50"
              >
                Confirm & Execute
              </button>
              <button
                onClick={() => setConfirmationPending(null)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && !messages.some((m, idx) => idx === messages.length - 1 && m.role === 'assistant') && (
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
            placeholder="Ask the Guru..."
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
