import pandas as pd

base = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/outreach/"

master = pd.read_csv(base+"Montree_Global_Master_Jul2026.csv", dtype=str, keep_default_na=False)
disadv = master[master['Type']=='disadvantaged'].copy()
noemail = disadv[(disadv['Email'].str.strip()=='') | (disadv['Email'].str.strip()=='not_found')]

dfa = pd.read_csv(base+"social/disadvantaged-facebook-A.csv", dtype=str, keep_default_na=False)
dfb = pd.read_csv(base+"social/disadvantaged-facebook-B.csv", dtype=str, keep_default_na=False)
both = pd.concat([dfa, dfb], ignore_index=True)

gsm = pd.read_csv(base+"social/global-social-merged.csv", dtype=str, keep_default_na=False)
all_disadv_names = set(disadv['School'].tolist())
hits = gsm[gsm['school_name'].isin(all_disadv_names)]

email_map = {}
for _, r in both.iterrows():
    e = r['email_found_incidentally'].strip()
    if e and e.upper() != 'NONE':
        email_map.setdefault(r['school_name'], e)

still_need_email = []
for _, r in noemail.iterrows():
    name = r['School']
    if name not in email_map:
        still_need_email.append(name)

print("STILL_NEED_EMAIL", len(still_need_email))
for n in still_need_email:
    row = noemail[noemail['School']==n].iloc[0]
    print(f"{n} | {row['Country']} | {row['Website']}")

covered_fb = set(hits['school_name'].tolist())
missing_fb = all_disadv_names - covered_fb
print("\nMISSING_FB", len(missing_fb))
for n in sorted(missing_fb):
    print(n)

print("\nEMAIL_MAP_COUNT", len(email_map))
