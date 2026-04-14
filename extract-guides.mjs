import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const WHALE_CLASS_ID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69";

async function extractGuides() {
  console.log("Querying Whale Class curriculum works...");

  const { data, error } = await supabase
    .from("montree_classroom_curriculum_works")
    .select(
      "id, name, quick_guide, presentation_steps, materials, direct_aims, control_of_error, why_it_matters, parent_description"
    )
    .eq("classroom_id", WHALE_CLASS_ID);

  if (error) {
    console.error("Error querying works:", error);
    process.exit(1);
  }

  if (!data) {
    console.error("No data returned");
    process.exit(1);
  }

  console.log(`Found ${data.length} works`);

  // Write to file
  const outputPath = "/sessions/compassionate-loving-carson/guide_dump.json";
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`✓ Wrote ${data.length} works to ${outputPath}`);
  console.log(
    `File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`
  );
}

extractGuides().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
