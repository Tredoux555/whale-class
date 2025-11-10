import fs from "fs";
import path from "path";
import { get, put } from "@vercel/blob";

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
const isVercel = process.env.VERCEL === "1";
const METADATA_BLOB_PATH = "data/videos.json";

// Ensure data directory exists (for localhost)
if (!isVercel && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize videos.json if it doesn't exist (for localhost)
if (!isVercel && !fs.existsSync(videosFile)) {
  fs.writeFileSync(videosFile, JSON.stringify([], null, 2));
}

// Get videos from local filesystem (localhost) or Blob Storage (Vercel)
export async function getVideos(): Promise<Video[]> {
  try {
    if (isVercel) {
      // On Vercel: Try Blob Storage first, then fallback to git filesystem
      try {
        const blob = await get(METADATA_BLOB_PATH);
        const text = await blob.text();
        const videos = JSON.parse(text);
        // If blob has videos, return them
        if (videos && videos.length > 0) {
          return videos;
        }
      } catch (error) {
        // Blob doesn't exist or is empty, try filesystem fallback
        console.log("Blob storage empty or not found, trying filesystem fallback");
      }
      
      // Fallback: Try reading from filesystem (if videos.json is in git)
      try {
        if (fs.existsSync(videosFile)) {
          const data = fs.readFileSync(videosFile, "utf-8");
          const videos = JSON.parse(data);
          if (videos && videos.length > 0) {
            return videos;
          }
        }
      } catch (error) {
        // File doesn't exist or can't be read
        console.log("Filesystem fallback failed:", error);
      }
      
      return [];
    } else {
      // On localhost: Read from filesystem
      const data = fs.readFileSync(videosFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error getting videos:", error);
    return [];
  }
}

// Save videos to local filesystem (localhost) or Blob Storage (Vercel)
export async function saveVideos(videos: Video[]): Promise<void> {
  try {
    if (isVercel) {
      // On Vercel: Save to Blob Storage
      const jsonData = JSON.stringify(videos, null, 2);
      await put(METADATA_BLOB_PATH, jsonData, {
        access: 'public',
        contentType: 'application/json',
      });
    } else {
      // On localhost: Save to filesystem
      fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
    }
  } catch (error) {
    console.error("Error saving videos:", error);
    throw error;
  }
}

export async function addVideo(video: Video): Promise<void> {
  const videos = await getVideos();
  videos.push(video);
  await saveVideos(videos);
}

export async function deleteVideo(id: string): Promise<boolean> {
  const videos = await getVideos();
  const filtered = videos.filter((v) => v.id !== id);
  if (filtered.length === videos.length) {
    return false; // Video not found
  }
  await saveVideos(filtered);
  return true;
}

