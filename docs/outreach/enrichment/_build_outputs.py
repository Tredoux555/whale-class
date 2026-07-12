import pandas as pd
import csv

base = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/outreach/"
out_base = base + "enrichment/"

master = pd.read_csv(base+"Montree_Global_Master_Jul2026.csv", dtype=str, keep_default_na=False)
disadv = master[master['Type']=='disadvantaged'].copy()

def country_of(name):
    r = disadv[disadv['School']==name]
    return r.iloc[0]['Country'] if len(r) else ''

def fb_of(name, gsm):
    r = gsm[gsm['school_name']==name]
    return r.iloc[0]['facebook_url'] if len(r) else ''

gsm = pd.read_csv(base+"social/global-social-merged.csv", dtype=str, keep_default_na=False)

# ============ JOB 1: EMAIL ENRICHMENT ============
# rows: org_name, country, old_email, found_email, seen_where, facebook_url, notes
email_rows = []

def add(name, found_email, seen_where, notes=''):
    email_rows.append({
        'org_name': name,
        'country': country_of(name),
        'old_email': 'not_found',
        'found_email': found_email,
        'seen_where': seen_where,
        'facebook_url': fb_of(name, gsm),
        'notes': notes,
    })

# --- Pre-existing incidental finds (already sitting in disadvantaged-facebook-A/B.csv from a
#     prior social-footprint pass, never yet merged into the master CSV's Email column) ---
add('Fig Tree Montessori', 'admin@figtreemontessori.org', 'figtreemontessori.org (prior social-research pass, disadvantaged-facebook-B.csv)', 'Incidental find, not yet applied to master CSV')
add('Foundation for Montessori Education in Nigeria (FMEN)', 'info@fmen.org.ng', 'fmen.org.ng (prior social-research pass)', 'Also independently re-confirmed via WebSearch this session (AMI affiliated society page)')
add('Hopitutuqaiki Language Immersion School', 'hlis@hopitutuqaiki.com', 'hopitutuqaiki.com (prior social-research pass)', 'Note: master also lists sibling row "Hopitutuqaiki — The Hopi School" as a separate entity; same org family, same domain')
add('Hopscotch Montessori Kyiv (via Seeds for Ukraine)', 'info@hopscotchmontessori.org', 'hopscotchmontessori.org (prior social-research pass)', '')
add('Inkwell Montessori', 'info@inkwellmontessori.org', 'inkwellmontessori.org (prior social-research pass)', 'CAUTION: master row confirms this is the Cambridge, MA school. A same-named but UNRELATED "Inkwell Montessori" in Georgetown, ON, Canada also exists (facebook.com/inkwellmontessori, 224 likes) — do NOT attach that FB page to this row, wrong entity.')
add('Isla Montessori School', 'info@islamontessori.org', 'islamontessori.org (prior social-research pass)', 'Northern Mariana Islands (USA)')
add('Keila Montessori MTU', 'montessorikeila@gmail.com', 'prior social-research pass', 'Estonia')
add('Little Tree Community (A Wildflower Montessori School)', 'info@littletreecommunity.org', 'littletreecommunity.org (prior social-research pass)', '')
add('Loo Kindergarten - Paasupesa Montessori Group', 'loopesa@gmail.com', 'prior social-research pass', 'Estonia')
add('MTU Montessori Kiili vallas', 'montessori.kiilis@gmail.com', 'prior social-research pass', 'Estonia')
add('Montessori Head Start Program at Premier Academy Inc.', 'info@premier-academy.org', 'premier-academy.org (prior social-research pass)', 'Atlanta, GA — matches facebook.com/PremierAcademyAtlantaGA pulled from org site footer')
add('Northern Blooms Montessori', 'hello@northernblooms.co', 'northernblooms.co (prior social-research pass)', '')
add('Salado Montessori Inc.', 'office@saladomontessori.com', 'saladomontessori.com (prior social-research pass)', 'Texas')
add('Sekoly Kintana (Trilingual Montessori School)', 'info@sekolykintana.org', 'sekolykintana.org (prior social-research pass)', 'Madagascar; FB link embedded on official homepage header')
add('St. Croix Montessori School', 'info@stxmontessori.com', 'stxmontessori.com (prior social-research pass)', 'US Virgin Islands')
add('The Sundrop School', 'info@sundropmontessori.com', 'sundropmontessori.com (prior social-research pass)', '')

