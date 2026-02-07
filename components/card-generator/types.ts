export interface Card {
  id: number;
  originalImage: string;
  croppedImage: string;
  label: string;
  width: number;
  height: number;
}

export interface CropData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}
