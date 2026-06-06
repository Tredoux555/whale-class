-- Seed Dark Phonics works (real curriculum rows) for school c6280fae-567c-45ed-ad4d-934eae79aabc
-- Idempotent: only inserts work_keys not already present; safe to re-run.
BEGIN;

WITH lessons(work_key, nm, descr, seq) AS (
  VALUES
  ('phonics_05', 'Phonics 05: s /s/ — snake, sun, sock', 'Dark Phonics — lesson 5 (s). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10005),
  ('phonics_06', 'Phonics 06: a /ă/ — ant, apple', 'Dark Phonics — lesson 6 (a). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10006),
  ('phonics_07', 'Phonics 07: t /t/ — top, tap, sat', 'Dark Phonics — lesson 7 (t). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10007),
  ('phonics_08', 'Phonics 08: p /p/ — pat, pup, pop', 'Dark Phonics — lesson 8 (p). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10008),
  ('phonics_09', 'Phonics 09: i /ĭ/ — sit, tip, sip', 'Dark Phonics — lesson 9 (i). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10009),
  ('phonics_10', 'Phonics 10: n /n/ — nap, pin, pan', 'Dark Phonics — lesson 10 (n). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10010),
  ('phonics_11', 'Phonics 11: m /m/ — map, mat, man', 'Dark Phonics — lesson 11 (m). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10011),
  ('phonics_12', 'Phonics 12: d /d/ — dog, dad, dip', 'Dark Phonics — lesson 12 (d). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10012),
  ('phonics_13', 'Phonics 13: g /g/ — goat, pig, dig', 'Dark Phonics — lesson 13 (g). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10013),
  ('phonics_14', 'Phonics 14: o /ŏ/ — pot, top, dog', 'Dark Phonics — lesson 14 (o). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10014),
  ('phonics_15', 'Phonics 15: c /k/ — cat, can, cap', 'Dark Phonics — lesson 15 (c). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10015),
  ('phonics_16', 'Phonics 16: k /k/ — kid, kit, kite', 'Dark Phonics — lesson 16 (k). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10016),
  ('phonics_17', 'Phonics 17: ck /k/ — kick, sock, pick', 'Dark Phonics — lesson 17 (ck). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10017),
  ('phonics_18', 'Phonics 18: e /ĕ/ — pen, ten, get', 'Dark Phonics — lesson 18 (e). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10018),
  ('phonics_19', 'Phonics 19: u /ŭ/ — up, cup, pup', 'Dark Phonics — lesson 19 (u). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10019),
  ('phonics_20', 'Phonics 20: r /r/ — run, red, rat', 'Dark Phonics — lesson 20 (r). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10020),
  ('phonics_21', 'Phonics 21: h /h/ — hat, hop, hot', 'Dark Phonics — lesson 21 (h). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10021),
  ('phonics_22', 'Phonics 22: b /b/ — boat, big, bed', 'Dark Phonics — lesson 22 (b). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10022),
  ('phonics_23', 'Phonics 23: f /f/ — fan, fun, fox', 'Dark Phonics — lesson 23 (f). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10023),
  ('phonics_24', 'Phonics 24: l /l/ — lap, leg, log', 'Dark Phonics — lesson 24 (l). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10024),
  ('phonics_25', 'Phonics 25: j /j/ — jump, jam, jar', 'Dark Phonics — lesson 25 (j). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10025),
  ('phonics_26', 'Phonics 26: v /v/ — van, vet, vine', 'Dark Phonics — lesson 26 (v). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10026),
  ('phonics_27', 'Phonics 27: w /w/ — wind, wet, web', 'Dark Phonics — lesson 27 (w). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10027),
  ('phonics_28', 'Phonics 28: x /ks/ — box, fox, six', 'Dark Phonics — lesson 28 (x). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10028),
  ('phonics_29', 'Phonics 29: y /y/ — yes, yum, yam', 'Dark Phonics — lesson 29 (y). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10029),
  ('phonics_30', 'Phonics 30: z /z/ — zip, zap, zoo', 'Dark Phonics — lesson 30 (z). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10030),
  ('phonics_31', 'Phonics 31: qu /kw/ — queen, quick, quiz', 'Dark Phonics — lesson 31 (qu). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10031),
  ('phonics_32', 'Phonics 32: review — cat, pig, dog', 'Dark Phonics — lesson 32 (review). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10032),
  ('phonics_33', 'Phonics 33: vowels — cat, pet, pig, pot, cup', 'Dark Phonics — lesson 33 (vowels). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10033),
  ('phonics_34', 'Phonics 34: review — cat, dog, sun', 'Dark Phonics — lesson 34 (review). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10034),
  ('phonics_35', 'Phonics 35: short a /ă/ — cat, hat, man', 'Dark Phonics — lesson 35 (short a). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10035),
  ('phonics_36', 'Phonics 36: short i /ĭ/ — pig, big, sit', 'Dark Phonics — lesson 36 (short i). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10036),
  ('phonics_37', 'Phonics 37: short o /ŏ/ — dog, hot, box', 'Dark Phonics — lesson 37 (short o). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10037),
  ('phonics_38', 'Phonics 38: short e /ĕ/ — bed, ten, pet', 'Dark Phonics — lesson 38 (short e). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10038),
  ('phonics_39', 'Phonics 39: short u /ŭ/ — sun, fun, bug', 'Dark Phonics — lesson 39 (short u). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10039),
  ('phonics_40', 'Phonics 40: minimal pairs — cat, cot, cut', 'Dark Phonics — lesson 40 (minimal pairs). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10040),
  ('phonics_41', 'Phonics 41: ll ff ss zz — bell, hill, doll', 'Dark Phonics — lesson 41 (ll ff ss zz). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10041),
  ('phonics_42', 'Phonics 42: sh /sh/ — ship, fish, shop', 'Dark Phonics — lesson 42 (sh). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10042),
  ('phonics_43', 'Phonics 43: ch /ch/ — chick, chop, chin', 'Dark Phonics — lesson 43 (ch). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10043),
  ('phonics_44', 'Phonics 44: th /th/ — thin, thick, bath', 'Dark Phonics — lesson 44 (th). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10044),
  ('phonics_45', 'Phonics 45: wh /wh/ — when, whale, wheel', 'Dark Phonics — lesson 45 (wh). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10045),
  ('phonics_46', 'Phonics 46: th /th/ — this, that, them', 'Dark Phonics — lesson 46 (th). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10046),
  ('phonics_47', 'Phonics 47: st nd mp — fast, hand, jump', 'Dark Phonics — lesson 47 (st nd mp). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10047),
  ('phonics_48', 'Phonics 48: nk nt lt — pink, sink, tent', 'Dark Phonics — lesson 48 (nk nt lt). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10048),
  ('phonics_49', 'Phonics 49: s-blends — slip, sled, snap', 'Dark Phonics — lesson 49 (s-blends). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10049),
  ('phonics_50', 'Phonics 50: l-blends — clap, flag, glass', 'Dark Phonics — lesson 50 (l-blends). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10050),
  ('phonics_51', 'Phonics 51: r-blends — frog, crab, drum', 'Dark Phonics — lesson 51 (r-blends). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10051),
  ('phonics_52', 'Phonics 52: tw dw — twin, twist, twig', 'Dark Phonics — lesson 52 (tw dw). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10052),
  ('phonics_53', 'Phonics 53: triple blends — splash, sprint, strap', 'Dark Phonics — lesson 53 (triple blends). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html', 10053)
),
targets AS (
  SELECT c.id AS classroom_id, a.id AS area_id
  FROM montree_classrooms c
  JOIN montree_classroom_curriculum_areas a
    ON a.classroom_id = c.id AND a.area_key = 'language'
  WHERE c.school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
)
INSERT INTO montree_classroom_curriculum_works
  (classroom_id, name, work_key, area_id, sequence, description, parent_description, is_custom, is_active, source)
SELECT t.classroom_id, l.nm, l.work_key, t.area_id, l.seq, l.descr, l.descr, false, true, 'phonics_pack'
FROM targets t
CROSS JOIN lessons l
WHERE NOT EXISTS (
  SELECT 1 FROM montree_classroom_curriculum_works w
  WHERE w.classroom_id = t.classroom_id AND w.work_key = l.work_key
);

-- Reactivate any previously-hidden phonics rows (in case the flag was toggled off before).
UPDATE montree_classroom_curriculum_works w
SET is_active = true
FROM montree_classrooms c
WHERE w.classroom_id = c.id AND c.school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND w.source = 'phonics_pack' AND w.is_active = false;

-- Repair any photos tagged during the brief virtual-merge window (work_id text 'phonics_NN'
-- → the real seeded row id) so their work name resolves.
UPDATE montree_media m
SET work_id = w.id
FROM montree_classroom_curriculum_works w
JOIN montree_classrooms c ON c.id = w.classroom_id
WHERE c.school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND w.source = 'phonics_pack'
  AND m.classroom_id = w.classroom_id
  AND m.work_id = w.work_key;   -- old virtual id equals the work_key ('phonics_NN')

COMMIT;

-- Verify:
-- SELECT classroom_id, count(*) FROM montree_classroom_curriculum_works
--   WHERE source='phonics_pack' AND is_active GROUP BY 1;
