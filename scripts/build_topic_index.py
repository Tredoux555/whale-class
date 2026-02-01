#!/usr/bin/env python3
"""
Automated Topic Index Builder for Montessori Guru
Scans 97K lines of Montessori books and builds topic_index.json

Key Topics to Index:
- Sensitive Periods (order, language, movement, sensory, small objects)
- Concentration & Attention
- Normalization & Deviations
- Discipline & Freedom
- Teacher Role (observation, intervention)
- Materials (practical life, sensorial, math, language)
- Environment (prepared environment)
- Development Stages
- Child Psychology
"""

import json
import re
import os
from pathlib import Path
from collections import defaultdict

# Path to sources
SOURCES_DIR = Path("/sessions/admiring-compassionate-feynman/mnt/whale/data/guru_knowledge/sources")
OUTPUT_FILE = Path("/sessions/admiring-compassionate-feynman/mnt/whale/data/guru_knowledge/topic_index.json")

# Topic patterns - keywords and phrases to look for
TOPIC_PATTERNS = {
    "sensitive_periods": {
        "order": [
            r"\bsensitive period.{0,20}order\b",
            r"\border.{0,20}sensitive period\b",
            r"\bneed for order\b",
            r"\blove of order\b",
            r"\bsense of order\b",
            r"\binner order\b",
            r"\bexternal order\b",
        ],
        "language": [
            r"\bsensitive period.{0,20}language\b",
            r"\blanguage.{0,20}sensitive period\b",
            r"\babsorption of language\b",
            r"\blanguage development\b",
            r"\bspoken language\b",
            r"\bwritten language\b",
            r"\blanguage acquisition\b",
        ],
        "movement": [
            r"\bsensitive period.{0,20}movement\b",
            r"\bmovement.{0,20}sensitive period\b",
            r"\bcoordination of movement\b",
            r"\brefinement of movement\b",
            r"\bmotor development\b",
            r"\bmuscular development\b",
        ],
        "sensory": [
            r"\bsensitive period.{0,20}sens",
            r"\bsensorial.{0,20}sensitive period\b",
            r"\bsense perception\b",
            r"\bsensory.{0,20}development\b",
            r"\brefinement of the senses\b",
        ],
        "small_objects": [
            r"\bsmall objects\b",
            r"\btiny.{0,10}objects\b",
            r"\bsmall things\b",
            r"\bminute details\b",
        ],
    },
    "concentration": {
        "development": [
            r"\bconcentration\b",
            r"\bpolarization of attention\b",
            r"\bdeep attention\b",
            r"\babsorbed in.{0,20}work\b",
            r"\bfocus.{0,20}attention\b",
            r"\bsustained attention\b",
        ],
        "obstacles": [
            r"\bobstacles to concentration\b",
            r"\binterrupt.{0,10}concentration\b",
            r"\bdistraction\b",
            r"\bunable to concentrate\b",
            r"\black of concentration\b",
            r"\battention.{0,10}wander\b",
        ],
        "fostering": [
            r"\bdevelop.{0,10}concentration\b",
            r"\bhelp.{0,10}concentrate\b",
            r"\bfoster.{0,10}concentration\b",
            r"\buninterrupted work\b",
            r"\bwork cycle\b",
        ],
    },
    "normalization": {
        "process": [
            r"\bnormalization\b",
            r"\bnormalized child\b",
            r"\bnormal development\b",
            r"\breturn to normal\b",
            r"\bbecome normalized\b",
        ],
        "characteristics": [
            r"\blove of work\b",
            r"\battachment to reality\b",
            r"\blove of silence\b",
            r"\bspontaneous discipline\b",
            r"\bjoyful obedience\b",
            r"\bsocial.{0,10}harmony\b",
        ],
        "deviations": [
            r"\bdeviations?\b",
            r"\bdeviant\b",
            r"\babnormal\b",
            r"\bdefects of character\b",
            r"\bfugue\b",
            r"\bbarrier\b",
            r"\bregression\b",
        ],
    },
    "discipline": {
        "natural_discipline": [
            r"\binner discipline\b",
            r"\bself-?discipline\b",
            r"\bnatural discipline\b",
            r"\bspontaneous discipline\b",
            r"\bdiscipline.{0,20}within\b",
        ],
        "freedom_limits": [
            r"\bfreedom\b",
            r"\bliberty\b",
            r"\blimits\b",
            r"\bboundaries\b",
            r"\bfreedom within limits\b",
            r"\bcontrolled freedom\b",
        ],
        "obedience": [
            r"\bobedience\b",
            r"\bobey\b",
            r"\bwill\b",
            r"\bself-?control\b",
            r"\binhibition\b",
        ],
    },
    "teacher_role": {
        "observation": [
            r"\bobservation\b",
            r"\bobserve the child\b",
            r"\bwatch.{0,10}child\b",
            r"\bscientific observation\b",
            r"\bstudy.{0,10}child\b",
        ],
        "intervention": [
            r"\binterven\w+\b",
            r"\bwhen to help\b",
            r"\bwhen to step back\b",
            r"\baid.{0,10}development\b",
            r"\bguide\b",
            r"\bdirectress\b",
        ],
        "preparation": [
            r"\bprepared environment\b",
            r"\bprepare the environment\b",
            r"\bpreparing\b",
            r"\barrange.{0,10}material\b",
            r"\bset up\b",
        ],
    },
    "materials": {
        "practical_life": [
            r"\bpractical life\b",
            r"\bdaily living\b",
            r"\bcare of self\b",
            r"\bcare of environment\b",
            r"\bpouring\b",
            r"\btransferring\b",
            r"\bdressing frames\b",
            r"\bbuttons?\b",
            r"\bzippers?\b",
        ],
        "sensorial": [
            r"\bsensorial\b",
            r"\bcylinder blocks?\b",
            r"\bpink tower\b",
            r"\bbroad stair\b",
            r"\blong rods?\b",
            r"\bcolour tablets?\b",
            r"\bgeometric\b",
            r"\bsmooth and rough\b",
            r"\bbaric\b",
            r"\bthermic\b",
        ],
        "math": [
            r"\bnumber rods?\b",
            r"\bspindle\b",
            r"\bcards and counters\b",
            r"\bgolden beads?\b",
            r"\bseguin boards?\b",
            r"\bteen board\b",
            r"\bten board\b",
            r"\bbead.{0,10}material\b",
            r"\bdecimals?\b",
            r"\barithmetic\b",
        ],
        "language_materials": [
            r"\bsandpaper letters?\b",
            r"\bmoveable alphabet\b",
            r"\bmetal insets?\b",
            r"\bwriting\b",
            r"\breading\b",
            r"\bphonetic\b",
            r"\bgrammar\b",
        ],
    },
    "development_stages": {
        "absorbent_mind": [
            r"\babsorbent mind\b",
            r"\bunconscious absorption\b",
            r"\bconscious absorption\b",
            r"\bmneme\b",
            r"\bpsychic embryo\b",
        ],
        "planes": [
            r"\bplane of development\b",
            r"\bfirst plane\b",
            r"\bsecond plane\b",
            r"\b0-6\b",
            r"\b6-12\b",
            r"\b3-6\b",
            r"\bearly childhood\b",
        ],
        "nebulae": [
            r"\bnebula\w*\b",
            r"\blanguage nebula\b",
            r"\bpotentialities\b",
        ],
    },
    "child_psychology": {
        "independence": [
            r"\bindependence\b",
            r"\bindependent\b",
            r"\bhelp me do it myself\b",
            r"\bautonomous?\b",
            r"\bself-?sufficient\b",
        ],
        "will": [
            r"\bwill\b",
            r"\bwill-?power\b",
            r"\bvolition\b",
            r"\bchoice\b",
            r"\bdecision\b",
        ],
        "character": [
            r"\bcharacter\b",
            r"\bpersonality\b",
            r"\btemperament\b",
            r"\bformation of character\b",
        ],
        "emotions": [
            r"\bemotion\w*\b",
            r"\bjoy\b",
            r"\bhappiness\b",
            r"\banger\b",
            r"\bfrustrat\w+\b",
            r"\banxiety\b",
            r"\bfear\b",
        ],
    },
    "environment": {
        "prepared": [
            r"\bprepared environment\b",
            r"\bchildren's house\b",
            r"\bclassroom\b",
            r"\bschool environment\b",
        ],
        "home": [
            r"\bhome\b",
            r"\bfamily\b",
            r"\bparents?\b",
            r"\bmother\b",
            r"\bfather\b",
            r"\bsiblings?\b",
        ],
        "nature": [
            r"\bnature\b",
            r"\bnatural\b",
            r"\boutdoor\b",
            r"\bgarden\b",
            r"\bplants?\b",
            r"\banimals?\b",
        ],
    },
    "social_development": {
        "grace_courtesy": [
            r"\bgrace and courtesy\b",
            r"\bpolite\b",
            r"\bmanners\b",
            r"\bsocial behaviour\b",
            r"\bgreet\b",
        ],
        "social_interaction": [
            r"\bsocial\b",
            r"\bcommunity\b",
            r"\bcooperat\w+\b",
            r"\bsharing\b",
            r"\bconflict\b",
            r"\bfriendship\b",
        ],
        "mixed_ages": [
            r"\bmixed age\b",
            r"\bolder children\b",
            r"\byounger children\b",
            r"\bhelping each other\b",
        ],
    },
}

