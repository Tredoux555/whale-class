// Lazy filesystem imports - only load when needed (not at module level)
// This prevents filesystem operations from executing during Vercel build
import { createSupabaseAdmin, STORAGE_BUCKET, METADATA_FILE } from "./supabase";

export interface Video {
  id: string;
  title: string;
  category: "song-of-week" | "phonics" | "weekly-phonics-sound" | "stories" | "montessori" | "recipes";
  subcategory?: "practical-life" | "maths" | "sensorial" | "english"; // Only for montessori
  videoUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  week?: string; // For song of the week
}

// Helper function to get filesystem paths (only called when needed)
function getLocalPaths() {
  const path = require("path");
  const dataDir = path.join(process.cwd(), "data");
  const videosFile = path.join(dataDir, "videos.json");
  return { dataDir, videosFile };
}

// Get videos from local filesystem (localhost) or Supabase Storage (cloud)
export async function getVideos(): Promise<Video[]> {
  // Use Supabase if on Vercel, Railway, or any cloud deployment
  const isCloud = process.env.VERCEL === "1" || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";
  
  try {
    if (isCloud) {
      // On Vercel: Read from Supabase Storage
      try {
        const supabase = createSupabaseAdmin();
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(METADATA_FILE);

        if (error) {
          // Check if it's a "not found" error (file doesn't exist yet)
          if (error.message.includes("not found") || error.message.includes("404")) {
            return [];
          }
          console.error("Error reading from Supabase Storage:", error.message);
          return [];
        }

        if (!data) {
          return [];
        }

        const text = await data.text();
        const videos = JSON.parse(text);
        const videosArray = Array.isArray(videos) ? videos : [];
        // Sort by newest first: uploadedAt DESC, or id DESC if uploadedAt doesn't exist
        return videosArray.sort((a, b) => {
          if (a.uploadedAt && b.uploadedAt) {
            return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
          }
          // Fallback to id DESC if uploadedAt doesn't exist
          return (b.id || '').localeCompare(a.id || '');
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return [];
      }
    } else {
      // On localhost: Read from filesystem (lazy import)
      const fs = require("fs");
      const { videosFile } = getLocalPaths();
      
      // Ensure data directory exists
      const { dataDir } = getLocalPaths();
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Initialize videos.json if it doesn't exist
      if (!fs.existsSync(videosFile)) {
        fs.writeFileSync(videosFile, JSON.stringify([], null, 2));
      }
      
      const data = fs.readFileSync(videosFile, "utf-8");
      const videos = JSON.parse(data);
      const videosArray = Array.isArray(videos) ? videos : [];
      // Sort by newest first: uploadedAt DESC, or id DESC if uploadedAt doesn't exist
      return videosArray.sort((a, b) => {
        if (a.uploadedAt && b.uploadedAt) {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        // Fallback to id DESC if uploadedAt doesn't exist
        return (b.id || '').localeCompare(a.id || '');
      });
    }
  } catch (error) {
    return [];
  }
}

// Save videos to local filesystem (localhost) or Supabase Storage (cloud)
export async function saveVideos(videos: Video[]): Promise<void> {
  // Use Supabase if on Vercel, Railway, or any cloud deployment
  const isCloud = process.env.VERCEL === "1" || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";
  
  try {
    if (isCloud) {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const errorMsg = "Supabase Storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel project settings.";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // On Vercel: Save to Supabase Storage with retry
      const jsonData = JSON.stringify(videos, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      const supabase = createSupabaseAdmin();
      
      // Retry logic for Supabase Storage
      let lastError: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(METADATA_FILE, blob, {
              upsert: true,
              contentType: 'application/json',
            });

          if (uploadError) {
            throw uploadError;
          }

          return; // Success
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          // Check for specific Supabase errors
          if (errorMessage.includes("Bucket not found") || errorMessage.includes("bucket")) {
            const specificError = "Supabase Storage bucket 'videos' is not configured or doesn't exist. Please create the bucket in Supabase dashboard.";
            console.error(specificError);
            throw new Error(specificError);
          }
          
          if (attempt < 2) {
            // Wait before retry (exponential backoff)
            const waitTime = 1000 * (attempt + 1);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      // All retries failed
      const finalError = lastError instanceof Error ? lastError.message : String(lastError);
      const errorDetails = `Failed to save to Supabase Storage after 3 attempts. Last error: ${finalError}`;
      throw new Error(errorDetails);
    } else {
      // On localhost: Save to filesystem (lazy import)
      const fs = require("fs");
      const { videosFile } = getLocalPaths();
      
      fs.writeFileSync(videosFile, JSON.stringify(videos, null, 2));
    }
  } catch (error) {
    throw error;
  }
}

export async function addVideo(video: Video): Promise<void> {
  // Retry logic to handle race conditions
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Wait a bit longer between retries to avoid race conditions
      if (attempt > 0) {
        const waitTime = 1000 * attempt; // 1s, 2s, 3s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const videos = await getVideos();
      
      // Check if video already exists (prevent duplicates)
      if (videos.some(v => v.id === video.id)) {
        return;
      }

      videos.push(video);
      await saveVideos(videos);
      
      // Verify the save was successful by reading back (non-blocking)
      // Note: Supabase Storage may have eventual consistency, so we wait a bit
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for eventual consistency
        const verifyVideos = await getVideos();
        const videoExists = verifyVideos.some(v => v.id === video.id);
      } catch (verifyError) {
        // Don't fail the operation if verification fails - the save succeeded
      }
      
      return; // Success
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  // All retries failed
  const finalError = `Failed to add video after 5 attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`;
  throw new Error(finalError);
}

export async function deleteVideo(id: string): Promise<boolean> {
  // Retry logic to handle race conditions
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const videos = await getVideos();
      
      const filtered = videos.filter((v) => v.id !== id);

      if (filtered.length === videos.length) {
        return false; // Video not found
      }

      await saveVideos(filtered);
      return true;
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // If it's a Supabase configuration error, don't retry
      if (errorMessage.includes("Supabase") ||
          errorMessage.includes("bucket") ||
          errorMessage.includes("not configured")) {
        throw error; // Re-throw immediately
      }

      if (attempt < 2) {
        // Wait before retry
        const waitTime = 500 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  const finalError = lastError instanceof Error ? lastError.message : String(lastError);
  const errorDetails = `Failed to delete video after 3 attempts. Last error: ${finalError}`;
  throw new Error(errorDetails);
}

