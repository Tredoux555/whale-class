const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

function para(text, opts = {}) {
  const runs = [];
  if (typeof text === 'string') {
    runs.push(new TextRun({ text, ...opts }));
  } else {
    runs.push(...text);
  }
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

function bold(text) {
  return new TextRun({ text, bold: true });
}

function regular(text) {
  return new TextRun(text);
}

function bullet(text, ref = "bullets", level = 0) {
  const runs = typeof text === 'string' ? [new TextRun(text)] : text;
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: runs
  });
}

function numberedItem(text, ref = "numbers", level = 0) {
  const runs = typeof text === 'string' ? [new TextRun(text)] : text;
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 80 },
    children: runs
  });
}

function tableCell(text, opts = {}) {
  const runs = typeof text === 'string' ? [new TextRun({ text, ...opts })] : text;
  return new TableCell({
    borders,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: runs })]
  });
}

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "0D3330", type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial" })] })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "0D3330" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "1A5C52" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "2D7A6E" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "phases",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "Phase %1:", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "recs",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "R%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "HANDOFF: Smart Capture + Fire-and-Forget Strengthening", italics: true, size: 16, color: "888888" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Page ", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], size: 16 })]
        })]
      })
    },
    children: [
      // TITLE
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "HANDOFF", size: 48, bold: true, font: "Arial", color: "0D3330" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Smart Capture + Fire-and-Forget Strengthening", size: 32, bold: true, font: "Arial", color: "1A5C52" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "March 13, 2026 | Montree Platform | Priority #0", size: 20, color: "666666" })]
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "0D3330", space: 1 } },
        spacing: { after: 300 },
        children: []
      }),

      // EXECUTIVE SUMMARY
      heading("Executive Summary"),
      para("This handoff contains a self-executing, self-improving build plan for strengthening the Smart Capture photo identification system and the fire-and-forget background task architecture. It is designed so that a fresh Claude chat session can execute it autonomously from beginning to end, audit its own work, identify further improvements, and cycle the entire process again until zero improvements remain."),
      para([bold("Mission: "), regular("Build all 6 recommendations, using the 3\u00D73 audit methodology with continuous cycles until 3 consecutive clean audits. Then analyze what can be made stronger. Then build those improvements. Repeat until nothing can be improved.")]),
      para([bold("Methodology: "), regular("3\u00D73 = 3 plan-audit cycles + 3 build-audit cycles. After build, run audit cycles until 3 consecutive CLEAN (zero issues). Then self-analyze for further strengthening opportunities.")]),

      new Paragraph({ children: [new PageBreak()] }),

      // SYSTEM ARCHITECTURE
      heading("Current System Architecture"),

      heading("Smart Capture (Photo Insight)", HeadingLevel.HEADING_2),
      para("The Smart Capture system uses Sonnet vision + tool_use to identify Montessori works from photos taken by teachers. It operates through a confidence zone system:"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 2200, 2700, 2660],
        rows: [
          new TableRow({ children: [
            headerCell("Zone", 1800), headerCell("Threshold", 2200), headerCell("Behavior", 2700), headerCell("Current Gap", 2660)
          ]}),
          new TableRow({ children: [
            tableCell("GREEN", { width: 1800, shading: "D4EDDA" }),
            tableCell("\u2265 0.95 match AND \u2265 0.95 confidence", { width: 2200 }),
            tableCell("Auto-update progress silently", { width: 2700 }),
            tableCell("No override option if wrong", { width: 2660 })
          ]}),
          new TableRow({ children: [
            tableCell("AMBER", { width: 1800, shading: "FFF3CD" }),
            tableCell("0.5 \u2013 0.95 either score", { width: 2200 }),
            tableCell("Show confirm/reject buttons", { width: 2700 }),
            tableCell("No candidate pills for correction", { width: 2660 })
          ]}),
          new TableRow({ children: [
            tableCell("RED", { width: 1800, shading: "F8D7DA" }),
            tableCell("< 0.5 either score", { width: 2200 }),
            tableCell("Scenario-based (A/B/C/D)", { width: 2700 }),
            tableCell("Scenario D dead-ends", { width: 2660 })
          ]}),
        ]
      }),

      para(""),
      heading("Fire-and-Forget Architecture", HeadingLevel.HEADING_2),
      para("Three independent background task systems operate with no unified coordination:"),
      bullet([bold("photo-insight-store.ts"), regular(" \u2014 Module-level singleton Map using useSyncExternalStore. 60s client timeout, 30min eviction, max 50 entries. No retry on failure, no persistence.")]),
      bullet([bold("post-conversation-processor.ts"), regular(" \u2014 Extracts weekly summaries after Guru conversations via Haiku. Fire-and-forget with no retry, no queue.")]),
      bullet([bold("pattern-learner.ts"), regular(" \u2014 Cross-family pattern aggregation using EMA success rates. Processes corrections + confirmations into brain learnings.")]),

      heading("Corrections Pipeline", HeadingLevel.HEADING_2),
      para("Teacher corrections flow: PhotoInsightButton \u2192 corrections/route.ts \u2192 update_work_accuracy RPC \u2192 brain raw_learnings. Two paths: confirm (accuracy EMA only, p_was_correct: true) and correct (correction row + EMA + brain learning extraction)."),

      new Paragraph({ children: [new PageBreak()] }),

      // 3 STRUCTURAL GAPS
      heading("Three Structural Gaps Identified"),

      heading("Gap 1: No Override in Happy Path", HeadingLevel.HEADING_2),
      para("When Smart Capture confidently identifies a work (GREEN zone, \u2265 0.95), there is no UI for the teacher to correct it if the identification is wrong. The auto-update happens silently and the teacher has no recourse except to manually fix progress on the shelf. This erodes trust because occasional confident-but-wrong identifications have no feedback path."),

      heading("Gap 2: Dead-End Self-Learning Loop", HeadingLevel.HEADING_2),
      para("The corrections system records when a teacher corrects a wrong identification, but it does NOT record when the Guru gets it right. This means the accuracy EMA only trends downward over time (every correction pushes it lower, but confirmations never push it higher). The learning pipeline only sees failures, creating a skewed picture of actual accuracy."),

      heading("Gap 3: No Safety Net for Fire-and-Forget", HeadingLevel.HEADING_2),
      para("All three background processors (photo-insight, post-conversation, pattern-learner) use fire-and-forget patterns with no retry, no persistence, and no unified task queue. If a network hiccup causes a photo analysis to fail, the result is simply lost. If the browser tab closes during an in-progress analysis, all queued work vanishes. There is no localStorage backup for partially completed work."),

      new Paragraph({ children: [new PageBreak()] }),

      // THE 6 RECOMMENDATIONS
      heading("Six Recommendations to Build"),
      para("All 6 must be built in order. Each recommendation lists the exact files to modify, the changes required, and acceptance criteria."),

      // R1
      heading("R1: Clickable Candidate Pills Everywhere", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("CRITICAL | "), bold("Effort: "), regular("~45 min | "), bold("Files: "), regular("2")]),
      para("Add tappable candidate work name pills to AMBER zone confirm/reject UI AND Scenario D (unknown work). When a teacher rejects an AMBER identification or sees Scenario D, they should see 3-5 candidate work names from the curriculum as quick-tap correction options, plus a search fallback."),

      heading("Files to Modify:", HeadingLevel.HEADING_3),
      bullet([bold("app/api/montree/guru/photo-insight/route.ts"), regular(" \u2014 Return top 5 fuzzy match candidates (work_name + score) in API response alongside the primary match. Add a `candidates` array to the response JSON.")]),
      bullet([bold("components/montree/guru/PhotoInsightButton.tsx"), regular(" \u2014 Render candidate pills as tappable buttons below the reject action. On tap, auto-submit correction with selected candidate. For Scenario D, show candidates as the primary UI instead of dead-ending.")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("AMBER zone: After tapping reject, 3-5 candidate pills appear with work names"),
      bullet("Scenario D: Candidate pills shown immediately (no dead end)"),
      bullet("Tapping a candidate pill auto-submits the correction via /api/montree/guru/corrections"),
      bullet("Search fallback available if none of the candidates are correct"),
      bullet("i18n keys added for EN + ZH (pill labels, search placeholder)"),

      // R2
      heading("R2: Record Confirmations, Not Just Corrections", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("HIGH | "), bold("Effort: "), regular("~30 min | "), bold("Files: "), regular("3")]),
      para("Track when teachers confirm correct identifications so the accuracy EMA trends upward on successes, not just downward on failures. This closes the dead-end self-learning loop."),

      heading("Files to Modify:", HeadingLevel.HEADING_3),
      bullet([bold("components/montree/guru/PhotoInsightButton.tsx"), regular(" \u2014 In GREEN zone auto-update path, fire a background confirmation POST to corrections API after progress update succeeds. In AMBER zone confirm path, ensure existing confirm call sends p_was_correct: true (verify this works).")]),
      bullet([bold("app/api/montree/guru/corrections/route.ts"), regular(" \u2014 Verify the `action: 'confirm'` branch correctly calls `update_work_accuracy` RPC with `p_was_correct: true`. Add logging to track confirmation volume.")]),
      bullet([bold("lib/montree/guru/pattern-learner.ts"), regular(" \u2014 Ensure confirmations feed into the cross-family pattern aggregation. The pattern learner should see both successes and failures.")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("GREEN zone auto-updates also fire a background confirmation"),
      bullet("AMBER zone confirmations correctly update accuracy EMA upward"),
      bullet("Pattern learner receives both confirmation and correction signals"),
      bullet("No user-visible UI change (background operation)"),

      // R3
      heading("R3: Retry Wrapper for Fire-and-Forget Processors", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("HIGH | "), bold("Effort: "), regular("~60 min | "), bold("Files: "), regular("4")]),
      para("Create a unified retry wrapper that all three fire-and-forget systems use. Exponential backoff, max 3 retries, error categorization (retryable vs permanent)."),

      heading("Files to Create/Modify:", HeadingLevel.HEADING_3),
      bullet([bold("lib/montree/background-task-runner.ts"), regular(" (NEW) \u2014 Generic retry wrapper: `runWithRetry(taskFn, opts)`. Options: maxRetries (default 3), baseDelay (default 1000ms), maxDelay (default 10000ms), isRetryable (function to classify errors). Exponential backoff with jitter. Console.error on final failure. Returns Promise<T | null>.")]),
      bullet([bold("lib/montree/photo-insight-store.ts"), regular(" \u2014 Wrap the fetch call inside `runWithRetry()`. On final failure, set entry status to 'error' with a user-visible retry button.")]),
      bullet([bold("lib/montree/guru/post-conversation-processor.ts"), regular(" \u2014 Wrap Haiku extraction call inside `runWithRetry()`. Log failures but do not surface to user (background task).")]),
      bullet([bold("lib/montree/guru/pattern-learner.ts"), regular(" \u2014 Wrap pattern aggregation calls inside `runWithRetry()`. Same pattern as post-conversation.")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("All 3 processors use the shared retry wrapper"),
      bullet("Transient network errors (fetch failures, 5xx) are retried up to 3 times"),
      bullet("Permanent errors (4xx, validation) are NOT retried"),
      bullet("Photo insight shows retry button on final failure"),
      bullet("All final failures logged with console.error"),

      // R4
      heading("R4: Work Name Validation on Corrections", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("MEDIUM | "), bold("Effort: "), regular("~20 min | "), bold("Files: "), regular("1")]),
      para("When a teacher submits a correction with a work name, validate it exists in the classroom curriculum before recording. Prevents typos and garbage data from polluting the accuracy EMA."),

      heading("Files to Modify:", HeadingLevel.HEADING_3),
      bullet([bold("app/api/montree/guru/corrections/route.ts"), regular(" \u2014 After receiving corrected_work_name, query montree_classroom_curriculum to verify the work exists for that classroom. If not found, return 400 with an error message. Also fuzzy-match against curriculum to suggest the closest match if exact match fails.")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("Invalid work names rejected with 400 status"),
      bullet("Fuzzy suggestion returned when close match found"),
      bullet("Valid corrections proceed as before"),
      bullet("Existing correction flow unchanged for valid work names"),

      // R5
      heading("R5: Widen Duplicate Detection Window", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("LOW | "), bold("Effort: "), regular("~10 min | "), bold("Files: "), regular("1")]),
      para("The current duplicate detection window is 5 minutes. Teachers often photograph the same work multiple times during a session (different angles, retakes). Widen to 15 minutes to catch more duplicates."),

      heading("Files to Modify:", HeadingLevel.HEADING_3),
      bullet([bold("app/api/montree/guru/photo-insight/route.ts"), regular(" \u2014 Change the duplicate detection query window from 5 minutes to 15 minutes. The query filters `montree_media` by child_id + work_id + created_at within the window.")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("Duplicate detection window is 15 minutes (was 5)"),
      bullet("Duplicate photos correctly flagged and handled"),
      bullet("No regression in non-duplicate photo processing"),

      // R6
      heading("R6: localStorage Backup for In-Progress Analyses", HeadingLevel.HEADING_2),
      para([bold("Priority: "), regular("MEDIUM | "), bold("Effort: "), regular("~45 min | "), bold("Files: "), regular("1")]),
      para("When a teacher takes a photo and the analysis starts, persist the request to localStorage. If the browser tab closes and reopens, restore pending analyses and show their results (or re-trigger). This prevents lost work from accidental tab closures."),

      heading("Files to Modify:", HeadingLevel.HEADING_3),
      bullet([bold("lib/montree/photo-insight-store.ts"), regular(" \u2014 On analysis start, write entry (mediaId, childId, photoUrl, timestamp) to localStorage under key `montree_pending_analyses`. On store initialization, check localStorage for pending entries and restore them (if < 30 min old, re-trigger fetch; if result cached server-side, retrieve it). On analysis complete/error, remove from localStorage. Use try-catch around all localStorage operations (Safari private browsing throws).")]),

      heading("Acceptance Criteria:", HeadingLevel.HEADING_3),
      bullet("Pending analyses survive tab close/reopen within 30 minutes"),
      bullet("Stale entries (> 30 min) are cleaned up on init"),
      bullet("localStorage errors silently caught (no crash in private browsing)"),
      bullet("No duplicate analyses triggered on restore"),

      new Paragraph({ children: [new PageBreak()] }),

      // BUILD METHODOLOGY
      heading("Build Methodology: The 3\u00D73 Self-Improving Loop"),

      heading("Phase 1: Plan (3 Plan-Audit Cycles)", HeadingLevel.HEADING_2),
      para("Before writing any code, plan the implementation for each recommendation:"),
      numberedItem("Draft the implementation plan for R1-R6 (which lines to change, what to add)"),
      numberedItem("Audit the plan: check for missing edge cases, i18n gaps, type safety issues"),
      numberedItem("Revise the plan based on audit findings. Repeat until plan is clean."),

      heading("Phase 2: Build (3 Build-Audit Cycles)", HeadingLevel.HEADING_2),
      para("Implement all 6 recommendations in order (R1 through R6):"),
      numberedItem("Build R1 through R6, making surgical edits to the files listed above"),
      numberedItem("After each recommendation, audit the changed files for: TypeScript errors, missing null checks, i18n parity (EN/ZH), silent catches, unsafe .single() calls, hardcoded strings"),
      numberedItem("Fix all audit findings before moving to next recommendation"),

      heading("Phase 3: Continuous Audit (Until 3 Consecutive CLEAN)", HeadingLevel.HEADING_2),
      para("After all 6 recommendations are built:"),
      numberedItem("Run a full audit across ALL modified files. Check: TypeScript compilation, .single() vs .maybeSingle(), silent catches, i18n key parity, hardcoded English strings, missing error handling, React hook deps, stale closures"),
      numberedItem("Fix all findings"),
      numberedItem("Repeat audit. Continue until 3 CONSECUTIVE audit cycles return ZERO issues"),

      heading("Phase 4: Self-Improvement Analysis", HeadingLevel.HEADING_2),
      para("After 3 clean audits:"),
      numberedItem("Re-read all modified files end-to-end"),
      numberedItem("Analyze: What can be made stronger? What edge cases were missed? What architectural improvements would make this more robust?"),
      numberedItem("If improvements identified: go back to Phase 2 and build them"),
      numberedItem("If no improvements identified: the mission is complete"),

      heading("Phase 5: Repeat", HeadingLevel.HEADING_2),
      para([bold("The loop: "), regular("Build \u2192 Audit (3\u00D7 clean) \u2192 Analyze for improvements \u2192 Build improvements \u2192 Audit (3\u00D7 clean) \u2192 Analyze again \u2192 ... \u2192 Nothing left to improve \u2192 DONE")]),

      new Paragraph({ children: [new PageBreak()] }),

      // FILE REFERENCE
      heading("Complete File Reference"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [5000, 2000, 2360],
        rows: [
          new TableRow({ children: [
            headerCell("File Path", 5000), headerCell("Action", 2000), headerCell("Rec #", 2360)
          ]}),
          new TableRow({ children: [
            tableCell("app/api/montree/guru/photo-insight/route.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R1, R5", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("components/montree/guru/PhotoInsightButton.tsx", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R1, R2", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("app/api/montree/guru/corrections/route.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R2, R4", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/guru/pattern-learner.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R2, R3", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/background-task-runner.ts", { width: 5000 }),
            tableCell("NEW", { width: 2000 }),
            tableCell("R3", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/photo-insight-store.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R3, R6", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/guru/post-conversation-processor.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R3", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/i18n/en.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R1", { width: 2360 })
          ]}),
          new TableRow({ children: [
            tableCell("lib/montree/i18n/zh.ts", { width: 5000 }),
            tableCell("MODIFY", { width: 2000 }),
            tableCell("R1", { width: 2360 })
          ]}),
        ]
      }),

      para(""),
      heading("i18n Keys to Add", HeadingLevel.HEADING_2),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3500, 2930, 2930],
        rows: [
          new TableRow({ children: [
            headerCell("Key", 3500), headerCell("EN", 2930), headerCell("ZH", 2930)
          ]}),
          new TableRow({ children: [
            tableCell("photoInsight.candidates", { width: 3500 }),
            tableCell("Did you mean:", { width: 2930 }),
            tableCell("\u60A8\u662F\u6307:", { width: 2930 })
          ]}),
          new TableRow({ children: [
            tableCell("photoInsight.searchOther", { width: 3500 }),
            tableCell("Search other works", { width: 2930 }),
            tableCell("\u641C\u7D22\u5176\u4ED6\u5DE5\u4F5C", { width: 2930 })
          ]}),
          new TableRow({ children: [
            tableCell("photoInsight.retryAnalysis", { width: 3500 }),
            tableCell("Retry", { width: 2930 }),
            tableCell("\u91CD\u8BD5", { width: 2930 })
          ]}),
          new TableRow({ children: [
            tableCell("photoInsight.analysisFailed", { width: 3500 }),
            tableCell("Analysis failed", { width: 2930 }),
            tableCell("\u5206\u6790\u5931\u8D25", { width: 2930 })
          ]}),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // EXECUTION INSTRUCTIONS
      heading("Execution Instructions for Fresh Chat"),
      para("Copy-paste the following into a new Claude chat session to begin autonomous execution:"),

      new Paragraph({
        spacing: { after: 200 },
        shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "Read docs/handoffs/HANDOFF_SMART_CAPTURE_STRENGTHENING.docx then execute the complete build plan autonomously. Use the 3\u00D73 methodology: plan-audit \u00D73, build-audit \u00D73, continuous audit until 3 consecutive CLEAN. After clean audits, analyze what can be strengthened further, build those improvements, audit again. Repeat the entire improvement cycle until you cannot identify any further improvements. Do not ask what to do next \u2014 just keep going until the mission is complete.", size: 20, font: "Courier New" })]
      }),

      heading("Pre-Flight Checklist", HeadingLevel.HEADING_2),
      para("Before starting the build, verify:"),
      bullet("All 6 target files exist and are readable"),
      bullet("npm run build completes without errors (baseline)"),
      bullet("i18n en.ts and zh.ts have equal key counts (parity check)"),
      bullet("No uncommitted changes that would conflict"),

      heading("Post-Build Verification", HeadingLevel.HEADING_2),
      para("After all 6 recommendations are built and audited:"),
      bullet("npm run build \u2014 zero errors"),
      bullet("i18n parity check \u2014 en.ts and zh.ts have same number of keys"),
      bullet("All new code has error handling (no silent catches)"),
      bullet("All Supabase queries use .maybeSingle() where 0 rows is possible"),
      bullet("All user-facing strings use t() i18n calls"),
      bullet("React hook dependency arrays are complete"),
      bullet("AbortController cleanup on unmount for all fetch calls"),
      bullet("No hardcoded English strings in any modified file"),

      new Paragraph({ children: [new PageBreak()] }),

      // DEPLOY
      heading("Deploy"),
      para([bold("Status: "), regular("NOT YET PUSHED. All changes from Mar 8\u201313 sessions are local.")]),
      para([bold("Migration required: "), regular("psql $DATABASE_URL -f migrations/137_raz_4th_photo.sql")]),
      para([bold("Push command (from Mac): ")]),
      new Paragraph({
        spacing: { after: 200 },
        shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "cd ~/Desktop/Master\\ Brain/ACTIVE/whale && git add -A && git commit -m \"feat: smart capture strengthening + fire-and-forget retry + all Mar 8-13 changes\" && git push origin main", size: 18, font: "Courier New" })]
      }),

      para("After push, Railway auto-deploys from main. Run migration 137 manually against Supabase."),

      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "0D3330", space: 1 } },
        spacing: { before: 400, after: 200 },
        children: []
      }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "End of Handoff", italics: true, color: "888888", size: 20 })]
      }),
    ]
  }]
});

const outPath = process.argv[2] || '/sessions/laughing-vibrant-carson/mnt/whale/docs/handoffs/HANDOFF_SMART_CAPTURE_STRENGTHENING.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Created: ${outPath} (${buffer.length} bytes)`);
});
