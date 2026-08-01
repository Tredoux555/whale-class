import json, urllib.request, urllib.parse

with open('/tmp/montree_super_admin_token.json') as f:
    token = json.load(f)['token']

base = 'https://montree.xyz'
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")

terms = ['montessori school', 'montessori academy', 'montessori preschool',
         'montessori nursery', 'montessori centre', 'montessori center',
         'casa dei bambini', 'montessori kindergarten', 'montessori house',
         'montessori children']

used_handles = set([
 'qingdao_amerasia','tunis_montessori_school','montessoriacademyaus','mtcmacademy','n4melissa','myfirstacademya',
 'naudainmontessoriacademy','oakcityraleigh','crescentridgeacademy','montessoribilingual','karunamontessori_preschool',
 'lacasadiirma','ilgirasole.06','soaringwingsmontessori','kinderopvang2samen','kotara_montessori','lenvolmontessori',
 'lachrysalide_agadir','laurelsschools','oxfordgrouplecce','lefutrecht','garderie_lesateliers_de_zoy','littlehandsmontessori_',
 'mountainlaurelmontessori','montessorischoolofdurham','montessorischoolofrochester'
])

seen = set()
results = []

for term in terms:
    q = urllib.parse.quote(term)
    url = f"{base}/api/montree/super-admin/global-outreach?view=contacts&all=1&limit=200&q={q}"
    req = urllib.request.Request(url)
    req.add_header("x-super-admin-token", token)
    req.add_header("User-Agent", UA)
    req.add_header("Accept", "application/json, text/plain, */*")
    req.add_header("Referer", base + "/montree/super-admin")
    req.add_header("Origin", base)
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    except Exception as e:
        print("ERR", term, e)
        continue
    contacts = data.get('contacts') or data.get('data') or []
    for c in contacts:
        fb = (c.get('facebook_url') or '').strip()
        status = c.get('social_status')
        if status != 'found' or not fb: continue
        handle = fb.rstrip('/').split('/')[-1]
        if handle in used_handles: continue
        junk = ['2008/fbml','profile.php','wordpresscom','expireddomainscom','wix','facebook.com/tr','pages/category','groups/']
        if any(j in fb for j in junk): continue
        key = handle.lower()
        if key in seen: continue
        seen.add(key)
        results.append({'org': c.get('org_name'), 'fb': fb, 'country': c.get('country'), 'email': c.get('email')})

print(f"Found {len(results)} fresh FB candidates")
for r in results:
    print(r)
