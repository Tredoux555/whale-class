# Web Claude Research Prompt — Montessori School Discovery + Contact Enrichment

Paste this into Claude.ai (claude.com) web interface. Claude on web has live browsing and can reach Baidu, Chinese sites, and LinkedIn in ways my Cowork-sandbox web tools often can't.

---

## Your task

Build the most comprehensive possible list of Montessori schools worldwide, with the most up-to-date contact details you can verify. This is feeding a cold-email + phone outreach campaign for **Montree** (montree.xyz), an AI-powered Montessori classroom management system.

I already have 770 schools in my master list (420 global with emails + 350 China, mostly phone-only). I want you to **double it** and enrich every record you can.

## Your output

A single Excel workbook (`Montree_Research_WebClaude.xlsx`) with these tabs:

1. **New_Schools** — one row per newly-found school with: `SchoolName, SchoolNameLocal, Email, Email2, Phone, Phone2, Website, Country, City, Region, Address, PrincipalName, PrincipalEmail, AgeRange, Accreditation, UsesTransparentClassroom, WeChatID, LinkedInURL, SocialMedia, Source1, Source2, Source3, VerifiedDate, Notes`
2. **Enriched_Existing** — if you find better contacts for a school I may already have (new email, new phone, principal name), put it here with the school name and new fields
3. **Dead_Or_Moved** — schools you found references to but that appear closed/renamed/relocated
4. **Sources_Log** — one row per directory/source you exhausted, so I can audit

**Quality bar:** verify every contact from **three independent sources** before marking VerifiedDate. One source = leave VerifiedDate blank and add a note. Prefer named principal/director emails over generic `info@`. Flag uncertainty in Notes.

## Where to search — exhaust everything

### Directories (start here)
- American Montessori Society (AMS) — amshq.org school directory
- Association Montessori Internationale (AMI) — montessori-ami.org member schools
- International Montessori Council — montessori.org
- Montessori Schools Association UK
- Montessori Australia — montessori.org.au
- Canadian Council of Montessori Administrators
- NAMTA — north-american Montessori teachers
- Every country's national Montessori association you can find
- MACTE-accredited teacher training centers — they list partner schools
- Transparent Classroom: no public customer directory, but search their blog, case studies, and Google `"powered by transparent classroom" site:*.org OR site:*.edu`

### China — use Baidu, not Google
Baidu search queries:
- `蒙特梭利幼儿园` (Montessori kindergarten)
- `蒙氏幼儿园`
- `Montessori 学校`
- `AMI 认证 幼儿园`
- `国际幼儿园 蒙特梭利`

Baidu Maps (map.baidu.com) sweep every tier-1 and tier-2 city:
- Beijing, Shanghai, Guangzhou, Shenzhen (tier 1)
- Chengdu, Hangzhou, Nanjing, Wuhan, Xi'an, Chongqing, Tianjin, Qingdao, Suzhou, Xiamen, Dalian, Harbin, Changchun, Nanning, Guiyang, Haikou, Shijiazhuang, Dongguan, Foshan, Wuxi, Nanchang, Lanzhou, Taiyuan, Kunming, Hefei, Fuzhou, Zhengzhou, Jinan, Ningbo, Changsha, Ürümqi
- Plus any tier-3 you encounter

Other Chinese sources:
- Dianping (大众点评) — parent reviews often mention the school's name and phone
- 58.com kindergarten listings
- Xiaohongshu (小红书 / RED) — search "蒙特梭利" for parent posts naming schools
- WeChat public accounts — search for Montessori school aggregator accounts
- International schools in China listings (Venture Education, ISC Research, TheBeijinger school listings) — filter for Montessori tracks

### Everywhere else — be creative
- Google / Bing / DuckDuckGo: `"Montessori school" [city]` for every major city in India, SE Asia, Africa, Latin America, Eastern Europe, Middle East
- Yandex for Russia / Central Asia / ex-USSR
- Naver for South Korea (`몬테소리`)
- Google Maps "Montessori school near [city]" — scrape the sidebar listings
- Wikipedia: "List of Montessori schools" pages, also Wikipedia infoboxes of notable alumni that mention their schools
- News archives (Google News) — "new Montessori school opens" + country, last 3 years
- LinkedIn — search for "Montessori" + "Principal" / "Head of School" / "Directress" / "Director" → click through to company pages
- Facebook Groups — "Montessori Parents [country]" often list schools
- Reddit r/Montessori, r/MontessoriEducation
- Academic papers on Google Scholar citing specific Montessori schools in their methodology sections
- Conference attendee lists: AMS Annual Conference, AMI International Congress, European Montessori Congress
- Podcasts interviewing Montessori principals — the show notes often link the school
- Real estate listings in expensive neighborhoods — "near Montessori school" often names the school
- YouTube — school tours and open-day videos often caption the school name + city

### LinkedIn enrichment (CRITICAL for current emails)
For every school where you have only a generic `info@` email:
1. Search LinkedIn for "Principal [School Name]" or "Head of School [School Name]"
2. If you find them, try to derive their email from the school's domain pattern (e.g., if `info@abcmontessori.com` works, then `firstname.lastname@abcmontessori.com` often works)
3. Note the principal's name in the PrincipalName column even if you can't verify the email

### Phone numbers (CRITICAL for China)
For China schools: Baidu Maps listings almost always include a phone number. Grab it. Also check WeChat IDs.
For everywhere else: school website contact page, then Google Maps sidebar, then Yelp (US) / Yell (UK) / local business directory.

## Specific gaps I'm under-covered in — go hard on these

- **India** — huge Montessori presence, I have almost nothing. AMI has a big India chapter.
- **Southeast Asia** — Singapore, Malaysia, Thailand, Vietnam, Indonesia, Philippines
- **Africa** — Kenya, Nigeria, South Africa, Ghana, Egypt
- **Latin America** — Mexico, Brazil, Argentina, Colombia, Chile
- **Eastern Europe** — Poland, Czech Republic, Hungary, Romania, Ukraine (if still operating)
- **Middle East** — UAE, Saudi Arabia, Qatar, Jordan, Lebanon, Israel, Türkiye
- **Russia + Central Asia** — use Yandex
- **South Korea + Japan** — affluent market with growing Montessori uptake

## Triple-verification method

For each school, verify from three independent angles:
1. **Directory or official listing** (AMS, AMI, national association, international school index)
2. **Direct website fetch** — does the contact page match the directory email? Is the phone consistent?
3. **Third anchor** — LinkedIn company page, Google Maps listing, recent news mention, or social media bio

If all three agree → set VerifiedDate to today. If 2/3 agree → note the discrepancy. If only 1 → leave VerifiedDate blank and flag.

## Stop criteria

There's no hard stop — keep going until the well runs dry or you hit a practical time limit. My target is: current 770 → 1,500+. If you can push it higher, do.

## What NOT to do

- Don't invent or guess email addresses you haven't seen on a page. `firstname@domain.com` patterns are OK to note in Notes but should not go in Email unless verified.
- Don't pad with non-Montessori schools. "Progressive" ≠ Montessori. "Reggio-inspired" ≠ Montessori. If a school mixes approaches, note it in Notes and still include it — but don't include plain Waldorf, Reggio-only, or mainstream preschools.
- Don't skip LinkedIn because it's clunky. Principal names are the single highest-leverage field I don't have.
- Don't trust stale data. If a listing is from 2019, verify the school still operates before including.

Take your time. This is the most important piece of outreach infrastructure I have for Montree's next 6 months.
