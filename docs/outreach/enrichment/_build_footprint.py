import pandas as pd
import csv
import re

base = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/outreach/"
out_base = base + "enrichment/"

master = pd.read_csv(base+"Montree_Global_Master_Jul2026.csv", dtype=str, keep_default_na=False)
disadv = master[master['Type']=='disadvantaged'].copy()
all_names = disadv['School'].tolist()

def country_of(name):
    r = disadv[disadv['School']==name]
    return r.iloc[0]['Country'] if len(r) else ''

dfa = pd.read_csv(base+"social/disadvantaged-facebook-A.csv", dtype=str, keep_default_na=False)
dfb = pd.read_csv(base+"social/disadvantaged-facebook-B.csv", dtype=str, keep_default_na=False)
both = pd.concat([dfa, dfb], ignore_index=True)

gsm = pd.read_csv(base+"social/global-social-merged.csv", dtype=str, keep_default_na=False)
gsm_disadv = gsm[gsm['school_name'].isin(set(all_names))]

def extract_followers(text):
    if not text:
        return ''
    m = re.search(r'([\d,]{2,})\s*(likes|followers|talking about|check-ins|visits)', text, re.I)
    if m:
        return m.group(1).replace(',', '') + ' ' + m.group(2)
    return ''

def score_strength(activity_text, confidence_text, has_fb, is_ambiguous):
    if not has_fb:
        return 0
    if is_ambiguous:
        return 1
    text = (activity_text or '') + ' ' + (confidence_text or '')
    text_l = text.lower()
    score = 3  # baseline: page exists
    # confidence bump
    if 'high' in (confidence_text or '').lower():
        score += 1
    if 'low' in (confidence_text or '').lower():
        score -= 1
    # activity language
    if any(k in text_l for k in ['active, recent', 'actively indexed', 'appears active', 'active —', 'active and']):
        score += 1
    if any(k in text_l for k in ['not obviously dead', 'established page']):
        score += 1
    if 'not verified' in text_l or 'not confirmed' in text_l or 'unquantified' in text_l:
        score -= 1
    if 'ambiguous' in text_l or 'none' in text_l.split():
        score -= 2
    # follower count bump
    m = re.search(r'([\d,]{3,})\s*(likes|followers)', text_l)
    if m:
        n = int(m.group(1).replace(',', ''))
        if n >= 1000:
            score += 2
        elif n >= 300:
            score += 1
    return max(0, min(10, score))

rows = []
seen = set()

# Primary source: the 71-row match against global-social-merged.csv (has facebook_url + fb_activity + confidence, no notes col retained there but present in source)
for _, r in gsm_disadv.iterrows():
    name = r['school_name']
    if name in seen:
        continue
    seen.add(name)
    fb = r['facebook_url']
    is_junk = fb in ('http://www.facebook.com/2008/fbml',) or fb.strip()==''
    is_amb = 'AMBIGUOUS' in fb
    rows.append({
        'org_name': name,
        'country': country_of(name),
        'facebook_url': '' if is_junk else fb,
        'followers_estimate': extract_followers(r['fb_activity']),
        'social_strength': score_strength(r['fb_activity'], r['confidence'], has_fb=(not is_junk and bool(fb.strip())), is_ambiguous=is_amb),
        'notes': (r['fb_activity'] or '') + (' [GENERIC/JUNK FACEBOOK WIDGET LINK — not a real page, treat as no-FB]' if is_junk else ''),
    })

# Supplement with the richer disadvantaged-facebook-A/B notes where available (more detailed text) for rows already captured
notes_map = {}
for _, r in both.iterrows():
    notes_map[r['school_name']] = r

for row in rows:
    n = row['org_name']
    if n in notes_map and notes_map[n]['notes'].strip():
        extra = notes_map[n]['notes']
        row['notes'] = (row['notes'] + ' | ' + extra).strip(' |')
        # recompute strength using the fuller confidence signal from A/B file too
        row['social_strength'] = max(row['social_strength'], score_strength(notes_map[n]['fb_activity'], notes_map[n]['confidence'], has_fb=bool(row['facebook_url']), is_ambiguous=('AMBIGUOUS' in extra)))

# New WebSearch finds this session (the 9 orgs that had zero prior FB coverage)
new_finds = [
    ('Centro de Aprendizaje Ananda', 'https://www.facebook.com/p/Centro-de-Aprendizaje-Ananda-100076444412951/', '', 4, 'Found via WebSearch this session. Rural Montessori center, Oaxaca Mexico; page exists, activity level not independently quantified from snippets.'),
    ('Inkwell Montessori', '', '', 0, 'The only FB page findable under this exact name (facebook.com/inkwellmontessori, 224 likes) belongs to an UNRELATED Georgetown, ON Canada school — master row confirms this org is in Cambridge, MA. No confirmed FB page for the correct entity; do not use the Georgetown page.'),
    ('Lilima Montessori High School', 'https://www.facebook.com/lilimamontessorihigh/', '', 5, 'Found via WebSearch this session. IB World School, Mbabane Eswatini; page confirmed via official site link, activity not independently quantified.'),
    ('Montessori for Kenya (East Pokot & Corner of Hope umbrella NGO)', 'https://www.facebook.com/Montessoriforkenya/', '416 likes', 6, 'Found via WebSearch this session. AMI-affiliated NGO umbrella, 416 likes confirmed in snippet.'),
    ('Odessa Charity Foundation Way Home — Early Learning for Vulnerable Children', '', '', 2, 'No dedicated Facebook page confirmed via WebSearch this session; org is active via its own site (wayhome.org.ua) and multiple charity-platform listings (GlobalGiving, HasanaH) — real, well-documented org, just no FB link surfaced.'),
    ('Seametrey Children\'s Village Montessori Nursery', 'https://www.facebook.com/seametreycambodia/', '', 5, 'Found via WebSearch this session. Established NGO school, Tonle Bati/Phnom Penh Cambodia, founded 2003; page confirmed, activity not independently quantified.'),
    ('Foundation for Montessori Education in Nigeria (FMEN)', '', '', 1, 'No confirmed dedicated Facebook page; an Instagram handle (instagram.com/foundationformontessori) was found instead. AMI-affiliated society.'),
    ('Friends of Morazán — Montessori Pre-School', '', '', 1, 'No dedicated Facebook page confirmed via WebSearch this session; UK-registered charity (#1111253) is well-documented via its own site and charity-commission listings instead.'),
    ('Harrington Elementary Children\'s House', '', '', 0, 'Could not disambiguate from several unrelated "Children\'s House Montessori" schools nationwide (no city/state in master row) — no social footprint attempted.'),
]
existing_names = {r['org_name'] for r in rows}
for name, fb, followers, strength, notes in new_finds:
    if name in existing_names:
        continue
    rows.append({
        'org_name': name,
        'country': country_of(name),
        'facebook_url': fb,
        'followers_estimate': followers,
        'social_strength': strength,
        'notes': notes,
    })

with open(out_base + 'disadvantaged-footprint-jul12.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['org_name','country','facebook_url','followers_estimate','social_strength','notes'], quoting=csv.QUOTE_ALL)
    w.writeheader()
    for row in rows:
        w.writerow(row)

print(f"FOOTPRINT_ROWS_WRITTEN={len(rows)} / {len(all_names)} total disadvantaged orgs")
missing = set(all_names) - {r['org_name'] for r in rows}
print(f"STILL_NO_FOOTPRINT_ROW={len(missing)}")
for m in sorted(missing):
    print(" -", m)
