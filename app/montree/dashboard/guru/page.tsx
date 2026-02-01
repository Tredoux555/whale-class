// /montree/dashboard/guru/page.tsx
// Montessori Guru - AI Assistant for Teachers
// Philosophy: Complexity absorbed, simplicity delivered
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession, type MontreeSession } from '@/lib/montree/auth';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

interface ActionItem {
  priority: number;
  action: string;
  details: string;
}

interface GuruResponse {
  success: boolean;
  insight?: string;
  root_cause?: string;
  action_plan?: ActionItem[];
  timeline?: string;
  parent_talking_point?: string;
  sources_used?: string[];
  interaction_id?: string;
  error?: string;
}

interface PastInteraction {
  id: string;
  asked_at: string;
  question: string;
  response_insight: string;
  outcome?: string;
}

function GuruContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChildId = searchParams.get('child');

  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [response, setResponse] = useState<GuruResponse | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [history, setHistory] = useState<PastInteraction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session and children
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    fetch(`/api/montree/children?classroom_id=${sess.classroom?.id}`)
      .then(r => r.json())
      .then(data => {
        const kids = data.children || [];
        setChildren(kids);

        // If child preselected via URL, use that
        if (preselectedChildId) {
          const preselected = kids.find((c: Child) => c.id === preselectedChildId);
          if (preselected) {
            setSelectedChild(preselected);
          }
        }

        setPageLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load students');
        setPageLoading(false);
      });
  }, [router, preselectedChildId]);

  // Load history when child changes
  useEffect(() => {
    if (!selectedChild) {
      setHistory([]);
      return;
    }

    fetch(`/api/montree/guru?child_id=${selectedChild.id}&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setHistory(data.history || []);
        }
      })
      .catch(() => {
        // Silently fail - history is optional
      });
  }, [selectedChild?.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  const handleSubmit = async () => {
    if (!selectedChild || !question.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setStreamingText('');

    try {
      if (useStreaming) {
        // Streaming mode
        const res = await fetch('/api/montree/guru/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: selectedChild.id,
            question: question.trim(),
            classroom_id: session?.classroom?.id,
          }),
        });

        if (!res.ok) {
          throw new Error('Stream failed');
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sourcesUsed: string[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'text') {
                    fullText += data.content;
                    setStreamingText(fullText);
                  } else if (data.type === 'done') {
                    sourcesUsed = data.sources_used || [];
                  } else if (data.type === 'error') {
                    toast.error(data.message);
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        // Set final response as raw text
        setResponse({
          success: true,
          insight: fullText,
          sources_used: sourcesUsed,
        });

      } else {
        // Non-streaming mode (fallback)
        const res = await fetch('/api/montree/guru', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: selectedChild.id,
            question: question.trim(),
            classroom_id: session?.classroom?.id,
          }),
        });

        const data: GuruResponse = await res.json();

        if (data.success) {
          setResponse(data);
        } else {
          toast.error(data.error || 'Failed to get response');
        }
      }

      // Refresh history
      const histRes = await fetch(`/api/montree/guru?child_id=${selectedChild.id}&limit=5`);
      const histData = await histRes.json();
      if (histData.success) {
        setHistory(histData.history || []);
      }

    } catch (error) {
      toast.error('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyParentTalkingPoint = () => {
    if (response?.parent_talking_point) {
      navigator.clipboard.writeText(response.parent_talking_point);
      toast.success('Copied to clipboard!');
    }
  };

  if (pageLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🔮</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/montree/dashboard"
            className="p-2 -ml-2 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
          >
            <span className="text-lg">←</span>
          </Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <span>🔮</span> Montessori Guru
            </h1>
            <p className="text-xs text-violet-200">AI-powered insights for your classroom</p>
          </div>
        </div>

        {selectedChild && history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 active:scale-95 transition-all"
            title="Past conversations"
          >
            <span className="text-lg">📜</span>
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-32">
        {/* Child Selector */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Which child do you need help with?
          </label>
          <select
            value={selectedChild?.id || ''}
            onChange={(e) => {
              const child = children.find(c => c.id === e.target.value);
              setSelectedChild(child || null);
              setResponse(null);
              setShowHistory(false);
            }}
            className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-800"
          >
            <option value="">Select a child...</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span>📜</span> Past Questions for {selectedChild?.name?.split(' ')[0]}
            </h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <p className="text-sm text-gray-600 mb-1">
                    {new Date(item.asked_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {item.question}
                  </p>
                  {item.outcome && (
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
                      item.outcome === 'improved' ? 'bg-green-100 text-green-700' :
                      item.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.outcome}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Input */}
        {selectedChild && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              What would you like help with for {selectedChild.name.split(' ')[0]}?
            </label>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Rachel can't seem to focus lately. She wanders around the classroom and won't settle into work. What should I do?"
              className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-800 placeholder:text-gray-400 resize-none min-h-[100px]"
              rows={3}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">
                {question.length}/1000
              </span>
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || loading || question.length > 1000}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:from-violet-600 hover:to-indigo-700
                         active:scale-95 transition-all
                         flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">🔮</span>
                    Thinking...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Ask Guru
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading State / Streaming Display */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            {streamingText ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg animate-pulse">🔮</span>
                  <span className="text-sm text-violet-600">Writing...</span>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="animate-pulse">▊</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-4 animate-pulse">🔮</div>
                <p className="text-gray-600 font-medium">Gathering insights...</p>
                <p className="text-sm text-gray-400 mt-2">
                  Analyzing {selectedChild?.name.split(' ')[0]}&apos;s profile and Montessori wisdom
                </p>
              </div>
            )}
          </div>
        )}

        {/* Response Display */}
        {response?.success && (
          <div className="space-y-4">
            {/* Insight */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-bold text-violet-700 mb-2 flex items-center gap-2">
                <span>💡</span> Insight
              </h3>
              <p className="text-gray-700 leading-relaxed">{response.insight}</p>
            </div>

            {/* Root Cause */}
            {response.root_cause && (
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                <h3 className="font-medium text-violet-700 mb-1 text-sm">Root Cause</h3>
                <p className="text-gray-700">{response.root_cause}</p>
              </div>
            )}

            {/* Action Plan */}
            {response.action_plan && response.action_plan.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-bold text-indigo-700 mb-3 flex items-center gap-2">
                  <span>📋</span> This Week&apos;s Plan
                </h3>
                <div className="space-y-3">
                  {response.action_plan.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
                        {item.priority}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{item.action}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {response.timeline && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center gap-3">
                <span className="text-2xl">⏰</span>
                <div>
                  <h3 className="font-medium text-amber-700 text-sm">Expected Timeline</h3>
                  <p className="text-gray-700">{response.timeline}</p>
                </div>
              </div>
            )}

            {/* Parent Talking Point */}
            {response.parent_talking_point && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <h3 className="font-medium text-green-700 text-sm">Parent Talking Point</h3>
                      <p className="text-gray-700 mt-1">&ldquo;{response.parent_talking_point}&rdquo;</p>
                    </div>
                  </div>
                  <button
                    onClick={copyParentTalkingPoint}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}

            {/* Sources */}
            {response.sources_used && response.sources_used.length > 0 && (
              <div className="text-center text-sm text-gray-400 py-2">
                Based on: {response.sources_used.map(s =>
                  s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                ).join(', ')}
              </div>
            )}

            {/* New Question Button */}
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setQuestion('');
                  setResponse(null);
                  textareaRef.current?.focus();
                }}
                className="px-6 py-2 text-violet-600 font-medium hover:bg-violet-50 rounded-lg transition-colors"
              >
                Ask Another Question
              </button>
            </div>
          </div>
        )}

        {/* Quick Questions (when no child selected or no response yet) */}
        {selectedChild && !response && !loading && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Common questions</h3>
            <div className="space-y-2">
              {[
                `${selectedChild.name.split(' ')[0]} can't focus and wanders around. What should I do?`,
                `${selectedChild.name.split(' ')[0]} is having trouble with social interactions.`,
                `How can I help ${selectedChild.name.split(' ')[0]} choose work independently?`,
                `${selectedChild.name.split(' ')[0]} seems frustrated and gets upset easily.`,
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-violet-50 text-gray-700 hover:text-violet-700 text-sm transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt when no child selected */}
        {!selectedChild && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">👆</div>
            <p className="text-gray-600">Select a child above to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function GuruPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🔮</div>
      </div>
    }>
      <GuruContent />
    </Suspense>
  );
}
