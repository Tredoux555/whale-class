'use client';

interface DmMessage {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  message: string;
  created_at: string;
}

interface DmPanelProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadEmail: string;
  messages: DmMessage[];
  newMsg: string;
  setNewMsg: (msg: string) => void;
  onSend: () => void;
  sending: boolean;
}

export default function DmPanel({
  isOpen,
  onClose,
  leadName,
  leadEmail,
  messages,
  newMsg,
  setNewMsg,
  onSend,
  sending
}: DmPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">
              💬 {leadName}
            </h2>
            {leadEmail && (
              <p className="text-slate-400 text-xs">{leadEmail}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl block mb-3">💬</span>
              <p className="text-slate-400 text-sm">No messages yet</p>
              <p className="text-slate-500 text-xs mt-1">Send the first message</p>
            </div>
          ) : (
            messages.map((msg: DmMessage) => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === 'admin'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-white rounded-bl-md'
                }`}>
                  {msg.sender_type === 'user' && (
                    <p className="text-blue-400 text-xs font-medium mb-1">{msg.sender_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-emerald-200/50' : 'text-slate-500'}`}>
                    {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
              placeholder="Type a message..."
              className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
              autoFocus
            />
            <button
              onClick={onSend}
              disabled={sending || !newMsg.trim()}
              className="px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
