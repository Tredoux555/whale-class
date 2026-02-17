'use client';

interface WelcomeModalProps {
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeModal({
  teacherName,
  isOpen,
  onClose,
}: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade animation */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal with slide-up animation */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-slideUp">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>

          {/* Icon */}
          <div className="text-center mb-6">
            <div className="text-7xl mb-4 animate-bounce">👋</div>
            <h2 className="text-3xl font-bold text-gray-800">
              Welcome, <span className="text-emerald-600">{teacherName}</span>!
            </h2>
          </div>

          {/* Content */}
          <p className="text-center text-gray-600 mb-8 leading-relaxed">
            Let's get your classroom set up. The first step is adding your students so you can start tracking their progress.
          </p>

          {/* CTA Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            Add My First Student
          </button>
        </div>
      </div>

      {/* Scoped custom animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </>
  );
}