# --- New WebSearch / web_fetch finds THIS SESSION ---
add('AIMPO Community Montessori Preschool', 'info@aimpo.org', 'WebSearch snippet of aimpo.org contact info', 'Rwanda; African Initiative for Mankind Progress Organization runs the Montessori preschool as a program')
add('Horme — Red de Proyectos Sociales Montessori', 'info@horme.com.mx', 'web_fetch of horme.com.mx/home (footer mailto)', 'Mexico; network umbrella, not a single school')
add('CoRE India / Montessori Training & Research Trust (MTRT)', 'info@montessorihyderabad.org', 'web_fetch of montessorihyderabad.org/about-mtrt (Contact Us block)', 'India; MTRT is the AMI training body associated with the CoRE India rural-education initiative')
add('Shishur Sevay (Childlife Preserve) — inclusive Montessori home & free preschool', 'shishur.sevay@gmail.com', 'WebSearch snippet, searchdonation.com NGO directory listing', 'India / Kolkata')
add('Montessori Public Schools Thailand (EsF initiative)', 'info@montessori-esf.org', 'WebSearch snippet of montessori-esf.org contact info', 'MODERATE CONFIDENCE — regional EsF central contact, same address already used for other EsF Kenya projects in this list (Corner of Hope, Nomadic Samburu, East Pokot); no Thailand-specific email surfaced')
add('Montessori del Mundo Charter School', 'info@montessoridelmundo.org', 'WebSearch snippet + montessoridelmundo.org/contact', 'Colorado, USA; phone matches existing master row (720-863-8629)')
add('Crescent Islamic Montessori School (CIMS)', 'cimsadmin@cimschool.com', 'web_fetch of cimschool.com (page footer)', 'Beaverton, OR')
add('Cypress Junction Montessori (CJM)', 'info@cypressjunction.org', 'WebSearch snippet of cypressjunction.org/contact', 'Winter Haven, FL')
add('Hill View Montessori Charter Public School', 'hschultz@humcps.org', 'WebSearch snippet, profiles.doe.mass.edu admin listing', 'Haverhill, MA; administrator Jeanne Schultz — not a generic info@ address, verify before mass-send')
add('Hilltop Montessori School', 'frontdesk@hilltopmontessori.org', 'WebSearch snippet of hilltopmontessori.org', 'Brattleboro, VT')
add('Mithing Pangarap Educational Foundation Inc. (Smokey Mountain outreach)', 'info@mpefi.org', 'WebSearch snippet of mpefi.org/index.php/contact.html', 'Manila, Philippines')
add('Tartu Forselius School (Montessori classroom)', 'kool@tfk.tartu.ee', 'WebSearch snippet of tfk.tartu.ee', 'Estonia; general whole-school email — the Montessori class is one program inside this larger school, not a dedicated Montessori-only address')
add('Montessori for Lebanon', 'marhaba@montessori-lebanon.org', 'web_fetch of montessori-lebanon.org (footer mailto link)', 'Beirut/national NGO')
add('Vusumnotfo — Building a Preschool in Rural Swaziland', 'vusumnotfo@gmail.com', 'web_fetch of vusumnotfo.org/about (Contact Us block)', 'Eswatini; director Katherine Gau')
add('Montessori International School of Vietnam — HMD Orphanage Kindergarten Program', 'montessorischoolvietnam@gmail.com', 'web_fetch of montessori.edu.vn/about-us/charity (footer mailto link)', 'Ho Chi Minh City; MIS is the parent school running the HMD orphanage kindergarten program, not a separate org')
add('O.B. Montessori Child and Community Foundation — Pagsasarili Preschools', 'info@obmontessori.edu.ph', 'web_fetch of obmontessori.edu.ph/contactus', 'San Juan City, Philippines; center-wide email — Pagsasarili is OB Montessori Center\'s own outreach program, not a separately incorporated org')

