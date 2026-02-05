// components/montree/WorkDetailModal.tsx
// Modal for work details: video demo, capture, status
// Session 54: Clean, simple, uses offline-first capture

'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useMedia } from '@/lib/media/useMedia';

interface WorkAssignment {
  id: string;
  work_id?: string;
  work_name: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  notes?: string;
  mediaCount?: number;
}

interface WorkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: WorkAssignment | null;
  childId: string;
  childName: string;
  onStatusChange?: (assignmentId: string, newStatus: string) => void;
  onNotesChange?: (assignmentId: string, notes: string) => void;
  onMediaCaptured?: () => void;
}

const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'] as const;

const STATUS_CONFIG = {
  not_started: { 
    label: 'Not Started', 
    emoji: '○',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    activeColor: 'bg-gray-200 ring-2 ring-gray-400'
  },
  presented: { 
    label: 'Presented', 
    emoji: '🟡',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    activeColor: 'bg-amber-100 ring-2 ring-amber-400'
  },
  practicing: { 
    label: 'Practicing', 
    emoji: '🔵',
    color: 'bg-blue-50 text-blue-700 border-blue-300',
    activeColor: 'bg-blue-100 ring-2 ring-blue-400'
  },
  mastered: { 
    label: 'Mastered', 
    emoji: '🟢',
    color: 'bg-green-50 text-green-700 border-green-300',
    activeColor: 'bg-green-100 ring-2 ring-green-400'
  },
};

const AREA_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  practical_life: { name: 'Practical Life', color: 'from-pink-500 to-rose-500', icon: 'P' },
  sensorial: { name: 'Sensorial', color: 'from-purple-500 to-violet-500', icon: 'S' },
  mathematics: { name: 'Mathematics', color: 'from-blue-500 to-indigo-500', icon: 'M' },
  math: { name: 'Mathematics', color: 'from-blue-500 to-indigo-500', icon: 'M' },
  language: { name: 'Language', color: 'from-green-500 to-emerald-500', icon: 'L' },
  cultural: { name: 'Cultural', color: 'from-orange-500 to-amber-500', icon: 'C' },
  culture: { name: 'Cultural', color: 'from-orange-500 to-amber-500', icon: 'C' },
};

export default function WorkDetailModal({
  isOpen,
  onClose,
  assignment,
  childId,
  childName,
  onStatusChange,
  onNotesChange,
  onMediaCaptured,
}: WorkDetailModalProps) {
  const { capture } = useMedia();
  
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const area = AREA_CONFIG[assignment.area] || AREA_CONFIG.practical_life;
  const currentStatus = assignment.progress_status;

  // ==========================================
  // STATUS HANDLING
  // ==========================================
  
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    try {
      onStatusChange?.(assignment.id, newStatus);
      toast.success(`→ ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // ==========================================
  // NOTES HANDLING
  // ==========================================
  
  const handleSaveNotes = async () => {
    if (notes === assignment.notes) return;
    
    setSaving(true);
    try {
      onNotesChange?.(assignment.id, notes);
      toast.success('Notes saved!');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // VIDEO DEMO
  // ==========================================
  
  const openYouTubeDemo = () => {
    const query = encodeURIComponent(`${assignment.work_name} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  // ==========================================
  // CAMERA CAPTURE
  // ==========================================
  
  const startCamera = async () => {
    setCameraOpen(true);
    setCameraReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
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
      toast.error('Could not access camera');
      setCameraOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraReady(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Get preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewImage(dataUrl);
    
    // Get blob and save
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      setCapturing(true);
      stopCamera();
      
      try {
        await capture(blob, {
          childId,
          childName,
          workId: assignment.work_id,
          workName: assignment.work_name,
        });
        
        toast.success(`📷 Saved to ${childName}!`);
        onMediaCaptured?.();
        setPreviewImage(null);
        
      } catch (error) {
        console.error('Capture error:', error);
        toast.error('Failed to save photo');
      } finally {
        setCapturing(false);
      }
    }, 'image/jpeg', 0.9);
    
    if (navigator.vibrate) navigator.vibrate(30);
  }, [cameraReady, stopCamera, capture, childId, childName, assignment, onMediaCaptured]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCapturing(true);
    
    try {
      await capture(file, {
        childId,
        childName,
        workId: assignment.work_id,
        workName: assignment.work_name,
      });
      
      toast.success(`📷 Saved to ${childName}!`);
      onMediaCaptured?.();
      
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to save photo');
    } finally {
      setCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    stopCamera();
    setPreviewImage(null);
    onClose();
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${area.color} text-white p-4 sm:p-5`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{area.icon}</span>
                <span className="text-sm opacity-80">{area.name}</span>
              </div>
              <h2 className="text-xl font-bold leading-tight">{assignment.work_name}</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors ml-3 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Camera View (when open) */}
          {cameraOpen && (
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                >
                  <div className="w-14 h-14 border-4 border-gray-300 rounded-full" />
                </button>
              </div>
            </div>
          )}

          {/* Preview (after capture) */}
          {previewImage && (
            <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-video">
              <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              {capturing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    <p>Saving...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons (when camera not open) */}
          {!cameraOpen && !previewImage && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={openYouTubeDemo}
                className="flex items-center justify-center gap-2 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all"
              >
                <span className="text-xl">▶️</span>
                <span>Watch Demo</span>
              </button>
              
              <button
                onClick={startCamera}
                disabled={capturing}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className="text-xl">📷</span>
                <span>Capture</span>
              </button>
            </div>
          )}

          {/* Gallery option */}
          {!cameraOpen && !previewImage && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={capturing}
              className="w-full py-3 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              🖼️ Choose from gallery
            </button>
          )}

          {/* Status Selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Progress Status</h3>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_FLOW.map(status => {
                const config = STATUS_CONFIG[status];
                const isActive = status === currentStatus;
                
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`
                      py-3 rounded-xl border-2 transition-all active:scale-95
                      ${isActive ? config.activeColor : config.color}
                    `}
                  >
                    <div className="text-xl mb-1">{config.emoji}</div>
                    <div className="text-xs font-medium">{config.label.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Observation Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this work..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
            />
            {notes !== (assignment.notes || '') && (
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : '💾 Save Notes'}
              </button>
            )}
          </div>

          {/* Media count */}
          {(assignment.mediaCount || 0) > 0 && (
            <div className="text-center text-sm text-gray-500">
              📷 {assignment.mediaCount} photo{assignment.mediaCount !== 1 ? 's' : ''} captured for this work
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Done
          </button>
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
    </div>
  );
}
