/**
 * Batch translate guide content into 7 new locales: fr, pt, nl, it, ja, ko, de
 * Translates the full JSONB guide_content structure stored in guide_content_{locale}
 * Mirrors scripts/batch-translate-guides-es.js pattern
 * Run: node scripts/batch-translate-guides-new-langs.mjs
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
    languageDirective: "en français",
    terminology:
      "Vie Pratique, Sensoriel, Mathématiques, Langage, Culture. Use formal vous register.",
  },
  pt: {
    name: "Brazilian Portuguese",
    languageDirective: "em português brasileiro",
    terminology:
      "Vida Prática, Sensorial, Matemática, Linguagem, Cultural. Use formal você register.",
  },
  nl: {
    name: "Dutch",
    languageDirective: "in het Nederlands",
    terminology:
      "Praktisch Leven, Zintuiglijk, Wiskunde, Taal, Cultureel. Use formal u/uw register.",
  },
  it: {
    name: "Italian",
    languageDirective: "in italiano",
    terminology:
      "Vita Pratica, Sensoriale, Matematica, Linguaggio, Culturale. Use formal Lei/Suo register.",
  },
  ja: {
    name: "Japanese",
    languageDirective: "日本語で",
    terminology:
      "日常生活, 感覚, 算数, 言語, 文化. Use polite です/ます form. Use お子さま for 'the child'.",
  },
  ko: {
    name: "Korean",
    languageDirective: "한국어로",
    terminology:
      "일상생활, 감각, 수학, 언어, 문화. Use formal 합쇼체/해요체 register. Use 자녀분 for 'the child'.",
  },
  de: {
    name: "German",
    languageDirective: "auf Deutsch",
    terminology:
      "Übungen des täglichen Lebens, Sinnesmaterial, Mathematik, Sprache, Kosmische Erziehung. Use formal Sie register.",
  },
};

function makeTranslateTool(locale) {
  const cfg = LOCALE_CONFIG[locale];
  return {
    name: "save_guide",
    description: `Save the translated Montessori work guide in ${cfg.name}`,
    input_schema: {
      type: "object",
      properties: {
        quick_guide: {
          type: "string",
          description: `A 2-3 sentence overview of this work for parents, written ${cfg.languageDirective}`,
        },
        presentation_steps: {
          type: "array",
          description: "Step-by-step presentation instructions",
          items: {
            type: "object",
            properties: {
              step: { type: "number" },
              title: { type: "string" },
              description: { type: "string" },
              tip: { type: "string" },
            },
            required: ["step", "title", "description"],
          },
        },
        materials: {
          type: "string",
          description: `Description of required materials, written ${cfg.languageDirective}`,
        },
        direct_aims: {
          type: "string",
          description: `The direct educational aims of this work, written ${cfg.languageDirective}`,
        },
        control_of_error: {
          type: "string",
          description: `How the child self-corrects, written ${cfg.languageDirective}`,
        },
        why_it_matters: {
          type: "string",
          description: `Why this work is developmentally important, written ${cfg.languageDirective}`,
        },
        parent_description: {
          type: "string",
          description: `A warm description for parents, written ${cfg.languageDirective}`,
        },
      },
      required: [
        "quick_guide",
        "presentation_steps",
        "materials",
        "direct_aims",
        "control_of_error",
        "why_it_matters",
        "parent_description",
      ],
    },
  };
}

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

async function translateGuide(work, locale) {
  const cfg = LOCALE_CONFIG[locale];
  const tool = makeTranslateTool(locale);

  const guideContent = work.quick_guide
    ? JSON.stringify({
        quick_guide: work.quick_guide,
        presentation_steps: work.presentation_steps || [],
        materials: work.materials || "",
        direct_aims: work.direct_aims || "",
        control_of_error: work.control_of_error || "",
        why_it_matters: work.why_it_matters || "",
        parent_description: work.parent_description || "",
      })
    : null;

  if (!guideContent || guideContent === "{}") {
    throw new Error(`No source guide content for "${work.name}"`);
  }

  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    tools: [tool],
    tool_choice: { type: "tool", name: "save_guide" },
    messages: [
      {
        role: "user",
        content: `Translate this Montessori work guide into ${cfg.name} (${cfg.languageDirective}).
Use AMI Montessori terminology: ${cfg.terminology}
Maintain warm, educational tone appropriate for Montessori guides.

Work name: "${work.name}"
English guide:
${guideContent}`,
      },
    ],
  });

  const toolUse = resp.content.find(
    (b) => b.type === "tool_use" && b.name === "save_guide"
  );
  if (!toolUse || !toolUse.input) {
    throw new Error(`No tool_use block for "${work.name}" in ${locale}`);
  }

  // Add the work name to the guide
  const result = { ...toolUse.input, name: work[`name_${locale}`] || work.name };
  return result;
}

async function processLocale(locale) {
  const cfg = LOCALE_CONFIG[locale];
  console.log(`\n=== ${locale.toUpperCase()} (${cfg.name}) ===`);

  // Fetch works that need guide translation (quick_guide exists but guide_content_{locale} is null)
  const { data: works, error } = await sb
    .from("montree_classroom_curriculum_works")
    .select(`name, name_${locale}, quick_guide, presentation_steps, materials, direct_aims, control_of_error, why_it_matters, parent_description`)
    .eq("classroom_id", CID)
    .is(`guide_content_${locale}`, null)
    .not("quick_guide", "is", null)
    .order("sequence", { ascending: true });

  if (error) {
    console.error(`  Error fetching works for ${locale}:`, error.message);
    return;
  }

  if (!works || works.length === 0) {
    console.log(`  All guides already translated for ${locale} ✓`);
    return;
  }

  console.log(`  ${works.length} guides to translate`);

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < works.length; i += 5) {
    const batch = works.slice(i, i + 5);
    console.log(
      `  Batch ${Math.floor(i / 5) + 1}/${Math.ceil(works.length / 5)} (works ${i + 1}-${Math.min(i + 5, works.length)})`
    );

    for (const work of batch) {
      try {
        const guideData = await retry(
          () => translateGuide(work, locale),
          4,
          2000
        );

        const updateObj = { [`guide_content_${locale}`]: guideData };

        const { error: updateError } = await sb
          .from("montree_classroom_curriculum_works")
          .update(updateObj)
          .eq("classroom_id", CID)
          .ilike("name", work.name);

        if (updateError) {
          console.error(
            `    ✗ UPDATE failed for "${work.name}": ${updateError.message}`
          );
          failed++;
        } else {
          console.log(`    ✓ "${work.name}"`);
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
  console.log("Batch translating guide content into 7 new locales...");
  console.log("Classroom:", CID);

  const locales = ["fr", "pt", "nl", "it", "ja", "ko", "de"];

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
      .not(`guide_content_${locale}`, "is", null);
    console.log(`  ${locale}: ${count} guides translated`);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
