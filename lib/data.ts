import fs from "fs";
import path from "path";

export interface Video {
  id: string;
  title: string;
  category: "song-of-week" | "phonics";
  videoUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  week?: string; // For song of the week
}

const dataDir = path.join(process.cwd(), "data");
const videosFile = path.join(dataDir, "videos.json");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize videos.json if it doesn't exist
if (!fs.existsSync(videosFile)) {
  fs.writeFileSync(videosFile, JSON.stringify([], null, 2));
}

export function getVideos(): Video[] {
  try {
    const data = fs.readFileSync(videosFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export function saveVideos(videos: Video[]): void {
  fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
}

export function addVideo(video: Video): void {
  const videos = getVideos();
  videos.push(video);
  saveVideos(videos);
}

export function deleteVideo(id: string): boolean {
  const videos = getVideos();
  const filtered = videos.filter((v) => v.id !== id);
  if (filtered.length === videos.length) {
    return false; // Video not found
  }
  saveVideos(filtered);
  return true;
}

