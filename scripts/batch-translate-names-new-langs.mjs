/**
 * Batch translate work names into 6 new locales: fr, pt, nl, it, ja, ko
 * Uses Haiku tool_use for structured output (prevents JSON corruption in CJK scripts)
 * Run: node scripts/batch-translate-names-new-langs.mjs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CID = "51e7adb6-cd18-4e03-b707-eceb0a1d2e69";

const LOCALE_CONFIG = {
  fr: {
    name: "French",
    instruction: "Translate this Montessori work name into French. Use formal Montessori AMI terminology where applicable (Vie Pratique, Sensoriel, Mathématiques, Langage, Culture). Return only the translated name, no explanation.",
  },
  pt: {
    name: "Brazilian Portuguese",
    instruction: "Translate this Montessori work name into Brazilian Portuguese. Use formal Montessori AMI terminology where applicable (Vida Prática, Sensorial, Matemática, Linguagem, Cultural). Return only the translated name, no explanation.",
  },
  nl: {
    name: "Dutch",
    instruction: "Translate this Montessori work name into Dutch. Use formal Montessori AMI terminology where applicable (Praktisch Leven, Zintuiglijk, Wiskunde, Taal, Cultureel). Return only the translated name, no explanation.",
  },
  it: {
    name: "Italian",
    instruction: "Translate this Montessori work name into Italian. Use formal Montessori AMI terminology where applicable (Vita Pratica, Sensoriale, Matematica, Linguaggio, Culturale). Return only the translated name, no explanation.",
  },
  ja: {
    name: "Japanese",
    instruction: "Translate this Montessori work name into Japanese. Use polite です/ます form. Use standard Montessori terminology in Japanese where applicable (日常生活, 感覚, 算数, 言語, 文化). Return only the translated name in Japanese, no explanation.",
  },
  ko: {
    name: "Korean",
    instruction: "Translate this Montessori work name into Korean. Use formal 합쇼체/해요체 register. Use standard Montessori terminology in Korean where applicable (일상생활, 감각, 수학, 언어, 문화). Return only the translated name in Korean, no explanation.",
  },
};

const TRANSLATE_TOOL = {
  name: "save_translation",
  description: "Save the translated work name",
  input_schema: {
    type: "object",
    properties: {
      translated_name: {
        type: "string",
        description: "The translated Montessori work name",
      },
    },
    required: ["translated_name"],
  },
};

async function retry(fn, n = 4, d = 2000) {
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === n - 1) throw e;
      console.log(`    Retry ${i + 1}/${n - 1} after error: ${e.message}`);
      await new Promise((r) => setTimeout(r, d * (i + 1)));
    }
  }
}

async function translateWorkName(englishName, locale) {
  const cfg = LOCALE_CONFIG[locale];
  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    tools: [TRANSLATE_TOOL],
    tool_choice: { type: "tool", name: "save_translation" },
    messages: [
      {
        role: "user",
        content: `${cfg.instruction}\n\nWork name: "${englishName}"`,
      },
    ],
  });

  const toolUse = resp.content.find(
    (b) => b.type === "tool_use" && b.name === "save_translation"
  );
  if (!toolUse || !toolUse.input?.translated_name) {
    throw new Error(`No tool_use block for "${englishName}" in ${locale}`);
  }
  return toolUse.input.translated_name.trim();
}

async function processLocale(locale) {
  const cfg = LOCALE_CONFIG[locale];
  console.log(`\n=== ${locale.toUpperCase()} (${cfg.name}) ===`);

  const { data: works, error } = await sb
    .from("montree_classroom_curriculum_works")
    .select("name")
    .eq("classroom_id", CID)
    .is(`name_${locale}`, null)
    .order("sequence", { ascending: true });

  if (error) {
    console.error(`  Error fetching works for ${locale}:`, error.message);
    return;
  }

  if (!works || works.length === 0) {
    console.log(`  All works already translated for ${locale} ✓`);
    return;
  }

  console.log(`  ${works.length} works to translate`);

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < works.length; i += 5) {
    const batch = works.slice(i, i + 5);
    console.log(
      `  Batch ${Math.floor(i / 5) + 1}/${Math.ceil(works.length / 5)} (works ${i + 1}-${Math.min(i + 5, works.length)})`
    );

    for (const work of batch) {
      try {
        const translatedName = await retry(
          () => translateWorkName(work.name, locale),
          4,
          2000
        );

        const { error: updateError } = await sb
          .from("montree_classroom_curriculum_works")
          .update({ [`name_${locale}`]: translatedName })
          .eq("classroom_id", CID)
          .ilike("name", work.name);

        if (updateError) {
          console.error(
            `    ✗ UPDATE failed for "${work.name}": ${updateError.message}`
          );
          failed++;
        } else {
          console.log(`    ✓ "${work.name}" → "${translatedName}"`);
          translated++;
        }
      } catch (e) {
        console.error(`    ✗ FAILED "${work.name}": ${e.message}`);
        failed++;
      }
    }

    if (i + 5 < works.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(
    `  ${locale} done: ${translated} translated, ${failed} failed out of ${works.length}`
  );
}

async function main() {
  console.log("Batch translating work names into 6 new locales...");
  console.log("Classroom:", CID);

  const locales = ["fr", "pt", "nl", "it", "ja", "ko"];

  for (const locale of locales) {
    await processLocale(locale);
  }

  console.log("\n=== ALL DONE ===");

  // Final verification
  for (const locale of locales) {
    const { count } = await sb
      .from("montree_classroom_curriculum_works")
      .select("*", { count: "exact", head: true })
      .eq("classroom_id", CID)
      .not(`name_${locale}`, "is", null);
    console.log(`  ${locale}: ${count} works translated`);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
