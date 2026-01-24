// components/media/QuickCapture.tsx
// REBUILT: Now supports photos AND documents
// Session 64: Added document upload capability

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useMedia } from '@/lib/media/useMedia';

interface Student {
  id: string;
  name: string;
}

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onCapture?: (mediaId: string) => void;
}

type CaptureMode = 'photo' | 'document';
type CaptureStep = 'camera' | 'select' | 'saving';

// Document type icons
const DOC_ICONS: Record<string, string> = {
  'application/pdf': '📕',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/msword': '📘',
  'default': '📄'
};

function getDocIcon(mimeType: string): string {
  return DOC_ICONS[mimeType] || DOC_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QuickCapture({ 
  isOpen, 
  onClose, 
  students,
  onCapture 
}: QuickCaptureProps) {
  const { capture, isOnline, pendingCount } = useMedia();
  
  // State
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [step, setStep] = useState<CaptureStep>('camera');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  // Document-specific state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // CAMERA MANAGEMENT
  // ==========================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera. Try selecting from gallery.');
    }
  }, []);

  // Start camera when modal opens (photo mode only)
  useEffect(() => {
    if (isOpen && step === 'camera' && mode === 'photo') {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, step, mode, startCamera, stopCamera]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const reset = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setDocumentFile(null);
    setSelectedChildId(null);
    setStep('camera');
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    reset();
    onClose();
  }, [stopCamera, reset, onClose]);

  const switchMode = useCallback((newMode: CaptureMode) => {
    if (newMode === mode) return;
    stopCamera();
    reset();
    setMode(newMode);
  }, [mode, stopCamera, reset]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setStep('select');
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
    
    if (navigator.vibrate) navigator.vibrate(30);
  }, [cameraReady, stopCamera]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setCapturedBlob(file);
      setStep('select');
      stopCamera();
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  const handleDocumentSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a PDF or Word document');
      return;
    }
    
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Document must be under 10MB');
      return;
    }
    
    setDocumentFile(file);
    setCapturedBlob(file);
    setStep('select');
    
    if (docInputRef.current) docInputRef.current.value = '';
  }, []);

  const retakePhoto = useCallback(() => {
    reset();
    if (mode === 'photo') {
      startCamera();
    }
  }, [reset, mode, startCamera]);

  const selectChildAndSave = useCallback(async (childId: string) => {
    if (!capturedBlob) return;
    
    setSelectedChildId(childId);
    setStep('saving');
    
    const child = students.find(s => s.id === childId);
    const childName = child?.name || 'child';
    
    try {
      const isDocument = mode === 'document';
      
      const media = await capture(capturedBlob, {
        childId,
        childName,
        workName: isDocument ? 'Document' : 'Quick Capture',
        mediaType: isDocument ? 'document' : undefined,
        fileName: documentFile?.name,
        mimeType: documentFile?.type,
      });
      
      toast.success(`Saved to ${childName}!`, { duration: 2000 });
      onCapture?.(media.id);
      handleClose();
      
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to save. Tap to retry.');
      setStep('select');
      setSelectedChildId(null);
    }
  }, [capturedBlob, students, capture, onCapture, handleClose, mode, documentFile]);

  // ==========================================
  // RENDER
  // ==========================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      
      {/* ==================== MODE TOGGLE (always visible at top) ==================== */}
      {step === 'camera' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur-sm rounded-full p-1 flex">
          <button
            onClick={() => switchMode('photo')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === 'photo' 
                ? 'bg-white text-black' 
                : 'text-white/70 hover:text-white'
            }`}
          >
            📷 Photo
          </button>
          <button
            onClick={() => switchMode('document')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === 'document' 
                ? 'bg-white text-black' 
                : 'text-white/70 hover:text-white'
            }`}
          >
            📄 Document
          </button>
        </div>
      )}

      {/* ==================== PHOTO CAMERA STEP ==================== */}
      {step === 'camera' && mode === 'photo' && (
        <>
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!cameraReady && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/70">Starting camera...</p>
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <button
                onClick={handleClose}
                className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2">
                {!isOnline && (
                  <span className="px-2 py-1 bg-amber-500 text-black text-xs font-medium rounded-full">
                    Offline
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                    {pendingCount} syncing
                  </span>
                )}
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-center gap-12">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <span className="text-xl">🖼️</span>
                </button>
                
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="w-20 h-20 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-gray-300" />
                </button>
                
                <div className="w-12 h-12" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== DOCUMENT SELECT STEP ==================== */}
      {step === 'camera' && mode === 'document' && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 p-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm text-white rounded-full flex items-center justify-center"
          >
            ✕
          </button>
          
          {/* Document upload area */}
          <div 
            onClick={() => docInputRef.current?.click()}
            className="w-full max-w-sm aspect-square bg-gray-800 rounded-3xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-gray-750 transition-all active:scale-95"
          >
            <span className="text-6xl mb-4">📄</span>
            <p className="text-white font-medium text-lg mb-2">Tap to select document</p>
            <p className="text-gray-400 text-sm">PDF, Word (.docx, .doc)</p>
            <p className="text-gray-500 text-xs mt-1">Max 10MB</p>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2 mt-6">
            {!isOnline && (
              <span className="px-2 py-1 bg-amber-500 text-black text-xs font-medium rounded-full">
                Offline
              </span>
            )}
            {pendingCount > 0 && (
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                {pendingCount} syncing
              </span>
            )}
          </div>
        </div>
      )}

      {/* ==================== SELECT CHILD STEP (Photo) ==================== */}
      {(step === 'select' || step === 'saving') && mode === 'photo' && capturedImage && (
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="flex-1 relative min-h-0">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
            
            <button
              onClick={retakePhoto}
              disabled={step === 'saving'}
              className="absolute top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              ↻ Retake
            </button>
            
            <button
              onClick={handleClose}
              disabled={step === 'saving'}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <div className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <h3 className="text-center text-gray-600 font-medium mb-4">
              {step === 'saving' ? 'Saving...' : 'Who is this?'}
            </h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
              {students.map((student) => {
                const isSelected = selectedChildId === student.id;
                const isSaving = step === 'saving' && isSelected;
                
                return (
                  <button
                    key={student.id}
                    onClick={() => step !== 'saving' && selectChildAndSave(student.id)}
                    disabled={step === 'saving'}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                      ${isSelected 
                        ? 'bg-emerald-500 scale-105 shadow-lg' 
                        : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                      }
                      ${step === 'saving' && !isSelected ? 'opacity-40' : ''}
                    `}
                  >
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm
                      ${isSelected 
                        ? 'bg-white text-emerald-600' 
                        : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                      }
                    `}>
                      {isSaving ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <span className={`
                      text-sm font-medium truncate max-w-full
                      ${isSelected ? 'text-white' : 'text-gray-700'}
                    `}>
                      {student.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SELECT CHILD STEP (Document) ==================== */}
      {(step === 'select' || step === 'saving') && mode === 'document' && documentFile && (
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* Document preview */}
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full">
              <span className="text-7xl mb-4 block">{getDocIcon(documentFile.type)}</span>
              <p className="text-white font-medium text-lg truncate mb-1">{documentFile.name}</p>
              <p className="text-gray-400 text-sm">{formatFileSize(documentFile.size)}</p>
            </div>
            
            <button
              onClick={retakePhoto}
              disabled={step === 'saving'}
              className="mt-4 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium disabled:opacity-50"
            >
              ↻ Choose different file
            </button>
            
            <button
              onClick={handleClose}
              disabled={step === 'saving'}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm text-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Child selection */}
          <div className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <h3 className="text-center text-gray-600 font-medium mb-4">
              {step === 'saving' ? 'Saving...' : 'Send to which child?'}
            </h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto">
              {students.map((student) => {
                const isSelected = selectedChildId === student.id;
                const isSaving = step === 'saving' && isSelected;
                
                return (
                  <button
                    key={student.id}
                    onClick={() => step !== 'saving' && selectChildAndSave(student.id)}
                    disabled={step === 'saving'}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-2xl transition-all
                      ${isSelected 
                        ? 'bg-blue-500 scale-105 shadow-lg' 
                        : 'bg-gray-100 hover:bg-gray-200 active:scale-95'
                      }
                      ${step === 'saving' && !isSelected ? 'opacity-40' : ''}
                    `}
                  >
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm
                      ${isSelected 
                        ? 'bg-white text-blue-600' 
                        : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                      }
                    `}>
                      {isSaving ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <span className={`
                      text-sm font-medium truncate max-w-full
                      ${isSelected ? 'text-white' : 'text-gray-700'}
                    `}>
                      {student.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleDocumentSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
