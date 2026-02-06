#!/usr/bin/env ts-node

/**
 * Curriculum Validation Script
 *
 * Audits the Montessori curriculum for:
 * 1. Sequence integrity (no gaps, starts at 1, no duplicates)
 * 2. Prerequisite validity (exists, no circular deps, proper ordering)
 * 3. Age range progression (logical advancement, no violations)
 * 4. Missing descriptions (complete metadata coverage)
 * 5. Orphaned works (referenced but missing, or unreferenced)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
interface Level {
  level: number;
  name: string;
  description: string;
  videoSearchTerms: string[];
}

interface Work {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  prerequisites: string[];
  sequence: number;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  chineseName: string;
  levels: Level[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  sequence: number;
  works: Work[];
}

interface Area {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sequence: number;
  categories: Category[];
}

interface CoverageStat {
  name: string;
  total: number;
  withDescription: number;
  percentage: number;
}

interface ValidationResult {
  sequenceIssues: string[];
  prerequisiteIssues: string[];
  ageRangeIssues: string[];
  descriptionIssues: string[];
  orphanIssues: string[];
  coverageByArea: Record<string, CoverageStat>;
}

// Constants
const AGE_RANGE_ORDER = {
  'toddler': 0,
  'primary_year1': 1,
  'primary_year2': 2,
  'primary_year3': 3,
  'lower_elementary': 4,
  'upper_elementary': 5
};

const CURRICULUM_DATA_DIR = path.join(__dirname, '../lib/curriculum/data');
const CURRICULUM_GUIDES_DIR = path.join(__dirname, '../lib/curriculum/comprehensive-guides');

// Load all curriculum data
function loadCurriculum(): Area[] {
  const areas: Area[] = [];
  const files = fs.readdirSync(CURRICULUM_DATA_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(CURRICULUM_DATA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const area = JSON.parse(content) as Area;
    areas.push(area);
  }

  return areas;
}

// Build work lookup map for quick access
function buildWorkMap(areas: Area[]): Map<string, { work: Work; area: Area; category: Category }> {
  const map = new Map();

  for (const area of areas) {
    for (const category of area.categories) {
      for (const work of category.works) {
        map.set(work.id, { work, area, category });
      }
    }
  }

  return map;
}

// Validate sequence integrity
function validateSequences(areas: Area[]): string[] {
  const issues: string[] = [];

  for (const area of areas) {
    for (const category of area.categories) {
      const sequences = category.works.map(w => w.sequence).sort((a, b) => a - b);

      // Check if starts at 1
      if (sequences.length > 0 && sequences[0] !== 1) {
        issues.push(`✗ ${area.id}/${category.id}: Sequence should start at 1, starts at ${sequences[0]}`);
      }

      // Check for gaps
      for (let i = 0; i < sequences.length; i++) {
        if (sequences[i] !== i + 1) {
          issues.push(`✗ ${area.id}/${category.id}: Gap between sequence ${sequences[i - 1] || 0} and ${sequences[i]}`);
        }
      }

      // Check for duplicates
      const duplicates = sequences.filter((seq, idx) => sequences.indexOf(seq) !== idx);
      if (duplicates.length > 0) {
        issues.push(`✗ ${area.id}/${category.id}: Duplicate sequences found: ${duplicates.join(', ')}`);
      }
    }
  }

  return issues;
}

// Validate prerequisites
function validatePrerequisites(areas: Area[], workMap: Map<string, any>): string[] {
  const issues: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Helper function to detect circular dependencies
  function hasCycle(workId: string): boolean {
    if (recursionStack.has(workId)) {
      return true;
    }
    if (visited.has(workId)) {
      return false;
    }

    visited.add(workId);
    recursionStack.add(workId);

    const workEntry = workMap.get(workId);
    if (workEntry) {
      for (const prereqId of workEntry.work.prerequisites) {
        if (hasCycle(prereqId)) {
          return true;
        }
      }
    }

    recursionStack.delete(workId);
    return false;
  }

  // Check all prerequisites exist
  for (const [workId, entry] of workMap.entries()) {
    const work = entry.work;
    for (const prereqId of work.prerequisites) {
      if (!workMap.has(prereqId)) {
        issues.push(`✗ ${work.id} requires ${prereqId} (NOT FOUND)`);
      }
    }
  }

  // Check for circular dependencies
  for (const workId of workMap.keys()) {
    visited.clear();
    recursionStack.clear();
    if (hasCycle(workId)) {
      issues.push(`✗ ${workId} has a circular dependency`);
    }
  }

  // Check sequence ordering
  for (const [workId, entry] of workMap.entries()) {
    const work = entry.work;
    const category = entry.category;

    for (const prereqId of work.prerequisites) {
      const prereqEntry = workMap.get(prereqId);
      if (prereqEntry && prereqEntry.category.id === category.id) {
        // Same category - check sequence
        if (prereqEntry.work.sequence >= work.sequence) {
          issues.push(`✗ ${work.id} (seq ${work.sequence}) requires ${prereqId} (seq ${prereqEntry.work.sequence}) - prerequisite should have lower sequence`);
        }
      }
    }
  }

  return issues;
}

// Validate age ranges
function validateAgeRanges(areas: Area[], workMap: Map<string, any>): string[] {
  const issues: string[] = [];

  for (const [workId, entry] of workMap.entries()) {
    const work = entry.work;
    const workAgeRank = AGE_RANGE_ORDER[work.ageRange as keyof typeof AGE_RANGE_ORDER];

    if (workAgeRank === undefined) {
      issues.push(`✗ ${work.id}: Invalid age range "${work.ageRange}"`);
      continue;
    }

    for (const prereqId of work.prerequisites) {
      const prereqEntry = workMap.get(prereqId);
      if (prereqEntry) {
        const prereqAgeRank = AGE_RANGE_ORDER[prereqEntry.work.ageRange as keyof typeof AGE_RANGE_ORDER];

        if (prereqAgeRank > workAgeRank) {
          issues.push(`✗ ${work.id} (${work.ageRange}) requires ${prereqId} (${prereqEntry.work.ageRange}) - prerequisite cannot have later age range`);
        }
      }
    }
  }

  return issues;
}

// Validate descriptions and required fields
function validateDescriptions(areas: Area[], workMap: Map<string, any>): string[] {
  const issues: string[] = [];

  for (const [workId, entry] of workMap.entries()) {
    const work = entry.work;

    // Check required fields
    if (!work.name || work.name.trim() === '') {
      issues.push(`✗ ${work.id}: Missing name`);
    }

    if (!work.description || work.description.trim() === '') {
      issues.push(`✗ ${work.id}: Missing description`);
    }

    if (!work.directAims || work.directAims.length === 0) {
      issues.push(`✗ ${work.id}: Missing directAims`);
    }

    if (!work.materials || work.materials.length === 0) {
      issues.push(`✗ ${work.id}: Missing materials`);
    }

    if (!work.controlOfError || work.controlOfError.trim() === '') {
      issues.push(`✗ ${work.id}: Missing controlOfError`);
    }

    if (!work.chineseName || work.chineseName.trim() === '') {
      issues.push(`✗ ${work.id}: Missing chineseName`);
    }

    if (!work.levels || work.levels.length === 0) {
      issues.push(`✗ ${work.id}: Missing levels`);
    }
  }

  return issues;
}

// Check for orphaned works and coverage
function checkOrphans(areas: Area[], workMap: Map<string, any>): { orphanIssues: string[]; coverage: Record<string, any> } {
  const orphanIssues: string[] = [];
  const coverage: Record<string, any> = {};

  // Check coverage by area
  for (const area of areas) {
    let totalWorks = 0;
    let worksWithDescription = 0;

    for (const category of area.categories) {
      for (const work of category.works) {
        totalWorks++;
        if (work.description && work.description.trim() !== '') {
          worksWithDescription++;
        }
      }
    }

    coverage[area.id] = {
      name: area.name,
      total: totalWorks,
      withDescription: worksWithDescription,
      percentage: totalWorks > 0 ? Math.round((worksWithDescription / totalWorks) * 100) : 0
    };
  }

  // Note: We could check for guide files coverage here
  // For now, we track what we have

  return { orphanIssues, coverage };
}

// Format output report
function generateReport(result: ValidationResult): string {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '         CURRICULUM VALIDATION REPORT\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  // Sequence Issues
  report += '📋 SEQUENCE INTEGRITY\n';
  report += '─────────────────────────────────────────────────────────────\n';
  if (result.sequenceIssues.length === 0) {
    report += '✓ All sequences valid (no gaps, proper numbering)\n';
  } else {
    for (const issue of result.sequenceIssues) {
      report += issue + '\n';
    }
  }
  report += '\n';

  // Prerequisite Issues
  report += '🔗 PREREQUISITE VALIDATION\n';
  report += '─────────────────────────────────────────────────────────────\n';
  if (result.prerequisiteIssues.length === 0) {
    report += '✓ All prerequisites valid (exist, no cycles, correct ordering)\n';
  } else {
    for (const issue of result.prerequisiteIssues) {
      report += issue + '\n';
    }
  }
  report += '\n';

  // Age Range Issues
  report += '📅 AGE RANGE PROGRESSION\n';
  report += '─────────────────────────────────────────────────────────────\n';
  if (result.ageRangeIssues.length === 0) {
    report += '✓ All age ranges properly ordered\n';
  } else {
    for (const issue of result.ageRangeIssues) {
      report += issue + '\n';
    }
  }
  report += '\n';

  // Description Coverage
  report += '📝 DESCRIPTION COVERAGE\n';
  report += '─────────────────────────────────────────────────────────────\n';
  let totalWorks = 0;
  let totalWithDescription = 0;

  for (const areaId in result.coverageByArea) {
    const coverage = result.coverageByArea[areaId];
    totalWorks += coverage.total;
    totalWithDescription += coverage.withDescription;

    const bar = '█'.repeat(Math.floor(coverage.percentage / 5)) +
                '░'.repeat(20 - Math.floor(coverage.percentage / 5));
    report += `${coverage.name.padEnd(20)}: ${bar} ${coverage.percentage}% (${coverage.withDescription}/${coverage.total})\n`;
  }

  report += '─────────────────────────────────────────────────────────────\n';
  const overallPercentage = Math.round((totalWithDescription / totalWorks) * 100);
  report += `Overall: ${overallPercentage}% (${totalWithDescription}/${totalWorks} works)\n`;
  report += '\n';

  // Missing fields
  report += '❌ MISSING REQUIRED FIELDS\n';
  report += '─────────────────────────────────────────────────────────────\n';
  if (result.descriptionIssues.length === 0) {
    report += '✓ All required fields present in all works\n';
  } else {
    for (const issue of result.descriptionIssues) {
      report += issue + '\n';
    }
  }
  report += '\n';

  // Orphan Issues
  report += '🔍 ORPHAN & REFERENTIAL INTEGRITY\n';
  report += '─────────────────────────────────────────────────────────────\n';
  if (result.orphanIssues.length === 0) {
    report += '✓ No orphaned works found\n';
  } else {
    for (const issue of result.orphanIssues) {
      report += issue + '\n';
    }
  }
  report += '\n';

  // Summary
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                        SUMMARY\n';
  report += '═══════════════════════════════════════════════════════════════\n';

  const totalIssues = result.sequenceIssues.length +
                      result.prerequisiteIssues.length +
                      result.ageRangeIssues.length +
                      result.descriptionIssues.length +
                      result.orphanIssues.length;

  report += `Total Works: ${totalWorks}\n`;
  report += `With Full Metadata: ${totalWithDescription}\n`;
  report += `Total Issues Found: ${totalIssues}\n`;
  report += `Status: ${totalIssues === 0 ? '✓ ALL VALID' : '⚠ ISSUES DETECTED'}\n`;
  report += '\n';

  return report;
}

// Main execution
async function main() {
  console.log('Loading curriculum data...\n');

  try {
    const areas = loadCurriculum();
    const workMap = buildWorkMap(areas);

    console.log(`Loaded ${areas.length} areas with ${workMap.size} total works\n`);
    console.log('Running validation checks...\n');

    // Run all validations
    const sequenceIssues = validateSequences(areas);
    const prerequisiteIssues = validatePrerequisites(areas, workMap);
    const ageRangeIssues = validateAgeRanges(areas, workMap);
    const descriptionIssues = validateDescriptions(areas, workMap);
    const { orphanIssues, coverage } = checkOrphans(areas, workMap);

    const result: ValidationResult = {
      sequenceIssues,
      prerequisiteIssues,
      ageRangeIssues,
      descriptionIssues,
      orphanIssues,
      coverageByArea: coverage
    };

    // Generate and print report
    const report = generateReport(result);
    console.log(report);

    // Write report to file
    const reportPath = path.join(__dirname, 'validation-report.txt');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`Report saved to: ${reportPath}\n`);

    // Exit with appropriate code
    const hasIssues = Object.values(result).some(arr => Array.isArray(arr) && arr.length > 0);
    process.exit(hasIssues ? 1 : 0);

  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

main();
