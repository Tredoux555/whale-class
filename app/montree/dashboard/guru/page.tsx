// /montree/dashboard/guru/page.tsx
// Montessori Guru - AI Assistant for Teachers & Homeschool Parents
// Philosophy: Complexity absorbed, simplicity delivered
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import FeatureWrapper from '@/components/montree/onboarding/FeatureWrapper';
import GuruChatThread from '@/components/montree/guru/GuruChatThread';


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

interface GuruStatus {
  guru_access: 'unlimited' | 'paid' | 'free_trial';
  prompts_used?: number;
  prompts_limit?: number;
  prompts_remaining?: number | null;
  is_locked?: boolean;
}

function GuruContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedChildId = searchParams.get('child');
  const upgradeResult = searchParams.get('upgrade');

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
  const [useStreaming, setUseStreaming] = useState(false); // Disabled until stream route fixed
  const [guruStatus, setGuruStatus] = useState<GuruStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session, children, and guru status
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Show upgrade result toast
    if (upgradeResult === 'success') {
      toast.success('Welcome to Guru! You now have unlimited access.');
    } else if (upgradeResult === 'cancel') {
      toast('Upgrade cancelled. You still have free prompts available.');
    }

    // Fetch children
    fetch(`/api/montree/children?classroom_id=${sess.classroom?.id}`)
      .then(r => r.json())
      .then(data => {
        const kids = data.children || [];
        setChildren(kids);

        if (preselectedChildId) {
          const preselected = kids.find((c: Child) => c.id === preselectedChildId);
          if (preselected) {
            setSelectedChild(preselected);
          }
        }

        setPageLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load');
        setPageLoading(false);
      });

    // Fetch guru status for homeschool parents
    if (isHomeschoolParent(sess)) {
      fetch('/api/montree/guru/status')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setGuruStatus(data);
            if (data.is_locked) {
              setShowPaywall(true);
            }
          }
        })
        .catch(() => {
          // Non-critical — allow usage
        });
    }
  }, [router, preselectedChildId, upgradeResult]);

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

        const data = await res.json();

        if (data.success) {
          setResponse(data);
          // Update local guru status after successful prompt
          if (guruStatus && guruStatus.guru_access === 'free_trial' && guruStatus.prompts_remaining) {
            setGuruStatus({
              ...guruStatus,
              prompts_used: (guruStatus.prompts_used || 0) + 1,
              prompts_remaining: guruStatus.prompts_remaining - 1,
              is_locked: guruStatus.prompts_remaining - 1 <= 0,
            });
          }
        } else if (data.error === 'guru_limit_reached') {
          // Freemium limit hit — show paywall
          setShowPaywall(true);
          if (guruStatus) {
            setGuruStatus({ ...guruStatus, is_locked: true, prompts_remaining: 0 });
          }
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

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/montree/guru/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('Could not start checkout. Please try again.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isParent = isHomeschoolParent(session);
  const guruEmoji = isParent ? HOME_THEME.guruIcon : HOME_THEME.guruIconTeacher;

  if (pageLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isParent ? HOME_THEME.pageBg : 'bg-gradient-to-br from-violet-50 to-indigo-50'}`}>
        <div className="animate-bounce text-4xl">{guruEmoji}</div>
      </div>
    );
  }

  // ─── PARENT CHAT UI ───────────────────────────────────────
  // Homeschool parents get the WhatsApp-style chat thread instead of structured Q&A
  if (isParent) {
    // Auto-select first child for parents (they typically have 1-3 kids)
    const activeChild = selectedChild || children[0];

    return (
      <div className="h-screen flex flex-col">
        <Toaster position="top-center" />

        {/* Paywall Modal */}
        {showPaywall && guruStatus?.is_locked && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Unlock Montessori Guru</h2>
              <p className="text-gray-600 mb-4">
                You&apos;ve used your 3 free sessions. Upgrade to get unlimited Guru advice for all your children.
              </p>
              <div className="rounded-xl p-4 mb-5 bg-[#F5E6D3]/60">
                <div className="text-3xl font-bold text-[#0D3330]">$5<span className="text-base font-normal text-[#0D3330]/60">/month per child</span></div>
                <div className="text-sm mt-1 text-[#0D3330]/70">Unlimited questions &bull; Cancel anytime</div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className={`w-full py-3 text-white font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50 ${HOME_THEME.primaryBtn}`}
              >
                {checkoutLoading ? 'Opening checkout...' : 'Upgrade Now'}
              </button>
              <button onClick={() => setShowPaywall(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Free trial banner */}
        {guruStatus && guruStatus.guru_access === 'free_trial' && !guruStatus.is_locked && (
          <div className="bg-[#F5E6D3] border-b border-[#0D3330]/10 px-4 py-2 text-center text-sm text-[#0D3330]">
            <span className="font-medium">{guruStatus.prompts_remaining} free {guruStatus.prompts_remaining === 1 ? 'session' : 'sessions'} remaining</span>
            <span className="mx-2">&bull;</span>
            <button onClick={() => setShowPaywall(true)} className="underline font-medium hover:text-[#164340]">Upgrade for unlimited</button>
          </div>
        )}

        {/* Child selector (only if multiple children) */}
        {children.length > 1 && (
          <div className="bg-white border-b border-[#0D3330]/10 px-4 py-2">
            <select
              value={activeChild?.id || ''}
              onChange={(e) => {
                const child = children.find(c => c.id === e.target.value);
                setSelectedChild(child || null);
                setResponse(null);
              }}
              className="w-full p-2 rounded-lg border border-[#0D3330]/15 bg-[#FFFDF8] text-[#0D3330] text-sm focus:ring-1 focus:ring-[#0D3330]/20"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Chat thread */}
        {activeChild ? (
          <GuruChatThread
            childId={activeChild.id}
            childName={activeChild.name}
            classroomId={session?.classroom?.id}
            onGuruLimitReached={() => {
              setShowPaywall(true);
              if (guruStatus) {
                setGuruStatus({ ...guruStatus, is_locked: true, prompts_remaining: 0 });
              }
            }}
          />
        ) : (
          <div className={`flex-1 flex items-center justify-center ${HOME_THEME.pageBg}`}>
            <p className={HOME_THEME.subtleText}>No children found</p>
          </div>
        )}
      </div>
    );
  }
  // ─── END PARENT CHAT UI ────────────────────────────────────

  return (
    <div className={`min-h-screen ${isParent ? HOME_THEME.pageBgGradient : 'bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50'}`}>
      <Toaster position="top-center" />

      {/* Paywall Modal Overlay */}
      {showPaywall && guruStatus?.is_locked && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="text-5xl mb-4">{guruEmoji}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Unlock Montessori Guru</h2>
            <p className="text-gray-600 mb-4">
              You&apos;ve used your 3 free sessions. Upgrade to get unlimited Guru advice for all your children.
            </p>
            <div className={`rounded-xl p-4 mb-5 ${isParent ? 'bg-[#F5E6D3]/60' : 'bg-violet-50'}`}>
              <div className={`text-3xl font-bold ${isParent ? 'text-[#0D3330]' : 'text-violet-700'}`}>$5<span className={`text-base font-normal ${isParent ? 'text-[#0D3330]/60' : 'text-violet-500'}`}>/month per child</span></div>
              <div className={`text-sm mt-1 ${isParent ? 'text-[#0D3330]/70' : 'text-violet-600'}`}>Unlimited questions &bull; Cancel anytime</div>
            </div>
            <div className="text-left text-sm text-gray-600 mb-5 space-y-2">
              <div className="flex items-center gap-2"><span>✅</span> Unlimited Guru conversations</div>
              <div className="flex items-center gap-2"><span>✅</span> Personalized advice for each child</div>
              <div className="flex items-center gap-2"><span>✅</span> Based on 7 Montessori reference books</div>
              <div className="flex items-center gap-2"><span>✅</span> Action plans with timelines</div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className={`w-full py-3 text-white font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50 ${
                isParent ? 'bg-[#0D3330] hover:bg-[#164340]' : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700'
              }`}
            >
              {checkoutLoading ? 'Opening checkout...' : 'Upgrade Now'}
            </button>
            <button
              onClick={() => setShowPaywall(false)}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Free trial prompts banner for homeschool parents */}
      {guruStatus && guruStatus.guru_access === 'free_trial' && !guruStatus.is_locked && (
        <div className={`border-b px-4 py-2 text-center text-sm ${isParent ? 'bg-[#F5E6D3] border-[#0D3330]/10 text-[#0D3330]' : 'bg-violet-100 border-violet-200 text-violet-700'}`}>
          <span className="font-medium">{guruStatus.prompts_remaining} free {guruStatus.prompts_remaining === 1 ? 'session' : 'sessions'} remaining</span>
          <span className="mx-2">&bull;</span>
          <button onClick={() => setShowPaywall(true)} className={`underline font-medium ${isParent ? 'hover:text-[#164340]' : 'hover:text-violet-900'}`}>Upgrade for unlimited</button>
        </div>
      )}

      {/* Page sub-header — main nav is in DashboardHeader */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <span>{guruEmoji}</span> Montessori Guru
            </h1>
            <p className="text-xs text-gray-500">
              {isParent ? 'AI-powered insights for your homeschool' : 'AI-powered insights for your classroom'}
            </p>
          </div>
          {selectedChild && history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-lg active:scale-95 transition-all ${isParent ? 'bg-[#F5E6D3] hover:bg-[#EDD5C0] text-[#0D3330]' : 'bg-violet-100 hover:bg-violet-200 text-violet-700'}`}
              title="Past conversations"
            >
              <span className="text-lg">📜</span>
            </button>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 pb-32">
        {/* Child Selector */}
        <div data-tutorial="guru-child-selector" className="bg-white rounded-xl shadow-sm p-4 mb-4">
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
            className={`w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 ${
              isParent ? 'focus:ring-2 focus:ring-[#0D3330]/30 focus:border-[#0D3330]/40' : 'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
            }`}
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
          <div data-tutorial="guru-question-input" className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              What would you like help with for {selectedChild.name.split(' ')[0]}?
            </label>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isParent
                ? "e.g., My child can't seem to focus lately. She wanders around and won't settle into work at home. What should I do?"
                : "e.g., Rachel can't seem to focus lately. She wanders around the classroom and won't settle into work. What should I do?"
              }
              className={`w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 resize-none min-h-[100px] ${
                isParent ? 'focus:ring-2 focus:ring-[#0D3330]/30 focus:border-[#0D3330]/40' : 'focus:ring-2 focus:ring-violet-500 focus:border-violet-500'
              }`}
              rows={3}
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400">
                {question.length}/1000
              </span>
              <button
                onClick={handleSubmit}
                disabled={!question.trim() || loading || question.length > 1000}
                className={`px-6 py-2.5 text-white font-medium rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-all
                         flex items-center gap-2 ${
                  isParent ? 'bg-[#0D3330] hover:bg-[#164340]' : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700'
                }`}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">{guruEmoji}</span>
                    Thinking...
                  </>
                ) : (
                  <>
                    <span>{isParent ? '🌿' : '✨'}</span>
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
                  <span className="text-lg animate-pulse">{guruEmoji}</span>
                  <span className={`text-sm ${isParent ? 'text-[#0D3330]/70' : 'text-violet-600'}`}>Writing...</span>
                </div>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="animate-pulse">▊</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-4 animate-pulse">{guruEmoji}</div>
                <p className="text-gray-600 font-medium">{isParent ? 'Gathering wisdom...' : 'Gathering insights...'}</p>
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
              <h3 className={`font-bold mb-2 flex items-center gap-2 ${isParent ? 'text-[#0D3330]' : 'text-violet-700'}`}>
                <span>💡</span> Insight
              </h3>
              <p className="text-gray-700 leading-relaxed">{response.insight}</p>
            </div>

            {/* Root Cause */}
            {response.root_cause && (
              <div className={`rounded-xl p-4 border ${isParent ? 'bg-[#F5E6D3]/40 border-[#0D3330]/10' : 'bg-violet-50 border-violet-100'}`}>
                <h3 className={`font-medium mb-1 text-sm ${isParent ? 'text-[#0D3330]' : 'text-violet-700'}`}>Root Cause</h3>
                <p className="text-gray-700">{response.root_cause}</p>
              </div>
            )}

            {/* Action Plan */}
            {response.action_plan && response.action_plan.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className={`font-bold mb-3 flex items-center gap-2 ${isParent ? 'text-[#0D3330]' : 'text-indigo-700'}`}>
                  <span>📋</span> This Week&apos;s Plan
                </h3>
                <div className="space-y-3">
                  {response.action_plan.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${isParent ? 'bg-[#0D3330] text-white' : 'bg-indigo-100 text-indigo-700'}`}>
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
                className={`px-6 py-2 font-medium rounded-lg transition-colors ${isParent ? 'text-[#0D3330] hover:bg-[#F5E6D3]/50' : 'text-violet-600 hover:bg-violet-50'}`}
              >
                Ask Another Question
              </button>
            </div>
          </div>
        )}

        {/* Quick Questions (when no child selected or no response yet) */}
        {selectedChild && !response && !loading && (
          <div data-tutorial="guru-quick-questions" className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Common questions</h3>
            <div className="space-y-2">
              {(isParent ? [
                `${selectedChild.name.split(' ')[0]} can't focus and wanders away from work. What should I do?`,
                `How do I set up our home environment for ${selectedChild.name.split(' ')[0]}?`,
                `How can I help ${selectedChild.name.split(' ')[0]} choose work independently at home?`,
                `${selectedChild.name.split(' ')[0]} seems frustrated with materials. What am I missing?`,
              ] : [
                `${selectedChild.name.split(' ')[0]} can't focus and wanders around. What should I do?`,
                `${selectedChild.name.split(' ')[0]} is having trouble with social interactions.`,
                `How can I help ${selectedChild.name.split(' ')[0]} choose work independently?`,
                `${selectedChild.name.split(' ')[0]} seems frustrated and gets upset easily.`,
              ]).map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className={`w-full text-left p-3 rounded-lg bg-gray-50 text-gray-700 text-sm transition-colors ${
                    isParent ? 'hover:bg-[#F5E6D3]/50 hover:text-[#0D3330]' : 'hover:bg-violet-50 hover:text-violet-700'
                  }`}
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
    <FeatureWrapper featureModule="guru" autoStart>
      <Suspense fallback={
        <div className="h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-bounce text-4xl">🌿</div>
        </div>
      }>
        <GuruContent />
      </Suspense>
    </FeatureWrapper>
  );
}
