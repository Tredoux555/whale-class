require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk").default;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69";

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }
async function retry(fn, n = 3) {
  for (let i = 0; i < n; i++) {
    try { return await Promise.race([fn(), timeout(45000)]); }
    catch (e) { if (i === n - 1) throw e; await new Promise(r => setTimeout(r, 2000)); }
  }
}

const EN_TOOL = { name: "save_guide", description: "Save a complete Montessori Quick Guide", input_schema: {
  type: "object", properties: {
    quick_guide: { type: "string", description: "A DETAILED step-by-step presentation guide of at least 200 words. Number each step. Include setup, presentation, variations, and extensions." },
    presentation_steps: { type: "array", items: { type: "object", properties: { step:{type:"number"}, title:{type:"string"}, description:{type:"string"}, tip:{type:"string"} }},
      description: "At least 5 detailed steps" },
    materials: { type: "array", items: { type: "string" }, description: "All materials needed" },
    direct_aims: { type: "array", items: { type: "string" }, description: "What the child learns" },
    control_of_error: { type: "string" },
    why_it_matters: { type: "string", description: "Developmental significance (50+ words)" },
    parent_description: { type: "string", description: "Warm explanation for parents (50+ words)" }
  }, required: ["quick_guide","presentation_steps","materials","direct_aims","why_it_matters","parent_description"]
}};

const ZH_TOOL = { name: "save_zh", description: "Save Chinese translation", input_schema: {
  type: "object", properties: {
    quick_guide: { type: "string" },
    presentation_steps: { type: "array", items: { type: "object", properties: { step:{type:"number"}, title:{type:"string"}, description:{type:"string"}, tip:{type:"string"} }}},
    materials: { oneOf: [{ type: "array", items: { type: "string" }}, { type: "string" }] },
    direct_aims: { oneOf: [{ type: "array", items: { type: "string" }}, { type: "string" }] },
    control_of_error: { type: "string" },
    why_it_matters: { type: "string" },
    parent_description: { type: "string" }
  }, required: ["quick_guide"]
}};

async function main() {
  const { data: works } = await sb.from("montree_classroom_curriculum_works")
    .select("name,quick_guide,parent_description,why_it_matters")
    .eq("classroom_id", CID).not("quick_guide", "is", null);
  const short = works?.filter(w => w.quick_guide.length < 50) || [];
  console.log(`${short.length} works with short guides to regenerate`);

  let ok = 0, fail = 0;
  for (const w of short) {
    try {
      const ctx = [
        w.parent_description ? `What parents should know: ${w.parent_description}` : "",
        w.why_it_matters ? `Why it matters: ${w.why_it_matters}` : "",
      ].filter(Boolean).join("\n");

      const en = await retry(async () => {
        const r = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001", max_tokens: 4096,
          tools: [EN_TOOL], tool_choice: { type: "tool", name: "save_guide" },
          system: "You are an experienced AMI-trained Montessori teacher writing curriculum guides. Generate a COMPREHENSIVE, DETAILED Quick Guide. The quick_guide field MUST be at least 200 words with numbered steps. Do NOT just echo the work name — write a full guide.",
          messages: [{ role: "user", content: `Generate a complete, detailed Quick Guide for the Montessori work "${w.name}".\n\n${ctx}\n\nIMPORTANT: Write at least 200 words for the quick_guide field with numbered presentation steps, setup instructions, variations, and extensions.` }],
        });
        const tb = r.content.find(b => b.type === "tool_use");
        if (!tb) throw new Error("No tool_use");
        if (!tb.input.quick_guide || tb.input.quick_guide.length < 50) throw new Error("Guide too short: " + tb.input.quick_guide?.length);
        return tb.input;
      });

      const fields = {};
      for (const k of ["quick_guide","presentation_steps","materials","direct_aims","control_of_error","why_it_matters","parent_description"]) if (en[k]) fields[k] = en[k];
      const zh = await retry(async () => {
        const r = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001", max_tokens: 4096,
          tools: [ZH_TOOL], tool_choice: { type: "tool", name: "save_zh" },
          messages: [{ role: "user", content: `Translate to Simplified Chinese (standard Montessori terms):\n${JSON.stringify(fields)}` }],
        });
        const tb = r.content.find(b => b.type === "tool_use");
        if (!tb) throw new Error("No tool_use");
        return tb.input;
      });
      zh.name = w.name;

      const { error } = await sb.from("montree_classroom_curriculum_works")
        .update({
          quick_guide: en.quick_guide,
          presentation_steps: en.presentation_steps,
          materials: en.materials,
          direct_aims: en.direct_aims,
          control_of_error: en.control_of_error || null,
          guide_content_zh: zh
        })
        .eq("classroom_id", CID).ilike("name", w.name);
      if (error) throw new Error(error.message);
      ok++;
      console.log(`[${ok+fail}/${short.length}] OK: ${w.name} (${en.quick_guide.length} chars)`);
    } catch (e) {
      fail++;
      console.log(`[${ok+fail}/${short.length}] FAIL: ${w.name} - ${e.message.slice(0,100)}`);
    }
  }
  console.log(`\nDone. OK:${ok} FAIL:${fail}`);
}
main().catch(e => console.error("Fatal:", e));
