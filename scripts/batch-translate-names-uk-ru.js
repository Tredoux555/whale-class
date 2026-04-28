// Batch translates work names into Ukrainian (name_uk) and Russian (name_ru)
// for all works in Whale Class classroom.
// Run: node scripts/batch-translate-names-uk-ru.js
// Requires: DB columns name_uk and name_ru already added (migration step first)

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk").default;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69"; // Whale Class
const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, n = 4, d = 2000) {
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) {
      if (i === n - 1) throw e;
      await new Promise(r => setTimeout(r, d));
    }
  }
}

async function translateWorkNames(workName, locale, langName, amiTerms) {
  return retry(async () => {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      tools: [{
        name: "save_name",
        description: `Save the ${langName} translation of a Montessori work name`,
        input_schema: {
          type: "object",
          properties: {
            translated_name: {
              type: "string",
              description: `The ${langName} name for this Montessori work. Keep in English if the work name is a proper noun or commonly used in English in Montessori schools.`
            }
          },
          required: ["translated_name"]
        }
      }],
      tool_choice: { type: "tool", name: "save_name" },
      messages: [{
        role: "user",
        content: `Translate this Montessori work name into ${langName}. AMI Montessori area terms: ${amiTerms}. Work name: "${workName}"`
      }]
    });
    const toolBlock = resp.content.find(b => b.type === "tool_use");
    if (!toolBlock) throw new Error("No tool_use block");
    return toolBlock.input.translated_name || workName;
  }, 4, 2000);
}

async function main() {
  // Fetch all works missing uk or ru names
  const { data: works, error } = await sb
    .from("montree_classroom_curriculum_works")
    .select("name")
    .eq("classroom_id", CID)
    .not("name", "is", null)
    .order("name", { ascending: true });

  if (error) { console.error("DB fetch failed:", error.message); process.exit(1); }
  console.log(`Found ${works.length} works to translate\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < works.length; i++) {
    const work = works[i];
    try {
      const [ukName, ruName] = await Promise.all([
        translateWorkNames(
          work.name, 'uk', 'Ukrainian',
          'Практичне Життя, Сенсорний, Математика, Мова, Культура'
        ),
        translateWorkNames(
          work.name, 'ru', 'Russian',
          'Практическая Жизнь, Сенсорика, Математика, Язык, Культура'
        ),
      ]);

      await retry(async () => {
        const { error: upErr } = await sb
          .from("montree_classroom_curriculum_works")
          .update({ name_uk: ukName, name_ru: ruName })
          .eq("classroom_id", CID)
          .ilike("name", work.name);
        if (upErr) throw new Error(upErr.message);
      }, 3, 2000);

      ok++;
      process.stdout.write(`[${i + 1}/${works.length}] "${work.name}" → uk:"${ukName}" ru:"${ruName}"\n`);
    } catch (e) {
      fail++;
      console.log(`FAIL [${i + 1}/${works.length}] "${work.name}": ${e.message.slice(0, 80)}`);
    }

    if (i < works.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✅ Done: ${ok} translated, ${fail} failed`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
