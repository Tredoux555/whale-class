// components/media/QuickCapture.tsx
// Instant photo capture modal - snap first, link to child after
// Session 54: Offline-first, instant feedback

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

export default function QuickCapture({ 
  isOpen, 
  onClose, 
  students,
  onCapture 
}: QuickCaptureProps) {
  const { capture, isOnline, pendingCount } = useMedia();
  
  // Camera state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera');
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setCapturedBlob(null);
    setSelectedChildId(null);
    onClose();
  }, [stopCamera, onClose]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Get preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    
    // Get blob for saving
    canvas.toBlob((blob) => {
      if (blob) setCapturedBlob(blob);
    }, 'image/jpeg', 0.85);
    
    // Stop camera
    stopCamera();
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  }, [stopCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setCapturedBlob(file);
    stopCamera();
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setSelectedChildId(null);
    startCamera();
  }, []);

  const savePhoto = useCallback(async () => {
    if (!capturedBlob || !selectedChildId) {
      toast.error('Please select a child');
      return;
    }
    
    setSaving(true);
    
    const child = students.find(s => s.id === selectedChildId);
    const childName = child?.name || 'child';
    
    // INSTANT feedback
    toast.success(`📷 Saved to ${childName}!`);
    
    try {
      // This saves locally and queues for sync
      const media = await capture(capturedBlob, {
        childId: selectedChildId,
        childName,
        workName: 'Quick Capture',
      });
      
      onCapture?.(media.id);
      handleClose();
      
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to save photo');
    } finally {
      setSaving(false);
    }
  }, [capturedBlob, selectedChildId, students, capture, onCapture, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="bg-black/80 px-4 py-3 flex items-center justify-between safe-area-top">
        <button
          onClick={handleClose}
          className="text-white text-lg px-3 py-1 active:opacity-70"
        >
          ✕ Cancel
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">⚡ Quick Capture</span>
          {!isOnline && (
            <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full font-medium">
              Offline
            </span>
          )}
          {pendingCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="w-20" />
      </div>

      {/* Camera / Preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          // CAMERA MODE
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera controls */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8 safe-area-bottom">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white text-2xl active:scale-95 transition-transform"
              >
                🖼️
              </button>
              
              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full" />
              </button>
              
              <div className="w-14 h-14" />
            </div>
          </>
        ) : (
          // PREVIEW + CHILD SELECTION
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 relative">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-contain"
              />
              
              <button
                onClick={retakePhoto}
                className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium active:scale-95"
              >
                🔄 Retake
              </button>
            </div>

            {/* Child selection */}
            <div className="bg-gray-900 p-4 safe-area-bottom">
              <p className="text-white text-sm mb-3 text-center">Tap a child to save:</p>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedChildId(student.id)}
                    disabled={saving}
                    className={`
                      flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95
                      ${selectedChildId === student.id 
                        ? 'bg-emerald-500 scale-105' 
                        : 'bg-gray-800 hover:bg-gray-700'
                      }
                      ${saving ? 'opacity-50' : ''}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                      ${selectedChildId === student.id ? 'bg-emerald-600' : 'bg-blue-500'}
                    `}>
                      {student.name.charAt(0)}
                    </div>
                    <span className="text-white text-xs truncate max-w-full">
                      {student.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={savePhoto}
                disabled={!selectedChildId || saving}
                className={`
                  w-full mt-4 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
                  transition-all active:scale-98
                  ${selectedChildId && !saving
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                  }
                `}
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>
                      {selectedChildId 
                        ? `Save to ${students.find(s => s.id === selectedChildId)?.name.split(' ')[0]}`
                        : 'Select a child'
                      }
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
