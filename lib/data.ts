import fs from "fs";
import path from "path";
import { head, put } from "@vercel/blob";

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
        // Check if blob exists using head
        try {
          const blobInfo = await head(METADATA_BLOB_PATH);
          if (blobInfo && blobInfo.url) {
            // Fetch the blob content via its URL
            const response = await fetch(blobInfo.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch blob: ${response.status}`);
            }
            const text = await response.text();
            const videos = JSON.parse(text);
            // Return videos even if empty array
            return Array.isArray(videos) ? videos : [];
          }
        } catch (headError) {
          // Check if it's a "not found" error (blob doesn't exist yet)
          const errorMessage = headError instanceof Error ? headError.message : String(headError);
          if (errorMessage.includes("not found") || errorMessage.includes("404") || errorMessage.includes("BLOB_NOT_FOUND")) {
            console.log("Blob doesn't exist yet (first video), returning empty array");
            return [];
          }
          // Re-throw other errors to be caught by outer catch
          throw headError;
        }
        // Blob doesn't exist yet (first video), return empty array
        return [];
      } catch (error) {
        // Other error, try filesystem fallback
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("Blob storage read failed, trying filesystem fallback:", errorMessage);
      }
      
      // Fallback: Try reading from filesystem (if videos.json is in git)
      try {
        if (fs.existsSync(videosFile)) {
          const data = fs.readFileSync(videosFile, "utf-8");
          const videos = JSON.parse(data);
          return Array.isArray(videos) ? videos : [];
        }
      } catch (error) {
        // File doesn't exist or can't be read
        console.log("Filesystem fallback failed:", error instanceof Error ? error.message : error);
      }
      
      return [];
    } else {
      // On localhost: Read from filesystem
      const data = fs.readFileSync(videosFile, "utf-8");
      const videos = JSON.parse(data);
      return Array.isArray(videos) ? videos : [];
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
      // On Vercel: Save to Blob Storage with retry
      const jsonData = JSON.stringify(videos, null, 2);
      
      // Retry logic for blob storage
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await put(METADATA_BLOB_PATH, jsonData, {
            access: 'public',
            contentType: 'application/json',
          });
          console.log("Successfully saved videos to blob storage");
          return; // Success
        } catch (error) {
          lastError = error;
          console.error(`Blob save attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);
          if (attempt < 2) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      // All retries failed
      throw new Error(`Failed to save to blob storage after 3 attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
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
  // Retry logic to handle race conditions
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Add video attempt ${attempt + 1} for video:`, video.id);
      const videos = await getVideos();
      console.log(`Retrieved ${videos.length} existing videos`);
      
      // Check if video already exists (prevent duplicates)
      if (videos.some(v => v.id === video.id)) {
        console.log("Video already exists, skipping add:", video.id);
        return;
      }
      
      videos.push(video);
      console.log(`Saving ${videos.length} videos to storage...`);
      await saveVideos(videos);
      console.log("Successfully added video:", video.id);
      return; // Success
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Add video attempt ${attempt + 1} failed:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error("Error stack:", error.stack);
      }
      if (attempt < 2) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  
  // All retries failed
  const finalError = `Failed to add video after 3 attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`;
  console.error(finalError);
  throw new Error(finalError);
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

