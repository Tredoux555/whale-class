require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk").default;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69";

function timeout(ms) { return new Promise((_,rej) => setTimeout(()=>rej(new Error("timeout")),ms)); }

async function retry(fn, n=3) {
  for (let i=0; i<n; i++) {
    try { return await Promise.race([fn(), timeout(30000)]); }
    catch(e) { if (i===n-1) throw e; await new Promise(r=>setTimeout(r,1500)); }
  }
}

const EN_TOOL = { name: "save_guide", description: "Save Quick Guide", input_schema: {
  type: "object", properties: {
    quick_guide: { type: "string" },
    presentation_steps: { type: "array", items: { type: "object", properties: { step:{type:"number"}, title:{type:"string"}, description:{type:"string"}, tip:{type:"string"} }}},
    materials: { type: "array", items: { type: "string" } },
    direct_aims: { type: "array", items: { type: "string" } },
    control_of_error: { type: "string" },
    why_it_matters: { type: "string" },
    parent_description: { type: "string" }
  }, required: ["quick_guide","materials","why_it_matters","parent_description"]
}};

const ZH_TOOL = { name: "save_zh", description: "Save Chinese Guide", input_schema: {
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

async function callHaiku(tools, toolName, prompt, sys) {
  return retry(async () => {
    const r = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 4096,
      tools, tool_choice: { type: "tool", name: toolName },
      ...(sys ? { system: sys } : {}),
      messages: [{ role: "user", content: prompt }],
    });
    const tb = r.content.find(b => b.type === "tool_use");
    if (!tb) throw new Error("No tool_use");
    return tb.input;
  });
}

async function main() {
  // Phase 1: Custom works needing English + Chinese
  const { data: noEn } = await sb.from("montree_classroom_curriculum_works")
    .select("name,parent_description,why_it_matters")
    .eq("classroom_id", CID).is("quick_guide", null).order("name");
  console.log(`Phase 1: ${noEn?.length || 0} works need EN+ZH`);

  let ok1=0, f1=0;
  for (const w of (noEn||[])) {
    try {
      const ctx = w.parent_description ? ` Context: ${w.parent_description}` : "";
      const en = await callHaiku([EN_TOOL], "save_guide",
        `Generate a Montessori Quick Guide for "${w.name}".${ctx}`,
        "You are an AMI-trained Montessori teacher. Generate a comprehensive Quick Guide.");
      const fields = {};
      for (const k of ["quick_guide","presentation_steps","materials","direct_aims","control_of_error","why_it_matters","parent_description"]) if (en[k]) fields[k] = en[k];
      const zh = await callHaiku([ZH_TOOL], "save_zh",
        `Translate to Simplified Chinese (Montessori terms):\n${JSON.stringify(fields)}`);
      zh.name = w.name;
      const { error } = await sb.from("montree_classroom_curriculum_works")
        .update({ quick_guide: en.quick_guide, presentation_steps: en.presentation_steps,
          materials: en.materials, direct_aims: en.direct_aims,
          control_of_error: en.control_of_error||null,
          why_it_matters: en.why_it_matters||w.why_it_matters||null,
          parent_description: en.parent_description||w.parent_description||null,
          guide_content_zh: zh })
        .eq("classroom_id", CID).ilike("name", w.name);
      if (error) throw new Error(error.message);
      ok1++; console.log(`P1 [${ok1+f1}/${noEn.length}] OK: ${w.name}`);
    } catch (e) {
      f1++; console.log(`P1 [${ok1+f1}/${noEn.length}] FAIL: ${w.name} - ${e.message.slice(0,80)}`);
    }
  }
  console.log(`Phase 1 done. OK:${ok1} FAIL:${f1}\n`);

  // Phase 2: Works with English but no Chinese
  const { data: noZh } = await sb.from("montree_classroom_curriculum_works")
    .select("name,quick_guide,presentation_steps,materials,direct_aims,control_of_error,why_it_matters,parent_description")
    .eq("classroom_id", CID).is("guide_content_zh", null).not("quick_guide", "is", null).order("name");
  console.log(`Phase 2: ${noZh?.length || 0} works need ZH`);

  let ok2=0, f2=0;
  for (const w of (noZh||[])) {
    try {
      const fields = {};
      for (const k of ["quick_guide","presentation_steps","materials","direct_aims","control_of_error","why_it_matters","parent_description"]) if (w[k]) fields[k] = w[k];
      const zh = await callHaiku([ZH_TOOL], "save_zh",
        `Translate to Simplified Chinese (Montessori terms):\n${JSON.stringify(fields)}`);
      zh.name = w.name;
      const { error } = await sb.from("montree_classroom_curriculum_works")
        .update({ guide_content_zh: zh }).eq("classroom_id", CID).ilike("name", w.name);
      if (error) throw new Error(error.message);
      ok2++;
      if (ok2 % 10 === 0) console.log(`P2: ${ok2}/${noZh.length}`);
    } catch (e) {
      f2++; console.log(`P2 FAIL: ${w.name} - ${e.message.slice(0,80)}`);
    }
  }

  console.log(`\n=== FINAL ===`);
  console.log(`Phase 1 (EN+ZH custom): OK:${ok1} FAIL:${f1}`);
  console.log(`Phase 2 (ZH remaining): OK:${ok2} FAIL:${f2}`);
  const { data: miss } = await sb.from("montree_classroom_curriculum_works")
    .select("name").eq("classroom_id", CID)
    .or("quick_guide.is.null,guide_content_zh.is.null").order("name");
  if (miss?.length) {
    console.log(`Still missing (${miss.length}):`);
    miss.forEach(w => console.log(`  - ${w.name}`));
  } else {
    console.log(`\n✅ ALL WORKS HAVE BOTH ENGLISH AND CHINESE GUIDES`);
  }
}
main().catch(e => console.error("Fatal:", e));
