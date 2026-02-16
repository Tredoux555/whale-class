#!/usr/bin/env python3
"""
Add ~50 missing AMI-standard works to the Montessori Brain.
Updates both stem/*.json (structure) and comprehensive-guides/*.json (guide content).
Sources: Guru knowledge (Montessori's own writings), AMI training albums, The Red Corolla.
"""

import json
import os
import copy

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEM_DIR = os.path.join(BASE, 'lib', 'montree', 'stem')
GUIDES_DIR = os.path.join(BASE, 'lib', 'curriculum', 'comprehensive-guides')

# ============================================================
# NEW WORKS DATA - organized by area
# Each entry has both stem fields and guide fields
# ============================================================

NEW_WORKS = {
    "sensorial": {
        "stem_additions": {
            "Visual Sense - Form": [
                {
                    "id": "se_geometric_form_cards",
                    "name": "Geometric Form Cards",
                    "description": "Three series of cards progressing from filled shapes to outlines, pairing with the Geometric Cabinet",
                    "ageRange": "primary_year1",
                    "prerequisites": ["se_geometric_cabinet"],
                    "sequence": 11,
                    "materials": ["Three sets of white cards with geometric forms", "Geometric Cabinet"],
                    "directAims": ["Visual discrimination of form", "Abstraction from 3D to 2D"],
                    "indirectAims": ["Preparation for geometry", "Classification skills"],
                    "controlOfError": "Cards don't match inset shapes",
                    "chineseName": "蒙特梭利几何形状卡片",
                    "levels": [
                        {"level": 1, "name": "Filled Forms (Series 1)", "description": "Match solid blue shape cards to insets", "videoSearchTerms": ["montessori geometric form cards series 1"]},
                        {"level": 2, "name": "Thick Outlines (Series 2)", "description": "Match thick outline cards to insets", "videoSearchTerms": ["montessori geometric form cards series 2"]},
                        {"level": 3, "name": "Thin Outlines (Series 3)", "description": "Match thin line cards to insets", "videoSearchTerms": ["montessori geometric form cards series 3"]}
                    ]
                },
                {
                    "id": "se_botany_cabinet",
                    "name": "Botany Cabinet",
                    "description": "Leaf-shaped insets in wooden trays for visual discrimination of leaf forms",
                    "ageRange": "primary_year1",
                    "prerequisites": ["se_geometric_cabinet"],
                    "sequence": 12,
                    "materials": ["Botany Cabinet with 4 trays of leaf insets", "Three series of leaf cards"],
                    "directAims": ["Visual discrimination of leaf forms", "Vocabulary of leaf shapes"],
                    "indirectAims": ["Preparation for botany study", "Classification skills"],
                    "controlOfError": "Leaf insets only fit in matching frame",
                    "chineseName": "蒙特梭利植物学柜",
                    "levels": [
                        {"level": 1, "name": "Inset Exploration", "description": "Trace and replace leaf insets", "videoSearchTerms": ["montessori botany cabinet presentation"]},
                        {"level": 2, "name": "Card Matching", "description": "Match leaf cards to insets progressively", "videoSearchTerms": ["montessori botany cabinet cards"]},
                        {"level": 3, "name": "Leaf Collection Match", "description": "Match real pressed leaves to cabinet shapes", "videoSearchTerms": ["montessori botany cabinet real leaves"]}
                    ]
                }
            ],
            "Visual Sense - Dimension": [
                {
                    "id": "se_pink_tower_brown_stair",
                    "name": "Pink Tower and Brown Stair Combination",
                    "description": "Extension combining two dimension materials to explore relationships between cubes and prisms",
                    "ageRange": "primary_year1",
                    "prerequisites": ["se_pink_tower", "se_brown_stair"],
                    "sequence": 10,
                    "materials": ["Pink Tower", "Brown Stair"],
                    "directAims": ["Visual discrimination across two dimensions", "Creative problem-solving"],
                    "indirectAims": ["Mathematical relationships", "Spatial reasoning"],
                    "controlOfError": "Visual harmony of pattern",
                    "chineseName": "蒙特梭利粉红塔与棕色梯组合",
                    "levels": [
                        {"level": 1, "name": "Side-by-Side Matching", "description": "Match cubes to prisms by face size", "videoSearchTerms": ["montessori pink tower brown stair combination"]},
                        {"level": 2, "name": "Pattern Building", "description": "Create patterns using both materials", "videoSearchTerms": ["montessori pink tower brown stair patterns"]},
                        {"level": 3, "name": "Maze/City Building", "description": "Build creative constructions", "videoSearchTerms": ["montessori pink tower brown stair extension"]}
                    ]
                },
                {
                    "id": "se_dimension_distance",
                    "name": "Distance Exercises",
                    "description": "Building dimension materials at a distance from the source, developing visual memory",
                    "ageRange": "primary_year2",
                    "prerequisites": ["se_pink_tower", "se_brown_stair", "se_red_rods"],
                    "sequence": 11,
                    "materials": ["Pink Tower or Brown Stair or Red Rods"],
                    "directAims": ["Visual memory", "Discrimination at distance"],
                    "indirectAims": ["Concentration", "Self-confidence"],
                    "controlOfError": "Pieces don't form correct sequence when brought together",
                    "chineseName": "蒙特梭利远距离练习",
                    "levels": [
                        {"level": 1, "name": "Across the Room", "description": "Carry pieces one at a time across classroom to build", "videoSearchTerms": ["montessori distance exercise pink tower"]},
                        {"level": 2, "name": "Memory Building", "description": "Observe, walk away, build from memory", "videoSearchTerms": ["montessori memory exercise sensorial"]}
                    ]
                }
            ]
        },
        "guide_additions": [
            {
                "work_id": "se_geometric_form_cards",
                "name": "Geometric Form Cards",
                "name_chinese": "蒙特梭利几何形状卡片",
                "slug": "geometric-form-cards",
                "area": "sensorial",
                "category": "Visual Sense - Form",
                "sequence": 11,
                "age_range": "primary_year1",
                "quick_guide": "• Three progressive card series accompany the Geometric Cabinet\n• Series 1: Solid blue shapes — child matches to insets for concrete recognition\n• Series 2: Thick blue outlines — moves child toward abstraction\n• Series 3: Thin black outlines only — fully abstract representation\n• Key: child traces inset edges before matching to strengthen form recognition\n• Described by Montessori as essential bridge from concrete to abstract understanding of shape",
                "presentation_steps": [
                    {"step": 1, "title": "Lay Out Series 1", "description": "Select 3-4 contrasting geometric insets from the cabinet. Lay out corresponding Series 1 cards (filled blue shapes) in a row.", "tip": "Start with very different shapes — circle, triangle, square."},
                    {"step": 2, "title": "Demonstrate Matching", "description": "Pick up one inset, trace its edges with two fingers slowly, then place it on the matching filled card.", "tip": "Trace with the writing fingers (index and middle) to reinforce pencil grip."},
                    {"step": 3, "title": "Child Matches", "description": "Invite the child to trace and match remaining insets to their cards.", "tip": "Encourage slow, deliberate tracing before placing."},
                    {"step": 4, "title": "Introduce Series 2", "description": "When the child masters Series 1, repeat with thick outline cards. The inset sits inside the outline.", "tip": "This is harder — the child sees outline, not filled shape."},
                    {"step": 5, "title": "Introduce Series 3", "description": "When ready, offer thin black line cards. The child matches insets to abstract outlines.", "tip": "This final series is the bridge to recognizing shapes drawn on paper."}
                ],
                "direct_aims": ["Visual discrimination of form", "Abstraction from 3D to 2D"],
                "indirect_aims": ["Preparation for geometry", "Classification skills"],
                "materials_needed": ["Three sets of white cards with geometric forms", "Geometric Cabinet"],
                "control_of_error": "Cards don't match inset shapes",
                "prerequisites": ["se_geometric_cabinet"],
                "points_of_interest": ["The progression from solid to outline", "Tracing the edges", "Discovering the shape is the same even as a line drawing"],
                "variations": ["Use only shapes from one drawer", "Lay out all three series for same shapes side by side", "Mix cards from multiple drawers"],
                "common_challenges": ["Child may rush without tracing — gently redirect", "Series 3 can be frustrating — ensure Series 2 is mastered first"],
                "video_search_term": "montessori geometric form cards presentation",
                "parent_description": "Your child is learning to recognize geometric shapes at increasingly abstract levels. They start by matching solid shapes, then outlines, then thin lines — building the visual skills they'll need to recognize letters, numbers, and shapes on paper. This is a beautiful bridge from hands-on learning to abstract thinking.",
                "why_it_matters": "This exercise develops the ability to see a 2D representation and connect it to a real 3D form. This exact skill is what your child needs when they start reading — recognizing that a squiggle on paper represents a sound or word they already know."
            },
            {
                "work_id": "se_botany_cabinet",
                "name": "Botany Cabinet",
                "name_chinese": "蒙特梭利植物学柜",
                "slug": "botany-cabinet",
                "area": "sensorial",
                "category": "Visual Sense - Form",
                "sequence": 12,
                "age_range": "primary_year1",
                "quick_guide": "• Wooden cabinet with 4 trays containing leaf-shaped insets\n• Same principle as Geometric Cabinet but with natural forms\n• Child traces leaf shapes, learning to discriminate subtle curves and edges\n• Three-card series available (filled, outlined, line) just like geometric forms\n• Bridge between sensorial work and botany cultural studies\n• Real leaf matching is the ultimate extension — take leaves from the garden and match to cabinet",
                "presentation_steps": [
                    {"step": 1, "title": "Introduction", "description": "Show one tray from the botany cabinet. Remove 3 contrasting leaf insets.", "tip": "Choose very different leaf shapes to start — perhaps oval, heart-shaped, and linear."},
                    {"step": 2, "title": "Tracing", "description": "Demonstrate tracing the edge of one leaf inset with your index and middle fingers. Trace the frame opening too.", "tip": "Go slowly around the entire edge, feeling every curve."},
                    {"step": 3, "title": "Matching and Replacing", "description": "Mix the insets and invite the child to trace and replace each in its correct frame.", "tip": "The control of error is built in — each leaf fits only one opening."},
                    {"step": 4, "title": "Naming", "description": "Once familiar, use three-period lesson: 'This is an ovate leaf. Show me the ovate leaf. What is this leaf?'", "tip": "Introduce vocabulary only after extensive sensorial work."},
                    {"step": 5, "title": "Real Leaf Extension", "description": "Collect real leaves on a nature walk. Back in class, child matches real leaves to cabinet shapes.", "tip": "Press leaves first so they lie flat. This connects indoor to outdoor learning."}
                ],
                "direct_aims": ["Visual discrimination of leaf forms", "Vocabulary of leaf shapes"],
                "indirect_aims": ["Preparation for botany study", "Classification skills"],
                "materials_needed": ["Botany Cabinet with 4 trays of leaf insets", "Three series of leaf cards"],
                "control_of_error": "Leaf insets only fit in matching frame",
                "prerequisites": ["se_geometric_cabinet"],
                "points_of_interest": ["The variety of leaf shapes in nature", "Tracing the curves", "Matching real leaves to wooden forms"],
                "variations": ["Work with one tray at a time", "Match card series 1-3 like geometric cards", "Sort real leaves by shape"],
                "common_challenges": ["Children sometimes force insets into wrong frames — encourage gentle trying", "Leaf vocabulary can be challenging — introduce slowly"],
                "video_search_term": "montessori botany cabinet presentation",
                "parent_description": "Your child is exploring the beautiful variety of leaf shapes found in nature. Using a special cabinet with leaf-shaped puzzle pieces, they trace edges, match shapes, and learn to notice subtle differences between leaves. Later they'll match real leaves from the garden to these wooden forms — building a deep connection between classroom learning and the natural world.",
                "why_it_matters": "This work develops your child's ability to observe fine details in nature and classify what they see. These observation skills are the foundation of scientific thinking. When your child notices that different trees have different leaf shapes, they're doing real botany."
            },
            {
                "work_id": "se_pink_tower_brown_stair",
                "name": "Pink Tower and Brown Stair Combination",
                "name_chinese": "蒙特梭利粉红塔与棕色梯组合",
                "slug": "pink-tower-brown-stair-combination",
                "area": "sensorial",
                "category": "Visual Sense - Dimension",
                "sequence": 10,
                "age_range": "primary_year1",
                "quick_guide": "• Extension that combines two classic dimension materials\n• The Pink Tower cubes fit perfectly against Brown Stair prisms (they share the same base dimensions)\n• Children discover mathematical relationships: each cube face matches a prism face\n• Many pattern possibilities: side-by-side staircase, maze, city, spiral\n• Only present after child has mastered both materials individually\n• Described in Montessori's Handbook as children's natural extension",
                "presentation_steps": [
                    {"step": 1, "title": "Preparation", "description": "Both Pink Tower and Brown Stair should be on separate mats. Invite the child who has mastered both.", "tip": "The child should already build both materials independently and accurately."},
                    {"step": 2, "title": "Matching Faces", "description": "Place the largest cube beside the largest prism. Show how the faces align perfectly.", "tip": "Let the child discover this relationship — it's a powerful 'aha' moment."},
                    {"step": 3, "title": "Building a Pattern", "description": "Demonstrate one combined pattern (e.g., alternating cube-prism staircase), then step back.", "tip": "Show just enough to spark the idea, then let the child explore."},
                    {"step": 4, "title": "Free Exploration", "description": "The child creates their own patterns and constructions combining both materials.", "tip": "There is no single 'correct' way — creativity is the point."}
                ],
                "direct_aims": ["Visual discrimination across two dimensions", "Creative problem-solving"],
                "indirect_aims": ["Mathematical relationships", "Spatial reasoning"],
                "materials_needed": ["Pink Tower", "Brown Stair"],
                "control_of_error": "Visual harmony of pattern",
                "prerequisites": ["se_pink_tower", "se_brown_stair"],
                "points_of_interest": ["Discovering faces match", "The many possible patterns", "Building something beautiful"],
                "variations": ["Horizontal patterns", "Vertical structures", "Marble runs using the stair as ramps and tower as supports"],
                "common_challenges": ["Child may want to play rather than build with intention — redirect gently", "Heavy pieces can topple — work on a large mat on the floor"],
                "video_search_term": "montessori pink tower brown stair combination extensions",
                "parent_description": "Your child is combining two materials they've already mastered — the Pink Tower and the Brown Stair — to discover mathematical relationships. The cube faces and prism faces match perfectly because they share the same dimensions. This is a creative, open-ended extension where your child explores how different shapes relate to each other.",
                "why_it_matters": "This extension develops spatial reasoning and creative thinking. When your child discovers that a Pink Tower cube fits perfectly against a Brown Stair prism, they're experiencing mathematical relationships firsthand — the same kind of proportional thinking that underlies algebra and geometry."
            },
            {
                "work_id": "se_dimension_distance",
                "name": "Distance Exercises",
                "name_chinese": "蒙特梭利远距离练习",
                "slug": "distance-exercises",
                "area": "sensorial",
                "category": "Visual Sense - Dimension",
                "sequence": 11,
                "age_range": "primary_year2",
                "quick_guide": "• Child carries pieces one at a time across the room to build the material at a distance\n• Develops visual memory — child must hold the size in mind while walking\n• Works with Pink Tower, Brown Stair, Red Rods, or Knobless Cylinders\n• Described in Dr. Montessori's Own Handbook as children's spontaneous invention\n• Memory variation: observe the completed material, then rebuild from memory without looking\n• Only for children who build the material accurately at close range",
                "presentation_steps": [
                    {"step": 1, "title": "Set Up", "description": "Place the material (e.g., Pink Tower) on one mat. Place an empty mat across the room.", "tip": "The distance should be significant — at least 3-4 meters."},
                    {"step": 2, "title": "Demonstrate", "description": "Walk to the material, select the largest piece, carry it carefully to the distant mat, place it.", "tip": "Model slow, deliberate walking — this is part of the exercise."},
                    {"step": 3, "title": "Child Continues", "description": "The child carries remaining pieces one at a time, building the material on the distant mat.", "tip": "The child must decide which piece to get next — this requires holding sizes in visual memory."},
                    {"step": 4, "title": "Verification", "description": "When complete, child checks their construction against the original (which no longer exists on the near mat).", "tip": "The control of error is whether the final construction looks right."}
                ],
                "direct_aims": ["Visual memory", "Discrimination at distance"],
                "indirect_aims": ["Concentration", "Self-confidence", "Gross motor coordination"],
                "materials_needed": ["Pink Tower or Brown Stair or Red Rods", "Two mats"],
                "control_of_error": "Pieces don't form correct sequence when brought together",
                "prerequisites": ["se_pink_tower", "se_brown_stair", "se_red_rods"],
                "points_of_interest": ["The challenge of remembering sizes", "Walking carefully with a piece", "The satisfaction of getting it right at a distance"],
                "variations": ["Different materials", "Increasing distance", "Memory variation: observe then rebuild without looking"],
                "common_challenges": ["Child may rush — encourage slow walking", "Getting the middle pieces in order is hardest"],
                "video_search_term": "montessori distance exercise sensorial",
                "parent_description": "Your child carries pieces of a material they know well across the room, one at a time, to rebuild it at a distance. This brilliant exercise develops visual memory — they must hold in their mind what size piece they need next while walking across the room. It combines physical control with mental discipline.",
                "why_it_matters": "Visual memory is crucial for reading, writing, and mathematics. When your child can hold a mental image of a cube's size while walking across a room, they're building the same memory skills they'll need to remember letter shapes, number values, and spelling patterns."
            }
        ]
    }
}

