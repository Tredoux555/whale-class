'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SendHorizontal, Loader } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; success: boolean; result: unknown }
  | { type: 'confirmation_required'; confirmation_id: string; description: string; tool: string; input: Record<string, unknown> }
  | { type: 'error'; error: string }
  | { type: 'done' };

interface SuperAdminGuruProps {
  saToken: string;
}

export default function SuperAdminGuru({ saToken }: SuperAdminGuruProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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

      // Build the updated messages array BEFORE setting state
      // This avoids stale closure issues where messages in fetch body lag behind UI
      const updatedMessages = trimmedInput
        ? [...messages, { role: 'user' as const, content: trimmedInput }]
        : messages;

      // Add user message to UI
      if (trimmedInput) {
        setMessages(updatedMessages);
      }

      setInput('');
      setLoading(true);
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
        const toolCalls: ToolCallInfo[] = [];
        let buffer = '';

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
                // Live-update the assistant message as text streams in
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && !last.toolCalls?.length) {
                    // Update existing streaming message
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantContent },
                    ];
                  }
                  // Create new assistant message
                  return [...prev, { role: 'assistant', content: assistantContent }];
                });
              } else if (event.type === 'tool_call') {
                toolCalls.push({
                  name: event.tool,
                  input: event.input,
                });
              } else if (event.type === 'tool_result') {
                // Match result to the last tool call with this name
                const tc = [...toolCalls].reverse().find((t) => t.name === event.tool && t.success === undefined);
                if (tc) {
                  tc.success = event.success;
                  tc.result = event.result;
                }
              } else if (event.type === 'confirmation_required') {
                setConfirmationPending({
                  confirmation_id: event.confirmation_id,
                  description: event.description,
                  tool: event.tool,
                });
              } else if (event.type === 'error') {
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: `❌ Error: ${event.error}` },
                ]);
              } else if (event.type === 'done') {
                // Finalize — replace streaming message with final version including tool calls
                if (assistantContent || toolCalls.length > 0) {
                  setMessages((prev) => {
                    // Remove the streaming assistant message if present
                    const filtered = prev.filter(
                      (m, i) =>
                        !(
                          i === prev.length - 1 &&
                          m.role === 'assistant' &&
                          !m.toolCalls?.length
                        )
                    );
                    return [
                      ...filtered,
                      {
                        role: 'assistant',
                        content: assistantContent || '(No text response)',
                        toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
                      },
                    ];
                  });
                }
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
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `❌ Connection error: ${error.message}` },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [input, messages, saToken, buildApiMessages]
  );

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setLoading(false);
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
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

              {/* Tool execution cards */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
                  {msg.toolCalls.map((tc, j) => (
                    <div key={j} className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            tc.success === true
                              ? 'bg-emerald-400'
                              : tc.success === false
                              ? 'bg-red-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-mono font-bold">{tc.name}</span>
                      </div>
                      <details>
                        <summary className="cursor-pointer text-slate-300 hover:text-white">
                          Input ({Object.keys(tc.input).length} fields)
                          {tc.result !== undefined && ' + Result'}
                        </summary>
                        <pre className="mt-1 bg-black/30 p-2 rounded overflow-x-auto text-slate-400 max-h-48 overflow-y-auto">
                          {JSON.stringify(tc.input, null, 2)}
                        </pre>
                        {tc.result !== undefined && (
                          <pre className="mt-1 bg-black/30 p-2 rounded overflow-x-auto text-slate-400 max-h-48 overflow-y-auto">
                            {typeof tc.result === 'string'
                              ? tc.result
                              : JSON.stringify(tc.result, null, 2)}
                          </pre>
                        )}
                      </details>
                    </div>
                  ))}
                </div>
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

        {loading && (
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
