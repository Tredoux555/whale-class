import pandas as pd
base = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/outreach/"
master = pd.read_csv(base+"Montree_Global_Master_Jul2026.csv", dtype=str, keep_default_na=False)
for name in ["Inkwell Montessori", "Divine Mercy Montessori School", "Harmony Montessori School", "St. Joseph Montessori School (Ndirima-Litembo)"]:
    r = master[master['School']==name]
    if len(r):
        row = r.iloc[0]
        print(name, "|", row['City'], "|", row['Region'], "|", row['Country'], "|", row['Notes'][:150])
    else:
        print(name, "NOT IN MASTER")
