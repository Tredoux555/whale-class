// /components/montree/TutorialOverlay.tsx
// Session 84: Simple sticky-note style tutorial bubbles
// Used by demo mode to guide users through the system

'use client';

interface TutorialOverlayProps {
  message: string;
  onNext: () => void;
  onSkip: () => void;
  step: number;
  totalSteps: number;
}

export default function TutorialOverlay({ 
  message, 
  onNext, 
  onSkip, 
  step, 
  totalSteps 
}: TutorialOverlayProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Sticky note style bubble */}
        <div className="bg-amber-100 rounded-2xl shadow-xl border-2 border-amber-200 p-5 relative">
          {/* Folded corner effect */}
          <div className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-bl-2xl" 
            style={{ 
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              boxShadow: 'inset -2px 2px 4px rgba(0,0,0,0.1)'
            }} 
          />
          
          {/* Message */}
          <p className="text-gray-800 text-lg leading-relaxed pr-6 font-medium">
            {message}
          </p>
          
          {/* Progress & Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-200">
            <button 
              onClick={onSkip}
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              Skip tutorial
            </button>
            
            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1">
                {[...Array(totalSteps)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < step ? 'bg-amber-500' : 'bg-amber-300'
                    }`}
                  />
                ))}
              </div>
              
              <button 
                onClick={onNext}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
        
        {/* Speech bubble tail */}
        <div className="flex justify-center -mt-1">
          <div 
            className="w-6 h-6 bg-amber-100 border-l-2 border-b-2 border-amber-200 rotate-[-45deg]"
            style={{ marginTop: '-12px' }}
          />
        </div>
      </div>
    </div>
  );
}