# Book file mapping
BOOK_FILES = {
    "absorbent_mind": "the_absorbent_mind.txt",
    "secret_of_childhood": "secret_of_childhood.txt",
    "montessori_method": "the_montessori_method.txt",
    "own_handbook": "dr_montessoris_own_handbook.txt",
    "pedagogical_anthropology": "pedagogical_anthropology.txt",
    "spontaneous_activity": "spontaneous_activity_in_education.txt",
    "elementary_material": "the_montessori_elementary_material.txt",
}

def load_book(book_id):
    """Load a book and return as list of lines"""
    filename = BOOK_FILES.get(book_id)
    if not filename:
        return []

    filepath = SOURCES_DIR / filename
    if not filepath.exists():
        print(f"Warning: {filepath} not found")
        return []

    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        return f.readlines()

def find_matches(lines, patterns, context_lines=50):
    """Find all matches for patterns in lines, return line ranges with context"""
    matches = []

    for pattern in patterns:
        regex = re.compile(pattern, re.IGNORECASE)
        for i, line in enumerate(lines):
            if regex.search(line):
                # Get context (lines before and after)
                start = max(0, i - context_lines)
                end = min(len(lines), i + context_lines)

                # Extend to paragraph boundaries if possible
                while start > 0 and lines[start].strip():
                    start -= 1
                while end < len(lines) and lines[end].strip():
                    end += 1

                matches.append({
                    "line": i + 1,  # 1-indexed
                    "start": start + 1,
                    "end": end + 1,
                    "pattern": pattern,
                    "context": lines[max(0, i-2):min(len(lines), i+3)],
                })

    return matches

