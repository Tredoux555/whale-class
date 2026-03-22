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