# Now do the actual file modifications
def add_stem_works(area_filename, new_category_works):
    """Add new works to existing categories in stem JSON"""
    filepath = os.path.join(STEM_DIR, area_filename)
    with open(filepath) as f:
        data = json.load(f)

    for cat_name, new_works in new_category_works.items():
        for cat in data['categories']:
            if cat['name'] == cat_name:
                existing_ids = {w['id'] for w in cat['works']}
                for work in new_works:
                    if work['id'] not in existing_ids:
                        cat['works'].append(work)
                        print(f"  + Added {work['name']} to {cat_name}")
                break

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def add_guide_works(area_filename, new_guides):
    """Add new guide entries to comprehensive-guides JSON"""
    filepath = os.path.join(GUIDES_DIR, area_filename)
    with open(filepath) as f:
        data = json.load(f)

    works = data.get('works', data)
    existing_ids = {w.get('work_id') for w in works}

    for guide in new_guides:
        if guide['work_id'] not in existing_ids:
            works.append(guide)
            print(f"  + Added guide for {guide['name']}")

    if isinstance(data, dict) and 'works' in data:
        data['works'] = works
    else:
        data = works

    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# Process Sensorial
print("\n=== SENSORIAL ===")
add_stem_works('sensorial.json', NEW_WORKS['sensorial']['stem_additions'])
add_guide_works('sensorial-guides.json', NEW_WORKS['sensorial']['guide_additions'])

print("\nDone with Sensorial. Run verification...")

# Verify
with open(os.path.join(STEM_DIR, 'sensorial.json')) as f:
    data = json.load(f)
total = sum(len(c['works']) for c in data['categories'])
print(f"Sensorial stem now has {total} works")

with open(os.path.join(GUIDES_DIR, 'sensorial-guides.json')) as f:
    data = json.load(f)
works = data.get('works', data)
print(f"Sensorial guides now has {len(works)} entries")
