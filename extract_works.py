#!/usr/bin/env python3
import json

# Load the comprehensive guides
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/lib/curriculum/comprehensive-guides/practical-life-guides.json') as f:
    comprehensive = json.load(f)

# Load the current parent descriptions
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/lib/curriculum/comprehensive-guides/parent-practical-life.json') as f:
    current_parent = json.load(f)

# Get the names of works that already have parent descriptions
existing_names = {item['name'] for item in current_parent}

print(f"Total works in comprehensive guide: {len(comprehensive['works'])}")
print(f"Works with parent descriptions: {len(existing_names)}")
print(f"\nWorks needing descriptions:")

works_by_category = {}
for work in comprehensive['works']:
    cat = work['category']
    if cat not in works_by_category:
        works_by_category[cat] = []
    works_by_category[cat].append(work)
    
    if work['name'] not in existing_names:
        if cat not in works_by_category:
            works_by_category[cat] = []
        # Just count for now

for cat in sorted(works_by_category.keys()):
    all_in_cat = len(works_by_category[cat])
    existing_in_cat = sum(1 for w in works_by_category[cat] if w['name'] in existing_names)
    print(f"\n{cat}: {existing_in_cat}/{all_in_cat} have descriptions")
    for work in works_by_category[cat]:
        if work['name'] not in existing_names:
            print(f"  MISSING: {work['name']}")
