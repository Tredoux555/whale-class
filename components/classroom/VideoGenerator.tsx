'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface Photo {
  id: string;
  work_name: string;
  media_url: string;
  taken_at: string;
  category?: string;
}

interface VideoGeneratorProps {
  childId: string;
  childName: string;
  onClose: () => void;
}

export default function VideoGenerator({ childId, childName, onClose }: VideoGeneratorProps) {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchPhotos();
  }, [childId]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/classroom/video?childId=${childId}`);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const preloadImages = async (): Promise<HTMLImageElement[]> => {
    const images: HTMLImageElement[] = [];
    
    for (const photo of photos) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photo.media_url;
      });
      images.push(img);
    }
    
    return images;
  };

  const generateVideo = async () => {
    if (!canvasRef.current || photos.length === 0) return;

    setGenerating(true);
    setProgress(0);
    chunksRef.current = [];

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Set canvas size for 1080p
      canvas.width = 1920;
      canvas.height = 1080;

      // Preload all images
      toast.info('Loading images...');
      const images = await preloadImages();
      
      // Set up MediaRecorder
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${childName.replace(/\s+/g, '_')}_Slideshow.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setGenerating(false);
        toast.success('🎬 Video downloaded!');
        onClose();
      };

      mediaRecorder.start();

      // Duration per photo in ms
      const photoDuration = 3000;
      const transitionDuration = 500;
      const fps = 30;
      const frameTime = 1000 / fps;

      // Draw title slide
      await drawTitleSlide(ctx, canvas.width, canvas.height, childName);
      await sleep(2000);

      // Animate through photos
      for (let i = 0; i < images.length; i++) {
        setCurrentPhotoIndex(i);
        setProgress(Math.round((i / images.length) * 100));
        
        const img = images[i];
        const photo = photos[i];
        
        // Ken Burns effect - gentle zoom and pan
        const startTime = performance.now();
        const zoomStart = 1.0;
        const zoomEnd = 1.1;
        
        while (performance.now() - startTime < photoDuration) {
          const elapsed = performance.now() - startTime;
          const t = elapsed / photoDuration;
          
          // Calculate zoom
          const zoom = zoomStart + (zoomEnd - zoomStart) * t;
          
          // Clear and draw background
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Calculate image dimensions
          const scale = Math.max(
            canvas.width / img.width,
            canvas.height / img.height
          ) * zoom;
          
          const imgWidth = img.width * scale;
          const imgHeight = img.height * scale;
          const x = (canvas.width - imgWidth) / 2;
          const y = (canvas.height - imgHeight) / 2;
          
          // Draw image
          ctx.drawImage(img, x, y, imgWidth, imgHeight);
          
          // Draw caption bar
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(photo.work_name || '', canvas.width / 2, canvas.height - 50);
          
          ctx.font = '20px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(
            new Date(photo.taken_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            canvas.width / 2,
            canvas.height - 20
          );
          
          await sleep(frameTime);
        }
        
        // Fade transition
        if (i < images.length - 1) {
          for (let alpha = 0; alpha <= 1; alpha += 0.1) {
            ctx.fillStyle = `rgba(26, 26, 46, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await sleep(transitionDuration / 10);
          }
        }
      }

      // Draw end slide
      await drawEndSlide(ctx, canvas.width, canvas.height, childName);
      await sleep(2000);

      setProgress(100);
      mediaRecorder.stop();

    } catch (error) {
      console.error('Video generation error:', error);
      toast.error('Failed to generate video');
      setGenerating(false);
    }
  };

  const drawTitleSlide = async (ctx: CanvasRenderingContext2D, width: number, height: number, name: string) => {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#4ECCA3';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, width / 2, height / 2 - 50);
    
    // Subtitle
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.fillText('Learning Journey', width / 2, height / 2 + 30);
    
    // Year
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '24px Arial';
    ctx.fillText(new Date().getFullYear().toString(), width / 2, height / 2 + 80);
  };

  const drawEndSlide = async (ctx: CanvasRenderingContext2D, width: number, height: number, name: string) => {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Whale emoji placeholder
    ctx.fillStyle = '#4ECCA3';
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐋', width / 2, height / 2 - 40);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.fillText('My Classroomroom', width / 2, height / 2 + 60);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px Arial';
    ctx.fillText('teacherpotato.xyz', width / 2, height / 2 + 100);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-pulse">🎬</span>
          </div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">🎬 Generate Video</h3>
              <p className="text-pink-200 text-sm">{childName}'s slideshow</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl">📷</span>
              <p className="text-gray-600 mt-2">No photos to include</p>
            </div>
          ) : generating ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 border-4 border-pink-200 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-pink-600">{progress}%</span>
                </div>
              </div>
              <p className="text-gray-600 mb-2">Generating video...</p>
              <p className="text-sm text-gray-400">
                Photo {currentPhotoIndex + 1} of {photos.length}
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="grid grid-cols-4 gap-2 mb-6">
                {photos.slice(0, 8).map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              
              <p className="text-gray-600 mb-4">
                {photos.length} photos will be included
              </p>
              
              <div className="bg-pink-50 rounded-xl p-4 mb-6 text-left">
                <h4 className="font-medium text-pink-700 mb-2">Video includes:</h4>
                <ul className="text-sm text-pink-600 space-y-1">
                  <li>✓ Title slide with name</li>
                  <li>✓ Ken Burns zoom effect</li>
                  <li>✓ Photo captions & dates</li>
                  <li>✓ Smooth transitions</li>
                  <li>✓ End slide with branding</li>
                </ul>
              </div>

              <button
                onClick={generateVideo}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all active:scale-95"
              >
                🎬 Generate Video
              </button>
              
              <p className="text-xs text-gray-400 mt-3">
                Video will download as WebM format
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden canvas for video generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
