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

// Get videos from local filesystem (localhost) or Supabase Storage (Vercel)
export async function getVideos(): Promise<Video[]> {
  const isVercel = process.env.VERCEL === "1";
  
  try {
    if (isVercel) {
      // On Vercel: Read from Supabase Storage
      try {
        const supabase = createSupabaseAdmin();
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(METADATA_FILE);

        if (error) {
          // Check if it's a "not found" error (file doesn't exist yet)
          if (error.message.includes("not found") || error.message.includes("404")) {
            console.log("Metadata file doesn't exist yet (first video), returning empty array");
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
        return Array.isArray(videos) ? videos : [];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error getting videos from Supabase:", errorMessage);
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
      return Array.isArray(videos) ? videos : [];
    }
  } catch (error) {
    console.error("Error getting videos:", error);
    return [];
  }
}

// Save videos to local filesystem (localhost) or Supabase Storage (Vercel)
export async function saveVideos(videos: Video[]): Promise<void> {
  const isVercel = process.env.VERCEL === "1";
  
  try {
    if (isVercel) {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const errorMsg = "Supabase Storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your Vercel project settings.";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // On Vercel: Save to Supabase Storage with retry
      const jsonData = JSON.stringify(videos, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      console.log(`Attempting to save ${videos.length} videos to Supabase Storage at path: ${METADATA_FILE}`);
      
      const supabase = createSupabaseAdmin();
      
      // Retry logic for Supabase Storage
      let lastError: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`Supabase save attempt ${attempt + 1}/3`);
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(METADATA_FILE, blob, {
              upsert: true,
              contentType: 'application/json',
            });

          if (uploadError) {
            throw uploadError;
          }

          console.log(`Successfully saved ${videos.length} videos to Supabase Storage`);
          return; // Success
        } catch (error) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(`Supabase save attempt ${attempt + 1}/3 failed:`, errorMessage);
          if (errorStack) {
            console.error("Error stack:", errorStack);
          }
          
          // Check for specific Supabase errors
          if (errorMessage.includes("Bucket not found") || errorMessage.includes("bucket")) {
            const specificError = "Supabase Storage bucket 'videos' is not configured or doesn't exist. Please create the bucket in Supabase dashboard.";
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
      const errorDetails = `Failed to save to Supabase Storage after 3 attempts. Last error: ${finalError}`;
      console.error(errorDetails);
      if (lastError instanceof Error && lastError.stack) {
        console.error("Final error stack:", lastError.stack);
      }
      throw new Error(errorDetails);
    } else {
      // On localhost: Save to filesystem (lazy import)
      const fs = require("fs");
      const { videosFile } = getLocalPaths();
      
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
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      console.log(`Add video attempt ${attempt + 1}/5 for video:`, video.id);
      
      // Wait a bit longer between retries to avoid race conditions
      if (attempt > 0) {
        const waitTime = 1000 * attempt; // 1s, 2s, 3s, 4s
        console.log(`Waiting ${waitTime}ms before retry to avoid race conditions...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const videos = await getVideos();
      console.log(`Retrieved ${videos.length} existing videos`);
      
      // Check if video already exists (prevent duplicates)
      if (videos.some(v => v.id === video.id)) {
        console.log("Video already exists, skipping add:", video.id);
        return;
      }
      
      videos.push(video);
      console.log(`Saving ${videos.length} videos to storage (including new video: ${video.id})...`);
      await saveVideos(videos);
      
      // Verify the save was successful by reading back (non-blocking)
      // Note: Supabase Storage may have eventual consistency, so we wait a bit
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for eventual consistency
        const verifyVideos = await getVideos();
        const videoExists = verifyVideos.some(v => v.id === video.id);
        
        if (videoExists) {
          console.log(`Successfully added video: ${video.id} (verified ${verifyVideos.length} total videos)`);
        } else {
          // Log warning but don't fail - eventual consistency might delay the read
          console.warn(`Video ${video.id} not found immediately after save (eventual consistency). Save operation completed successfully.`);
          console.log(`Successfully added video: ${video.id} (save completed, verification pending)`);
        }
      } catch (verifyError) {
        // Don't fail the operation if verification fails - the save succeeded
        console.warn(`Verification check failed for video ${video.id}, but save operation completed:`, verifyError);
        console.log(`Successfully added video: ${video.id} (save completed, verification skipped)`);
      }
      
      return; // Success
    } catch (error) {
      lastError = error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Add video attempt ${attempt + 1}/5 failed:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error("Error stack:", error.stack);
      }
    }
  }
  
  // All retries failed
  const finalError = `Failed to add video after 5 attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`;
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
      
      // If it's a Supabase configuration error, don't retry
      if (errorMessage.includes("Supabase") || 
          errorMessage.includes("bucket") ||
          errorMessage.includes("not configured")) {
        console.error("Supabase configuration error detected, not retrying");
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

