export interface ImageOffset {
  x: number; // percentage 0-100, 50 = centered
  y: number; // percentage 0-100, 50 = centered
}

export interface Card {
  id: number;
  originalImage: string;
  croppedImage: string;
  label: string;
  width: number;
  height: number;
  imageOffset?: ImageOffset;
}

export interface CropData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface FrameCropState {
  offsetX: number;  // image offset in pixels (how far image is moved from top-left)
  offsetY: number;
  zoom: number;     // 1 = fit, >1 = zoomed in
}
