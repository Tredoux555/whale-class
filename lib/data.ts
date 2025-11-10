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

// Get videos from local filesystem (localhost) or Vercel Blob Storage (Vercel)
export async function getVideos(): Promise<Video[]> {
  try {
    if (isVercel) {
      // On Vercel: Read from Blob Storage only (no filesystem fallback to prevent stale data)
      try {
        // Check if blob exists using head
        const blobInfo = await head(METADATA_BLOB_PATH);
        if (blobInfo && blobInfo.url) {
          // Fetch the blob content via its URL
          const response = await fetch(blobInfo.url);
          if (!response.ok) {
            console.error(`Failed to fetch blob: ${response.status}`);
            return []; // Return empty instead of falling back to old data
          }
          const text = await response.text();
          const videos = JSON.parse(text);
          // Return videos even if empty array
          return Array.isArray(videos) ? videos : [];
        }
        // Blob exists but no URL (shouldn't happen)
        return [];
      } catch (headError) {
        // Check if it's a "not found" error (blob doesn't exist yet)
        const errorMessage = headError instanceof Error ? headError.message : String(headError);
        if (errorMessage.includes("not found") || errorMessage.includes("404") || errorMessage.includes("BLOB_NOT_FOUND")) {
          console.log("Blob doesn't exist yet (first video), returning empty array");
          return [];
        }
        // For other errors, log and return empty (don't fallback to stale filesystem data)
        console.error("Error reading from blob storage:", errorMessage);
        return [];
      }
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

// Save videos to local filesystem (localhost) or Vercel Blob Storage (Vercel)
export async function saveVideos(videos: Video[]): Promise<void> {
  try {
    if (isVercel) {
      // Check if blob storage is configured
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        const errorMsg = "BLOB_READ_WRITE_TOKEN is not set. Please configure Vercel Blob Storage in your Vercel project settings.";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // On Vercel: Save to Blob Storage with retry
      const jsonData = JSON.stringify(videos, null, 2);
      console.log(`Attempting to save ${videos.length} videos to blob storage at path: ${METADATA_BLOB_PATH}`);
      
      // Retry logic for blob storage
      let lastError: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`Blob save attempt ${attempt + 1}/3`);
          await put(METADATA_BLOB_PATH, jsonData, {
            access: 'public',
            contentType: 'application/json',
            allowOverwrite: true,
          });
          console.log(`Successfully saved ${videos.length} videos to blob storage`);
          return; // Success
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(`Blob save attempt ${attempt + 1}/3 failed:`, errorMessage);
          if (errorStack) {
            console.error("Error stack:", errorStack);
          }
          
          // Check for specific blob storage errors
          if (errorMessage.includes("BLOB_STORE_NOT_FOUND") || 
              errorMessage.includes("BLOB_STORE") || 
              errorMessage.includes("BLOB_") ||
              errorMessage.includes("Store not found")) {
            const specificError = "Vercel Blob Storage is not configured or the store doesn't exist. Please create a Blob database in Vercel project settings and ensure BLOB_READ_WRITE_TOKEN is set.";
            console.error(specificError);
            throw new Error(specificError);
          }
          
          if (attempt < 2) {
            // Wait before retry (exponential backoff)
            const waitTime = 1000 * (attempt + 1);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // All retries failed
      const finalError = lastError instanceof Error ? lastError.message : String(lastError);
      const errorDetails = `Failed to save to blob storage after 3 attempts. Last error: ${finalError}`;
      console.error(errorDetails);
      if (lastError instanceof Error && lastError.stack) {
        console.error("Final error stack:", lastError.stack);
      }
      throw new Error(errorDetails);
    } else {
      // On localhost: Save to filesystem
      fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
      console.log(`Successfully saved ${videos.length} videos to filesystem`);
    }
  } catch (error) {
    console.error("Error saving videos:", error);
    if (error instanceof Error && error.stack) {
      console.error("Full error stack:", error.stack);
    }
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
  // Retry logic to handle race conditions
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`Delete video attempt ${attempt + 1}/3 for video ID:`, id);
      const videos = await getVideos();
      console.log(`Retrieved ${videos.length} videos from storage`);
      
      const filtered = videos.filter((v) => v.id !== id);
      
      if (filtered.length === videos.length) {
        console.log("Video not found in metadata:", id);
        return false; // Video not found
      }
      
      console.log(`Deleting video, ${filtered.length} videos will remain (removed 1)`);
      await saveVideos(filtered);
      console.log(`Successfully deleted video: ${id}`);
      return true;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`Delete video attempt ${attempt + 1}/3 failed:`, errorMessage);
      if (errorStack) {
        console.error("Error stack:", errorStack);
      }
      
      // If it's a blob storage configuration error, don't retry
      if (errorMessage.includes("BLOB_STORE") || 
          errorMessage.includes("BLOB_READ_WRITE_TOKEN") ||
          errorMessage.includes("not configured")) {
        console.error("Blob storage configuration error detected, not retrying");
        throw error; // Re-throw immediately
      }
      
      if (attempt < 2) {
        // Wait before retry
        const waitTime = 500 * (attempt + 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  const finalError = lastError instanceof Error ? lastError.message : String(lastError);
  const errorDetails = `Failed to delete video after 3 attempts. Last error: ${finalError}`;
  console.error(errorDetails);
  if (lastError instanceof Error && lastError.stack) {
    console.error("Final error stack:", lastError.stack);
  }
  throw new Error(errorDetails);
}

