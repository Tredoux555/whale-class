'use client';

import { Feedback } from './types';

interface FeedbackTabProps {
  feedback: Feedback[];
  loadingFeedback: boolean;
  onFetchFeedback: () => void;
  onMarkRead: (id: string) => void;
}

const getFeedbackEmoji = (type: string) => {
  switch (type) {
    case 'bug': return '🐛';
    case 'idea': return '💡';
    case 'help': return '❓';
    case 'praise': return '👍';
    default: return '💬';
  }
};

const getUserTypeColor = (type: string) => {
  switch (type) {
    case 'teacher': return 'bg-blue-500/20 text-blue-400';
    case 'principal': return 'bg-purple-500/20 text-purple-400';
    case 'parent': return 'bg-emerald-500/20 text-emerald-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
};

export default function FeedbackTab({
  feedback,
  loadingFeedback,
  onFetchFeedback,
  onMarkRead
}: FeedbackTabProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">User Feedback</h2>
        <button onClick={onFetchFeedback} className="text-sm text-slate-400 hover:text-white">
          ↻ Refresh
        </button>
      </div>

      {loadingFeedback ? (
        <div className="p-12 text-center">
          <div className="animate-pulse text-4xl">💬</div>
          <p className="text-slate-400 mt-2">Loading feedback...</p>
        </div>
      ) : feedback.length === 0 ? (
        <div className="p-12 text-center">
          <span className="text-5xl block mb-4">📭</span>
          <h3 className="text-xl font-semibold text-white mb-2">No feedback yet</h3>
          <p className="text-slate-400">Feedback from teachers, principals, and parents will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700">
          {feedback.map((item) => (
            <div
              key={item.id}
              className={`p-4 hover:bg-slate-800/50 transition-colors ${
                !item.is_read ? 'bg-emerald-500/5 border-l-4 border-emerald-500' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{getFeedbackEmoji(item.feedback_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(item.user_type)}`}>
                      {item.user_type}
                    </span>
                    {item.user_name && (
                      <span className="text-white font-medium">{item.user_name}</span>
                    )}
                    {item.school?.name && (
                      <span className="text-slate-500 text-sm">@ {item.school.name}</span>
                    )}
                    <span className="text-slate-500 text-sm ml-auto">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">{item.message}</p>
                  {item.screenshot_url && (
                    <div className="mt-3">
                      <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={item.screenshot_url}
                          alt="Screenshot"
                          className="max-w-md max-h-48 rounded-lg border border-slate-600 hover:border-emerald-500 transition-colors cursor-pointer"
                        />
                      </a>
                    </div>
                  )}
                  {item.page_url && (
                    <p className="text-slate-500 text-sm mt-2">📍 {item.page_url}</p>
                  )}
                </div>
                {!item.is_read && (
                  <button
                    onClick={() => onMarkRead(item.id)}
                    className="px-3 py-1 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg"
                  >
                    ✓ Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