# --- Not found (documented for the record so a future pass doesn't re-search from scratch) ---
notfound_rows = [
    ("Ncinci One's Montessori", 'South Africa', 'Multiple pages checked (wildcoast.co.za, samontessori.org.za, GlobalGiving) — no dedicated email surfaced; phone 0027 76 9551008 and Facebook page (100080748454470) are the only working contact channels'),
    ('Footprints CBO Montessori Schools', 'Kenya', 'Only the grantor (Montessori Global Growth Fund, contactus@montessori-mggf.org) surfaced — that is MGGF\'s own address, not Footprints CBO\'s; do not attribute'),
    ('St. Joseph Montessori School (Ndirima-Litembo)', 'Tanzania', 'Vern Lal Global Foundation (vlalgf.org) sponsors the school but no direct school email found; sjms.net has a contact form but it is unconfirmed whether it is the same institution'),
    ('St. Joseph Montessori School (Likwakwanda)', 'Malawi', 'Sponsored by Warm Heart Ministries (US 501c3) — no direct school or sponsor email surfaced'),
    ("Association Maria Montessori de Côte d'Ivoire (AMMCI)", "Côte d'Ivoire", 'Site (association-montessori-cotedivoire.com) has a membership/chat widget only, no email published'),
    ('Montessori Foundation Ghana', 'Ghana', 'Official site (montessorifoundationghana.org) returned no readable contact content on fetch; Facebook page exists (MontessoriFoundationofGhana) but no email in search snippets'),
    ('TESMA — Trilingual Elementary Montessori School of Madagascar', 'Madagascar', 'School has not yet opened (planned Sept 2026 per search snippets); overseen by NGO "Education For Madagascar" — no dedicated email surfaced yet'),
    ('Harmony Montessori School', 'United States', 'Confirmed as the Portland, OR (Outer Southeast) school via master row match. Site (harmony-montessori.com) offers only a contact form, no published email address'),
    ("Harrington Elementary Children's House", 'United States', 'Name too generic / no city given in master row to disambiguate from several unrelated "Children\'s House Montessori" schools nationwide'),
    ('Montessori Forest', 'Israel', 'Prior social-research pass flagged the only candidate FB page (facebook.com/montessoriforestisrael, "Yaldei HaChoresh") as AMBIGUOUS/possibly a different org — no email attempted on an unconfirmed entity'),
    ('VsI Garstycios Grudelis (The Mustard Seed)', 'Lithuania', 'Kaunas kindergarten; website (garstyciosgrudelis.lt) and Facebook page confirmed to exist, but no email surfaced in search snippets'),
    ('Mulberry Forest Montessori', 'United States', 'Wilmington/Reading, MA (new Montessori-forest-school program, opened 2025) — a "Head of School, Mary Saba" contact was referenced in search results but the actual email string was redacted/not directly visible; NOT logged as a confirmed find per the never-construct rule'),
    ('Pulse of Life Kindergarten', 'Syria', 'No confirmed match found. A different, established "International Montessori School" in Damascus (montessori-sy.org, info@montessori-sy.org) surfaced but could NOT be confirmed as the same entity — not logged as a find'),
    ('Global Education Campaign / Dosti Foundation — purpose-built school with Montessori classroom', 'Pakistan', 'Dostifoundation.org / dostiglobal.com/contact exist but were not directly fetched for a contact email this pass'),
    ('ANIFU — Santa Catarina Pinula Montessori (Orphan Outreach)', 'Guatemala', 'Program run by Orphan Outreach (orphanoutreach.org) — no ANIFU-specific or program-specific email surfaced. NOTE: an unrelated "Colegio Internacional Montessori" (facebook.com/montessori.gt) exists in the same town — confirmed NOT the same entity, do not use'),
    ('NPH Honduras — Casa Santa Ana Montessori Program', 'Honduras', 'DATA FLAG: search results place "Casa Santa Ana" in EL SALVADOR (opened 2003), not Honduras — the master row\'s country may be mislabeled. No email surfaced for either the Honduras or El Salvador NPH program'),
    ('Hilda Rothschild Foundation — EDUCAMBIO/Montessori Program', 'El Salvador', 'US-side foundation office (Scarsdale, NY) confirmed via GuideStar/ZoomInfo; hrffoundation.org site not directly fetched for an email this pass'),
    ('Friends of Morazán — Montessori Pre-School', 'Nicaragua', 'UK-registered charity (#1111253, friendsofmorazan.org); site not directly fetched for a contact email this pass'),
]
for name, country, notes in notfound_rows:
    email_rows.append({
        'org_name': name,
        'country': country,
        'old_email': 'not_found',
        'found_email': 'NOT_FOUND',
        'seen_where': '',
        'facebook_url': fb_of(name, gsm),
        'notes': notes,
    })

with open(out_base + 'enrich-emails-jul12.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['org_name','country','old_email','found_email','seen_where','facebook_url','notes'], quoting=csv.QUOTE_ALL)
    w.writeheader()
    for row in email_rows:
        w.writerow(row)

print(f"EMAIL_ROWS_WRITTEN={len(email_rows)}")
