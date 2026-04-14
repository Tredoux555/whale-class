require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk").default;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69";

async function retry(fn, n=4, d=2000) {
  for (let i=0; i<n; i++) {
    try { return await fn(); } catch(e) {
      if (i===n-1) throw e;
      await new Promise(r=>setTimeout(r,d));
    }
  }
}

// tool_use schema — Haiku returns structured JSON, API handles serialization. Zero parse errors.
const TRANSLATE_TOOL = {
  name: "save_chinese_guide",
  description: "Save the Chinese translation of a Montessori Quick Guide",
  input_schema: {
    type: "object",
    properties: {
      quick_guide: { type: "string", description: "Chinese translation of the quick guide summary" },
      presentation_steps: { type: "array", items: { type: "object", properties: {
        step: { type: "number" }, title: { type: "string" }, description: { type: "string" }, tip: { type: "string" }
      }}},
      materials: { oneOf: [{ type: "array", items: { type: "string" }}, { type: "string" }] },
      direct_aims: { oneOf: [{ type: "array", items: { type: "string" }}, { type: "string" }] },
      control_of_error: { type: "string" },
      why_it_matters: { type: "string" },
      parent_description: { type: "string" }
    }, required: ["quick_guide"]
  }
};

async function translateWork(work) {
  const fields = {};
  for (const k of ["quick_guide","presentation_steps","materials","direct_aims","control_of_error","why_it_matters","parent_description"]) {
    if (work[k]) fields[k] = work[k];
  }
  return retry(async () => {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 4096,
      tools: [TRANSLATE_TOOL], tool_choice: { type: "tool", name: "save_chinese_guide" },
      messages: [{ role: "user", content: `Translate this Montessori Quick Guide to Simplified Chinese. Use standard Chinese Montessori terminology.\n\n${JSON.stringify(fields)}` }],
    });
    const toolBlock = resp.content.find(b => b.type === "tool_use");
    if (!toolBlock) throw new Error("No tool_use block in response");
    const zh = toolBlock.input;
    zh.name = work.name;
    return zh;
  }, 4, 2000);
}

async function main() {
  const {data:works} = await retry(async () => {
    const r = await sb.from("montree_classroom_curriculum_works")
      .select("name,quick_guide,presentation_steps,materials,direct_aims,control_of_error,why_it_matters,parent_description")
      .eq("classroom_id",CID).is("guide_content_zh",null).not("quick_guide","is",null)
      .order("name",{ascending:true});
    if (r.error) throw new Error(r.error.message);
    return r;
  }, 5, 3000);
  console.log(`Translating ${works.length} works...`);
  let ok=0, fail=0, fails=[];
  for (let i=0; i<works.length; i++) {
    try {
      const zh = await translateWork(works[i]);
      await retry(async () => {
        const {error} = await sb.from("montree_classroom_curriculum_works")
          .update({guide_content_zh:zh}).eq("classroom_id",CID).ilike("name",works[i].name);
        if (error) throw new Error(error.message);
      }, 3, 2000);
      ok++;
      if (ok % 20 === 0) console.log(`${ok}/${works.length} done`);
    } catch(e) {
      fail++; fails.push(works[i].name);
      console.log(`FAIL: ${works[i].name} - ${e.message.slice(0,80)}`);
    }
  }
  console.log(`\nDONE. OK:${ok} FAIL:${fail}`);
  if (fails.length) console.log("Failed:", fails.join(", "));
}
main().catch(console.error);