def merge_ranges(matches, gap_threshold=100):
    """Merge overlapping or nearby line ranges"""
    if not matches:
        return []

    # Sort by start line
    sorted_matches = sorted(matches, key=lambda x: x["start"])

    merged = []
    current = sorted_matches[0].copy()

    for match in sorted_matches[1:]:
        # If overlapping or close enough, extend current range
        if match["start"] <= current["end"] + gap_threshold:
            current["end"] = max(current["end"], match["end"])
        else:
            merged.append([current["start"], current["end"]])
            current = match.copy()

    merged.append([current["start"], current["end"]])
    return merged

def extract_chapter_titles(lines, book_id):
    """Extract chapter structure from a book"""
    chapters = []
    chapter_pattern = re.compile(r'^CHAPTER\s+([IVXLCDM]+|\d+)', re.IGNORECASE)

    for i, line in enumerate(lines):
        match = chapter_pattern.match(line.strip())
        if match:
            # Try to get chapter title from next few lines
            title = ""
            for j in range(1, 5):
                if i + j < len(lines) and lines[i + j].strip():
                    title = lines[i + j].strip()
                    if len(title) > 10:
                        break

            chapters.append({
                "chapter": match.group(1),
                "line": i + 1,
                "title": title[:100] if title else "Untitled",
            })

    return chapters

def build_topic_index():
    """Main function to build the complete topic index"""
    index = {}

    print("Building Montessori Guru Topic Index...")
    print("=" * 60)

    # Load all books
    books = {}
    total_lines = 0
    for book_id, filename in BOOK_FILES.items():
        books[book_id] = load_book(book_id)
        line_count = len(books[book_id])
        total_lines += line_count
        print(f"Loaded {book_id}: {line_count:,} lines")

    print(f"\nTotal lines to scan: {total_lines:,}")
    print("-" * 60)

    # Process each topic category
    for category, topics in TOPIC_PATTERNS.items():
        print(f"\nProcessing category: {category}")
        index[category] = {}

        for topic, patterns in topics.items():
            print(f"  - {topic}...", end=" ")

            topic_data = {
                "sources": [],
                "line_ranges": {},
                "total_matches": 0,
                "key_passages": [],
            }

            for book_id, lines in books.items():
                matches = find_matches(lines, patterns, context_lines=30)

                if matches:
                    merged_ranges = merge_ranges(matches)
                    topic_data["sources"].append(book_id)
                    topic_data["line_ranges"][book_id] = merged_ranges
                    topic_data["total_matches"] += len(matches)

                    # Store first few key passages for context
                    for match in matches[:3]:
                        context_text = "".join(match["context"]).strip()[:200]
                        if context_text:
                            topic_data["key_passages"].append({
                                "source": book_id,
                                "line": match["line"],
                                "excerpt": context_text,
                            })

            topic_data["sources"] = list(set(topic_data["sources"]))
            index[category][topic] = topic_data
            print(f"{topic_data['total_matches']} matches in {len(topic_data['sources'])} books")

    # Add metadata
    result = {
        "version": "1.0.0",
        "generated": "2026-02-01",
        "total_lines": total_lines,
        "books": list(BOOK_FILES.keys()),
        "topics": index,
    }

    # Write output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)

    print("\n" + "=" * 60)
    print(f"Topic index saved to: {OUTPUT_FILE}")

    # Summary stats
    total_topics = sum(len(topics) for topics in index.values())
    total_ranges = sum(
        sum(len(ranges) for ranges in topic["line_ranges"].values())
        for category in index.values()
        for topic in category.values()
    )

    print(f"\nSummary:")
    print(f"  - Categories: {len(index)}")
    print(f"  - Topics: {total_topics}")
    print(f"  - Line ranges indexed: {total_ranges}")

    return result

if __name__ == "__main__":
    build_topic_index()
