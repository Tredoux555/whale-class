import fs from 'fs';

const P = 'scripts/data/curated-visual-memory/cultural.json';
const j = JSON.parse(fs.readFileSync(P, 'utf8'));

const NEW = [
  {
    work_key: "cu_globe_land_water",
    work_name: "Globe - Land and Water",
    area: "cultural",
    visual_description: "A child-sized sphere on a low wooden stand, held and turned with both hands, resting in the child's lap or on a mat rather than a desk fixture. Its surface has two textures only: smooth painted blue for water, and rough sandpaper-textured tan/brown for land, with no country outlines, no borders, and no colour distinction between continents. Often paired on a nearby tray with a blue and a brown clay/plasticine ball or small dish of blue and brown liquid for a pouring comparison of ocean vs land proportion. The defining picture is a two-texture, two-colour blue/brown sphere the child feels with closed eyes.",
    key_materials: [
      "Child-sized wooden-based sphere",
      "Smooth blue painted surface for water",
      "Rough sandpaper brown/tan surface for land",
      "No printed country names or borders"
    ],
    negative_descriptions: [
      "NOT Globe - Continents: this globe has only two TEXTURES and two colours (smooth blue water, rough brown land); the Continents globe is smooth all over and shows each continent painted a DIFFERENT solid colour with no texture contrast."
    ]
  },
  {
    work_key: "cu_globe_continents",
    work_name: "Globe - Continents",
    area: "cultural",
    visual_description: "A child-sized sphere on a low wooden stand, smooth to the touch all over with no texture difference between land and water. The ocean is one uniform blue, and each of the seven continents is painted a distinct solid colour (commonly matching the colours used on the continent puzzle map — e.g. yellow Europe, green North America, red South America, brown Asia, pink Africa, orange Australia, white Antarctica), with painted or embossed outlines separating them. No country borders within continents, no printed labels for young children. The defining picture is a smooth multi-coloured sphere where colour, not texture, marks the continents.",
    key_materials: [
      "Child-sized wooden-based sphere, smooth surface throughout",
      "Each continent painted a distinct solid colour",
      "Uniform blue ocean",
      "Colours typically match the continent puzzle map set"
    ],
    negative_descriptions: [
      "NOT Globe - Land and Water: the Continents globe is smooth everywhere and colour-coded by continent; the Land and Water globe is textured (rough land, smooth water) and only two colours, blue and brown."
    ]
  },
  {
    work_key: "cu_puzzle_map_world",
    work_name: "Puzzle Map - World",
    area: "cultural",
    visual_description: "A large flat wooden inset puzzle map lying on a mat or table, its wooden frame outlining the ocean in solid blue, with the seven continents as separate wooden puzzle pieces, each a distinct solid colour and each piece fitted with a small brass/wood knob for lifting. Countries are NOT shown within continents at this stage — each continent is one single-coloured piece. Work involves lifting continent pieces out and laying them beside the frame, sometimes tracing around the empty socket. The defining picture is one large flat map frame holding SEVEN separate, differently-coloured continent-shaped knobbed pieces.",
    key_materials: [
      "Large flat wooden map frame/base painted blue for ocean",
      "Seven continent-shaped wooden puzzle pieces, each a solid distinct colour",
      "Small knob on each continent piece for lifting",
      "No internal country divisions"
    ],
    negative_descriptions: [
      "NOT Puzzle Maps - Individual Continents: the World map has ONE piece per whole continent; an Individual Continent puzzle map is zoomed into a single continent and its pieces are the COUNTRIES within that continent, each with its own knob.",
      "NOT Land and Water Forms: the World map is a large flat inset puzzle with knobbed continent pieces; Land and Water Forms are small individual moulded relief trays (islands, lakes, capes) with no fitted pieces at all."
    ]
  },
  {
    work_key: "cu_puzzle_maps_continents",
    work_name: "Puzzle Maps - Individual Continents",
    area: "cultural",
    visual_description: "A flat wooden inset puzzle map of a single continent (e.g. Europe, Asia, Africa, North America, South America, Australia) filling most of the frame, with the surrounding ocean/frame painted the continent's identifying colour from the World map. Unlike the World map, this map's pieces are the individual COUNTRIES making up that continent, each a separate small wooden piece with its own knob, often in varied colours or all one shade with painted borders. The child lifts country pieces out one at a time and lays them on the mat, sometimes matching a small control map or country label card alongside. The defining picture is a single continent's outline subdivided into many small country-shaped knobbed pieces.",
    key_materials: [
      "Flat wooden frame shaped as one continent",
      "Many small country-shaped puzzle pieces with knobs",
      "Frame border coloured to match that continent on the World map",
      "Sometimes paired with a small control map or country labels"
    ],
    negative_descriptions: [
      "NOT Puzzle Map - World: the Individual Continent map's pieces are COUNTRIES within one continent; the World map's pieces are whole CONTINENTS, one piece each, on a full world frame."
    ]
  },
  {
    work_key: "cu_flags",
    work_name: "Flags of the World",
    area: "cultural",
    visual_description: "A set of small rectangular paper or laminated flag cards, or small flags on wooden dowels/stands, each printed with a different country's national flag design and often a small country name label. Cards are typically laid out on a mat or table in rows, sometimes matched against a labelled world map or continent map, sometimes sorted into piles by continent, sometimes paired with a matching blank/control card. The defining picture is a scatter or grid of small rectangular flag images with distinct national colour patterns, clearly not maps, animals, or plant pictures.",
    key_materials: [
      "Small rectangular flag cards or mini flags on stands",
      "Each card printed with one country's distinct flag pattern",
      "Often includes small printed country name labels",
      "Frequently paired with a map for matching by continent"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_land_water_forms",
    work_name: "Land and Water Forms",
    area: "cultural",
    visual_description: "A set of small individual moulded relief trays or dishes, each shaped to demonstrate one geography term-pair such as island/lake, peninsula/gulf, isthmus/strait, cape/bay. Each tray has a raised or built-up 'land' section (often left as plain moulded plastic/clay) and a poured-in 'water' section, sometimes literally filled with blue-tinted water for a hands-on pour activity, sometimes shown dry with the land portion painted brown and water portion blue. Trays are worked one at a time on a tray/mat, often alongside small paired terminology cards. The defining picture is a small individual moulded landform tray with one raised/dry area and one poured/blue area — never a full sphere and never a flat map.",
    key_materials: [
      "Set of small individual moulded relief trays or dishes",
      "Each tray shows one land/water landform pair",
      "Land portion raised or brown; water portion blue, sometimes real poured water",
      "Often paired with terminology matching cards"
    ],
    negative_descriptions: [
      "NOT Globe - Land and Water: Land and Water Forms are small individual FLAT TRAYS demonstrating one landform pair each; the Land and Water globe is a single SPHERE showing the whole earth's texture contrast, not individual named landforms."
    ]
  },
  {
    work_key: "cu_solar_system",
    work_name: "Solar System",
    area: "cultural",
    visual_description: "A set of materials showing the sun and eight (or nine) planets, typically as a printed chart, floor mat, or a set of individually painted foam/wooden spheres graded in relative size and colour to match each planet, often arranged in orbital order on a black or dark mat radiating outward from a central yellow/orange sun. May include planet name labels, a control chart, or planet fact cards laid alongside. The defining picture is a row or radial arrangement of differently-sized, differently-coloured spheres or planet images ordered from the sun outward — clearly astronomical, not geographic (no continents, no country shapes).",
    key_materials: [
      "Sun and planet models (spheres or printed images), graded in relative size",
      "Distinct planet colours (e.g. red Mars, banded Jupiter, ringed Saturn)",
      "Often arranged in orbital order on a dark mat",
      "May include name labels or fact cards"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_calendar",
    work_name: "Calendar Work",
    area: "cultural",
    visual_description: "A wall-mounted or floor-based calendar material: commonly a grid or circular chart showing days of the week and/or months of the year, with a movable marker, clip, or card the child moves to the current date. May include separate small labelled cards for day names and month names that the child sequences or matches, and a printed or written date recorded on a whiteboard or in a notebook. The defining picture is a dated grid/wheel with a marker indicating 'today', clearly text/number based rather than a geography or science apparatus.",
    key_materials: [
      "Calendar grid or circular wheel showing days/months",
      "Movable marker or clip indicating the current date",
      "Day-name and month-name cards for sequencing",
      "Sometimes a notebook or whiteboard for recording the date"
    ],
    negative_descriptions: [
      "NOT Personal Timeline: Calendar Work tracks the current day/month/year on a recurring grid or wheel; a Personal Timeline is a long individual strip showing one child's own life events from birth to now, not a repeating calendar."
    ]
  },
  {
    work_key: "cu_birthday_celebration",
    work_name: "Birthday Celebration",
    area: "cultural",
    visual_description: "A special classroom ceremony scene: children seated in a circle on the floor around a central sun symbol (often a yellow felt or paper sun) or lit candle, with the birthday child walking around the circle carrying a globe or photo while classmates sing or the teacher narrates each year of the child's life. Often accompanied by a small display of the child's baby-to-present photos laid out in sequence, and sometimes a decorative 'birthday walk' path or seasonal markers around the circle. The defining picture is a floor circle gathering centred on a sun/candle symbol with the birthday child walking or being walked around it while photos or a globe are held — a ceremonial classroom moment, not a desk material.",
    key_materials: [
      "Circle seating on the floor around a central sun or candle symbol",
      "Birthday child walking the circle holding a globe or photo",
      "Sequenced baby-to-present photographs on display",
      "Ceremonial, whole-group classroom activity"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_personal_timeline",
    work_name: "Personal Timeline",
    area: "cultural",
    visual_description: "A long horizontal strip of paper or card, laid out on a table or the floor and often extending several feet, marked with the child's own life events in chronological order (birth, first steps, starting school, etc.), each event marked with a small photo, drawing, or written note glued or clipped along the strip. The child works alone laying out or adding to this personal timeline, distinct from any repeating calendar or historical era chart. The defining picture is one continuous long strip specific to a single child's own past, decorated with that child's own photos or drawings in date order.",
    key_materials: [
      "Long horizontal paper or card strip",
      "Personal photos or drawings glued/clipped at intervals",
      "Chronological life events specific to one child",
      "Often extends across a table or floor length"
    ],
    negative_descriptions: [
      "NOT Timeline of Life: a Personal Timeline covers ONE child's own life events with personal photos; the Timeline of Life is a much longer chart covering the history of life on Earth (geological eras, extinct creatures), with no personal photos at all.",
      "NOT Calendar Work: the Personal Timeline is a single long strip of one child's life history; Calendar Work is a recurring grid or wheel tracking the current day/month."
    ]
  },
  {
    work_key: "cu_clock",
    work_name: "Clock Work",
    area: "cultural",
    visual_description: "A teaching clock material: a wooden or cardboard clock face with a numbered dial (1-12) and movable hour and minute hands the child turns by hand to set specific times, often paired with small time cards showing a printed clock face or written time (e.g. '3:30') for the child to match or replicate. May be a standalone geared demonstration clock or a simple two-hand dial. The defining picture is a round clock face with numerals and movable hands being manually set by a child, distinct from any calendar grid or map material.",
    key_materials: [
      "Round clock face with numbered dial 1-12",
      "Movable hour and minute hands",
      "Time-matching cards showing printed clock faces or written times",
      "Manipulated by hand to set specific times"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_timeline_life",
    work_name: "Timeline of Life",
    area: "cultural",
    visual_description: "A very long horizontal chart or paper roll, typically laid out along the floor or a long table, divided into geological eras (with era names such as Precambrian, Paleozoic, Mesozoic, Cenozoic) and illustrated with images of extinct and early life forms (single-celled organisms, early fish, dinosaurs, early mammals, early humans) appearing in sequence toward the present day. No personal photos, no dates in years, purely deep geological/evolutionary time. The defining picture is an extended illustrated strip depicting the history of life on Earth across vast eras, populated with prehistoric creature images, not the child's own life or a calendar.",
    key_materials: [
      "Long horizontal timeline chart or paper roll",
      "Divided into geological eras with era name labels",
      "Illustrated with prehistoric life forms and extinct creatures",
      "No personal photographs; deep-time scale, not calendar dates"
    ],
    negative_descriptions: [
      "NOT Personal Timeline: the Timeline of Life shows Earth's geological eras and prehistoric creatures; a Personal Timeline shows one child's own life events with that child's photos, a vastly shorter and personal scale."
    ]
  },
  {
    work_key: "cu_fundamental_needs",
    work_name: "Fundamental Needs of Humans",
    area: "cultural",
    visual_description: "A set of picture cards or a chart showing basic human needs across cultures and eras — food, shelter, clothing, transportation, defence, and spiritual/artistic expression — often paired sets showing the SAME need met differently by different cultures or time periods (e.g. a mud hut and a modern apartment both under 'shelter'). Cards are typically sorted into category groups on a mat, sometimes with a printed category label card at the head of each group. The defining picture is grouped photo/illustration cards clustered under need categories, showing cultural variety rather than any single geography or biology topic.",
    key_materials: [
      "Sets of picture cards illustrating human needs (food, shelter, clothing, etc.)",
      "Cards grouped into categories on a mat",
      "Often paired to contrast how different cultures meet the same need",
      "Category label cards heading each group"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_living_nonliving",
    work_name: "Living vs Non-Living",
    area: "cultural",
    visual_description: "A sorting activity with two labelled category cards or mats ('Living' and 'Non-Living') and a pile of small picture cards or real/miniature objects (plant, animal, rock, toy car, tree, chair) that the child sorts into the two groups. The defining picture is a simple binary sort of mixed everyday and natural objects/images into exactly two labelled piles or mats — a basic classification exercise, not a plant- or animal-specific nomenclature card set.",
    key_materials: [
      "Two category cards or mats labelled 'Living' and 'Non-Living'",
      "Small picture cards or miniature objects to sort",
      "Mixed content: plants, animals, and man-made/inanimate objects",
      "Binary sorting layout"
    ],
    negative_descriptions: [
      "NOT Plant vs Animal: Living vs Non-Living sorts LIVING things against NON-LIVING objects; Plant vs Animal sorts two categories that are BOTH living, distinguishing plants from animals specifically.",
      "NOT Vertebrate vs Invertebrate: Living vs Non-Living is the broadest sort (alive or not); Vertebrate vs Invertebrate is a much narrower sort within animals only (backbone or no backbone)."
    ]
  },
  {
    work_key: "cu_plant_animal",
    work_name: "Plant vs Animal",
    area: "cultural",
    visual_description: "A sorting activity with two labelled category cards or mats ('Plant' and 'Animal') and a pile of small picture cards or miniature figures depicting only living things — flowers, trees, insects, mammals, fish — that the child sorts into the two groups. Unlike Living vs Non-Living, every image here IS alive; there are no rocks, furniture, or man-made objects in the pile. The defining picture is a binary sort where BOTH categories are living organisms, split specifically between plant and animal kingdoms.",
    key_materials: [
      "Two category cards or mats labelled 'Plant' and 'Animal'",
      "Small picture cards or figures, all depicting living organisms",
      "No non-living or man-made items included",
      "Binary sorting layout"
    ],
    negative_descriptions: [
      "NOT Living vs Non-Living: Plant vs Animal sorts only living things into plant or animal; Living vs Non-Living includes non-living/man-made items as one whole category alongside living things.",
      "NOT Vertebrate vs Invertebrate: Plant vs Animal splits ALL living things by kingdom; Vertebrate vs Invertebrate sorts ONLY animals, by presence of a backbone."
    ]
  },
  {
    work_key: "cu_parts_plant",
    work_name: "Parts of a Plant",
    area: "cultural",
    visual_description: "A labelled nomenclature card or three-part card set showing a full plant diagram (root, stem, leaf, flower, fruit) with small printed label tabs or separate word cards the child matches to each part, laid out on a mat in a control-card/label-card/picture-card triad. The picture shows a WHOLE plant with ALL its structures visible at once — root system below ground through to flower/fruit above — distinguishing it from the more zoomed-in single-structure cards (leaf only, root only, seed only).",
    key_materials: [
      "Three-part nomenclature cards: control card, picture card, label cards",
      "Diagram of a complete plant showing root, stem, leaf, flower, fruit together",
      "Small printed word labels matched to pointer lines on the diagram",
      "Laid out flat on a mat in rows"
    ],
    negative_descriptions: [
      "NOT Parts of a Flower: Parts of a Plant shows the WHOLE plant (root to flower); Parts of a Flower zooms in on JUST the flower head (petals, stamen, pistil, sepal).",
      "NOT Parts of a Leaf: Parts of a Plant shows the whole plant; Parts of a Leaf zooms in on a single leaf shape only (blade, veins, petiole).",
      "NOT Parts of a Root: Parts of a Plant shows the whole plant; Parts of a Root zooms in on the underground root system only."
    ]
  },
  {
    work_key: "cu_parts_flower",
    work_name: "Parts of a Flower",
    area: "cultural",
    visual_description: "A labelled nomenclature card set (three-part cards or a puzzle-style flower model) showing ONLY the flower head zoomed in — petal, sepal, stamen, pistil, stem tip — with small printed label tabs matched to pointer lines, laid out on a mat as control card, unlabelled picture card, and separate word cards. Sometimes accompanies a matching foam/plastic dissectible flower model with removable petal and stamen pieces. The defining picture is a close-up flower diagram with NO roots, stem-base, or leaves shown — just the bloom's internal structures.",
    key_materials: [
      "Three-part nomenclature cards focused on the flower head only",
      "Labels for petal, sepal, stamen, pistil",
      "Sometimes a dissectible foam/plastic flower model",
      "No whole-plant or root imagery"
    ],
    negative_descriptions: [
      "NOT Parts of a Plant: Parts of a Flower is zoomed into JUST the bloom; Parts of a Plant shows the entire plant from root to flower.",
      "NOT Parts of a Seed: Parts of a Flower diagrams petals/stamen/pistil; Parts of a Seed diagrams the internal structure of a seed (seed coat, embryo, cotyledon)."
    ]
  },
  {
    work_key: "cu_parts_leaf",
    work_name: "Parts of a Leaf",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a single leaf shape zoomed in — blade, midrib, veins, petiole, margin — with small printed label tabs matched to pointer lines on the diagram, arranged as control card, picture card, and word cards on a mat. Sometimes paired with real pressed leaves or a leaf-shape cabinet showing different leaf outlines (oval, lobed, serrated). The defining picture is one isolated leaf outline with its internal vein/edge structures labelled — no flower, no root, no whole plant shown.",
    key_materials: [
      "Three-part nomenclature cards focused on a single leaf",
      "Labels for blade, veins, midrib, petiole, margin",
      "Sometimes paired with real or laminated leaf specimens",
      "No whole-plant, flower, or root imagery"
    ],
    negative_descriptions: [
      "NOT Parts of a Plant: Parts of a Leaf is zoomed into ONE leaf's structure; Parts of a Plant shows the whole plant from root to flower.",
      "NOT Parts of a Flower: Parts of a Leaf labels blade/veins/petiole; Parts of a Flower labels petal/stamen/pistil on the bloom."
    ]
  },
  {
    work_key: "cu_parts_root",
    work_name: "Parts of a Root",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing the underground root system zoomed in — taproot, root hairs, lateral roots — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. Often contrasts a taproot type against a fibrous root type in the same set. The defining picture is a below-ground root structure diagram only, with no stem, leaves, or flower shown above the soil line.",
    key_materials: [
      "Three-part nomenclature cards focused on root structures",
      "Labels for taproot, root hairs, lateral roots",
      "May contrast taproot vs fibrous root types",
      "No above-ground plant parts shown"
    ],
    negative_descriptions: [
      "NOT Parts of a Plant: Parts of a Root is zoomed into the underground root system only; Parts of a Plant shows the entire plant including stem, leaves, and flower.",
      "NOT Parts of a Seed: Parts of a Root diagrams root hairs and taproot/lateral roots; Parts of a Seed diagrams the internal layers of a seed."
    ]
  },
  {
    work_key: "cu_parts_seed",
    work_name: "Parts of a Seed",
    area: "cultural",
    visual_description: "A labelled nomenclature card set (often paired with a real cross-sectioned bean or seed model) showing the internal structure of a single seed — seed coat, cotyledon, embryo/radicle — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The defining picture is one small seed cross-section diagram, distinctly different in scale and subject from whole-plant or root diagrams — sometimes accompanied by real soaked beans split open to show the layers.",
    key_materials: [
      "Three-part nomenclature cards focused on internal seed anatomy",
      "Labels for seed coat, cotyledon, embryo/radicle",
      "Sometimes paired with real soaked/split bean specimens",
      "Small single-seed scale, not whole-plant"
    ],
    negative_descriptions: [
      "NOT Parts of a Plant: Parts of a Seed diagrams the internal cross-section of one seed; Parts of a Plant shows the whole external plant.",
      "NOT Plant Life Cycle: Parts of a Seed is a static anatomy diagram of one seed; Plant Life Cycle is a sequence of stage cards from seed through germination to mature plant and back to seed."
    ]
  },
  {
    work_key: "cu_plant_life_cycle",
    work_name: "Plant Life Cycle",
    area: "cultural",
    visual_description: "A sequence of stage cards or a circular chart laid out on a mat showing a plant's development over time — seed, germination/sprout, seedling, mature plant with flower, fruit, and back to seed — arranged in a loop or line for the child to sequence in order. Sometimes accompanied by a real potted example (a bean germinating in a clear jar, or a growing seedling tray) for direct observation alongside the sequence cards. The defining picture is MULTIPLE stage images/cards in a chronological or circular sequence, unlike a single-structure anatomy diagram.",
    key_materials: [
      "Sequence of stage cards (seed, sprout, seedling, flower, fruit, seed)",
      "Arranged in a line or circular loop for sequencing",
      "Sometimes paired with a real germinating specimen",
      "Multiple time-stage images, not one static diagram"
    ],
    negative_descriptions: [
      "NOT Parts of a Seed: Plant Life Cycle sequences MULTIPLE growth stages over time; Parts of a Seed is a single static cross-section diagram of one seed's anatomy.",
      "NOT Animal Life Cycles: Plant Life Cycle sequences a plant's growth stages; Animal Life Cycles sequences an animal's stages (egg, larva, adult, etc.)."
    ]
  },
  {
    work_key: "cu_botany_experiments",
    work_name: "Botany Experiments",
    area: "cultural",
    visual_description: "A hands-on scientific demonstration setup involving live plant material — for example celery stalks or white carnations standing in cups of coloured water to show water transport, or two plants side by side (one in light, one in dark) to show the effect of sunlight, or seeds germinating in a clear jar against wet paper towel. Materials include real plants/produce, clear glass jars or cups, coloured food dye, and often an observation journal or recording sheet nearby. The defining picture is a live, in-progress botanical experiment with real plant matter and liquid/soil, not a set of printed nomenclature cards.",
    key_materials: [
      "Live plant material (celery, carnations, seeds, seedlings)",
      "Clear jars or cups, sometimes with coloured water",
      "An observation/recording journal or chart nearby",
      "In-progress, changing-over-days experimental setup"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_vertebrate_invertebrate",
    work_name: "Vertebrate vs Invertebrate",
    area: "cultural",
    visual_description: "A sorting activity with two labelled category cards or mats ('Vertebrate' and 'Invertebrate') and a pile of small animal picture cards or miniature figures (including insects, worms, jellyfish, spiders alongside fish, birds, mammals) that the child sorts by presence or absence of a backbone. Unlike Living vs Non-Living or Plant vs Animal, every item here is specifically an ANIMAL — no plants, no man-made objects. The defining picture is a two-pile animal-only sort distinguishing backboned creatures from boneless/invertebrate creatures.",
    key_materials: [
      "Two category cards or mats labelled 'Vertebrate' and 'Invertebrate'",
      "Small animal picture cards or figures only (no plants or objects)",
      "Includes insects, worms, jellyfish alongside fish, birds, mammals",
      "Binary sort based on presence of a backbone"
    ],
    negative_descriptions: [
      "NOT Plant vs Animal: Vertebrate vs Invertebrate sorts ONLY animals by backbone; Plant vs Animal sorts all living things by kingdom (plant or animal).",
      "NOT Five Classes of Vertebrates: Vertebrate vs Invertebrate is a two-way sort (backbone or not); Five Classes of Vertebrates further subdivides vertebrates alone into five specific classes."
    ]
  },
  {
    work_key: "cu_five_classes",
    work_name: "Five Classes of Vertebrates",
    area: "cultural",
    visual_description: "A sorting or matching activity with FIVE labelled category cards or mats — fish, amphibian, reptile, bird, mammal — and a pile of small animal picture cards or figures the child sorts into the correct class, often with a small defining-feature label under each category header (e.g. scales/gills, moist skin, dry scales, feathers, fur/hair). All items pictured are vertebrates only; there is no invertebrate or plant content. The defining picture is FIVE distinct category groupings (not two), each populated with matching animal images.",
    key_materials: [
      "Five labelled category cards or mats: fish, amphibian, reptile, bird, mammal",
      "Small animal picture cards or figures, vertebrates only",
      "Often includes a defining-feature label per class",
      "Five-way sort, distinctly more categories than a binary sort"
    ],
    negative_descriptions: [
      "NOT Vertebrate vs Invertebrate: Five Classes of Vertebrates has FIVE category groups within vertebrates only; Vertebrate vs Invertebrate is a simple two-way sort (backbone or no backbone)."
    ]
  },
  {
    work_key: "cu_parts_fish",
    work_name: "Parts of a Fish",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a fish diagram — fins (dorsal, pectoral, pelvic, anal, caudal), gills, scales, lateral line — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The whole animal's silhouette is a streamlined fish body with visible fin shapes, unmistakably aquatic and distinct from any other 'parts of' animal card by its fin arrangement and scaled body outline.",
    key_materials: [
      "Three-part nomenclature cards diagramming a fish",
      "Labels for fins, gills, scales, lateral line",
      "Streamlined fish body silhouette with distinct fin shapes",
      "Control card, picture card, and separate word labels"
    ],
    negative_descriptions: [
      "NOT Parts of a Frog: Parts of a Fish shows fins/gills/scales on a streamlined fish body; Parts of a Frog shows legs/webbed feet/eyes on a squat frog body.",
      "NOT Parts of a Turtle: Parts of a Fish has a finned aquatic body; Parts of a Turtle shows a shelled body with a distinct carapace/plastron.",
      "NOT Parts of a Bird: Parts of a Fish shows fins and scales; Parts of a Bird shows feathers, beak, and wings.",
      "NOT Parts of a Horse: Parts of a Fish is a small aquatic body diagram; Parts of a Horse is a large four-legged mammal diagram with mane, hooves, and tail."
    ]
  },
  {
    work_key: "cu_parts_frog",
    work_name: "Parts of a Frog",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a frog diagram — eyes, nostrils, webbed hind feet, forelegs, tympanum (eardrum) — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The silhouette is a squat amphibian body with bulging eyes and long hind legs, unmistakably a frog and distinct from fish (no fins), turtle (no shell), or bird (no feathers/beak).",
    key_materials: [
      "Three-part nomenclature cards diagramming a frog",
      "Labels for eyes, webbed feet, forelegs, tympanum",
      "Squat amphibian silhouette with prominent hind legs",
      "Control card, picture card, and separate word labels"
    ],
    negative_descriptions: [
      "NOT Parts of a Fish: Parts of a Frog shows webbed legs and bulging eyes on a squat body; Parts of a Fish shows fins and scales on a streamlined body.",
      "NOT Parts of a Turtle: Parts of a Frog has no shell; Parts of a Turtle's diagram is dominated by a hard shell (carapace and plastron)."
    ]
  },
  {
    work_key: "cu_parts_turtle",
    work_name: "Parts of a Turtle",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a turtle diagram — carapace (upper shell), plastron (lower shell), head, legs, tail — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The unmistakable defining feature is the large domed/patterned SHELL covering most of the body, distinguishing it instantly from any other 'parts of' animal card (fish, frog, bird, horse) which have no shell.",
    key_materials: [
      "Three-part nomenclature cards diagramming a turtle",
      "Labels for carapace, plastron, head, legs, tail",
      "Large domed or patterned shell dominating the silhouette",
      "Control card, picture card, and separate word labels"
    ],
    negative_descriptions: [
      "NOT Parts of a Frog: Parts of a Turtle's diagram is dominated by a hard shell; Parts of a Frog has no shell at all, just bare skin and long hind legs.",
      "NOT Parts of a Fish: Parts of a Turtle shows a shelled body; Parts of a Fish shows a finned, scaled streamlined body with no shell."
    ]
  },
  {
    work_key: "cu_parts_bird",
    work_name: "Parts of a Bird",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a bird diagram — beak, feathers, wings, tail feathers, talons/feet — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The unmistakable defining features are feathered wings and a beak, clearly distinguishing it from fish (fins, scales), frog (bare skin, webbed feet), turtle (shell), and horse (mane, hooves, four legs).",
    key_materials: [
      "Three-part nomenclature cards diagramming a bird",
      "Labels for beak, feathers, wings, talons",
      "Feathered body silhouette with wings and beak",
      "Control card, picture card, and separate word labels"
    ],
    negative_descriptions: [
      "NOT Parts of a Fish: Parts of a Bird shows feathers/wings/beak; Parts of a Fish shows fins/scales/gills on a streamlined aquatic body.",
      "NOT Parts of a Horse: Parts of a Bird is a small feathered flying-animal diagram; Parts of a Horse is a large four-legged mammal diagram with mane and hooves."
    ]
  },
  {
    work_key: "cu_parts_horse",
    work_name: "Parts of a Horse",
    area: "cultural",
    visual_description: "A labelled nomenclature card set showing a horse diagram — mane, tail, hooves, muzzle, legs, back — with small printed label tabs matched to pointer lines, laid out as control card, picture card, and word cards on a mat. The unmistakable defining feature is a large four-legged mammal body with a flowing mane along the neck and hard hooves at the end of each leg, clearly distinguishing it from fish, frog, turtle, or bird 'parts of' cards.",
    key_materials: [
      "Three-part nomenclature cards diagramming a horse",
      "Labels for mane, tail, hooves, muzzle, legs",
      "Large four-legged mammal silhouette with mane and hooves",
      "Control card, picture card, and separate word labels"
    ],
    negative_descriptions: [
      "NOT Parts of a Bird: Parts of a Horse shows a four-legged mammal with mane and hooves; Parts of a Bird shows a small feathered flying animal with wings and a beak.",
      "NOT Parts of a Fish: Parts of a Horse is a large land mammal diagram; Parts of a Fish is a small aquatic finned-body diagram."
    ]
  },
  {
    work_key: "cu_animal_habitats",
    work_name: "Animal Habitats",
    area: "cultural",
    visual_description: "A matching or sorting activity with habitat picture cards or scene mats (forest, ocean, desert, arctic, savanna, rainforest) and a set of small animal figures or picture cards the child places onto or matches to the correct habitat scene. Sometimes presented as a large floor mat printed with a habitat background and small toy animal figures placed directly onto it, sometimes as paired cards (animal card matched to habitat card). The defining picture is animals grouped with or overlaid onto distinct environment/landscape scenes, not a plain classification chart.",
    key_materials: [
      "Habitat scene cards or floor mats (forest, ocean, desert, arctic, etc.)",
      "Small animal figures or picture cards to place or match",
      "Environment/landscape backgrounds visible in the material",
      "Matching or placement activity, animal to correct environment"
    ],
    negative_descriptions: [
      "NOT Animals of the Continents: Animal Habitats sorts by ENVIRONMENT TYPE (forest, ocean, desert); Animals of the Continents sorts by geographic CONTINENT on a world or continent map."
    ]
  },
  {
    work_key: "cu_animals_continents",
    work_name: "Animals of the Continents",
    area: "cultural",
    visual_description: "A matching activity using a continent or world map (often the same map used for the puzzle map or a simplified printed version) with small animal figures or picture cards the child places onto the correct continent — e.g. lions and elephants on Africa, kangaroos on Australia, pandas on Asia. The defining picture is a MAP with animal images or figures placed at specific geographic locations, distinguishing it from habitat-scene cards which show generic environment types rather than named continents/countries.",
    key_materials: [
      "A continent or world map as the base",
      "Small animal figures or picture cards placed on specific continents",
      "Geographic placement tied to named continents, not generic habitats",
      "Often paired with the continent puzzle map colours"
    ],
    negative_descriptions: [
      "NOT Animal Habitats: Animals of the Continents places animals onto a geographic MAP by continent; Animal Habitats places animals into environment TYPE scenes (forest, desert, ocean) with no map."
    ]
  },
  {
    work_key: "cu_life_cycles",
    work_name: "Animal Life Cycles",
    area: "cultural",
    visual_description: "A sequence of stage cards or a circular chart laid out on a mat showing an animal's development over time — for example egg, caterpillar, chrysalis, butterfly; or egg, tadpole, froglet, frog; or infant, juvenile, adult — arranged in a loop or line for the child to sequence in order. Sometimes accompanied by real specimens (a butterfly-raising kit, live tadpoles in a tank) for direct observation. The defining picture is MULTIPLE animal growth-stage images/cards in chronological or circular sequence, distinct from a static single-structure anatomy diagram.",
    key_materials: [
      "Sequence of animal stage cards (e.g. egg, larva, pupa, adult)",
      "Arranged in a line or circular loop for sequencing",
      "Sometimes paired with real live specimens (tadpoles, caterpillars)",
      "Multiple time-stage images of one species"
    ],
    negative_descriptions: [
      "NOT Plant Life Cycle: Animal Life Cycles sequences an animal's growth stages (egg to adult); Plant Life Cycle sequences a plant's stages (seed to flower to seed).",
      "NOT Parts of a Frog: Animal Life Cycles shows MULTIPLE stage images of one animal over time; Parts of a Frog is a single static anatomy diagram of one adult frog."
    ]
  },
  {
    work_key: "cu_sink_float",
    work_name: "Sink and Float",
    area: "cultural",
    visual_description: "A hands-on experiment setup with a clear tub or basin of water and a small tray of varied objects (cork, stone, coin, plastic toy, wood block, metal spoon) the child drops in one at a time to observe whether it sinks or floats, often sorting the tested objects afterward into two labelled trays or a recording sheet. The defining picture is a water basin/tub with an assortment of everyday objects being tested, and a visible wet/dry sorting result, distinct from any card-based classification activity.",
    key_materials: [
      "Clear tub or basin filled with water",
      "Small tray of varied testable objects (cork, stone, coin, toy)",
      "Sorting trays or recording sheet for sink/float results",
      "Hands-on, water-based experimental activity"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_magnetic",
    work_name: "Magnetic/Non-Magnetic",
    area: "cultural",
    visual_description: "A hands-on sorting experiment with a hand-held magnet or magnetic wand and a tray of small mixed objects (paperclip, coin, plastic button, wooden bead, metal nail, eraser) the child tests one at a time by touching the magnet to each object, sorting them into two labelled trays or cards ('Magnetic' and 'Non-Magnetic') based on whether they are attracted. The defining picture is a visible magnet being used to test small objects, with two resulting sorted piles — distinct from Sink and Float, which uses water rather than a magnet.",
    key_materials: [
      "A hand-held magnet or magnetic wand",
      "Tray of small mixed objects (metal and non-metal)",
      "Two sorting trays or labelled cards for results",
      "Testing activity using the magnet directly on each object"
    ],
    negative_descriptions: [
      "NOT Sink and Float: Magnetic/Non-Magnetic tests objects with a MAGNET; Sink and Float tests objects by dropping them in WATER."
    ]
  },
  {
    work_key: "cu_states_matter",
    work_name: "States of Matter",
    area: "cultural",
    visual_description: "A demonstration or card-matching activity illustrating solid, liquid, and gas — often using ice cubes, a cup of water, and steam from a kettle as a live demonstration set, or three labelled picture cards showing molecules in each state, sometimes with small containers holding an actual solid, liquid, and simulated gas (e.g. a balloon). The defining picture is THREE distinct states represented together (solid/liquid/gas), either as real changing-matter demonstration or as three-way sorted diagram cards, clearly different from a binary sort like sink/float or magnetic/non-magnetic.",
    key_materials: [
      "Representations of solid, liquid, and gas (ice, water, steam or diagrams)",
      "Sometimes live changing-state demonstration (ice melting, water boiling)",
      "Three-way category cards or containers",
      "May include molecule-arrangement diagrams for each state"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_color_mixing",
    work_name: "Color Mixing",
    area: "cultural",
    visual_description: "A hands-on activity using small cups, droppers, or paint palettes with the three primary colours (red, yellow, blue) that the child mixes together to create secondary colours, often with a recording sheet or colour wheel to note results, or clear pipettes dripping coloured water into empty cups to watch colours blend in real time. The defining picture is visibly mixing/blended paint or coloured liquid in small containers, with primary-colour source containers nearby — a wet, hands-on colour activity distinct from any dry card-sorting material.",
    key_materials: [
      "Small cups, droppers, or palette with primary colours (red, yellow, blue)",
      "Mixing in progress, producing secondary colours",
      "Sometimes a colour wheel or recording sheet",
      "Wet, hands-on paint or coloured-liquid activity"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_simple_machines",
    work_name: "Simple Machines",
    area: "cultural",
    visual_description: "A set of small working models or demonstration pieces illustrating basic mechanisms — a lever/see-saw, a pulley with string and a small weight, an inclined plane/ramp with a toy car or ball, a simple wheel-and-axle, a screw, or a wedge — laid out on a table or tray for hands-on manipulation, sometimes paired with labelled diagram cards. The defining picture is a functional small mechanical apparatus (moving parts, ramps, pulleys, levers) rather than flat picture cards, and is unmistakably mechanical/physical rather than biological.",
    key_materials: [
      "Small working mechanical models (lever, pulley, ramp, wheel-and-axle, screw, wedge)",
      "Movable/functional parts for hands-on testing",
      "Sometimes paired with labelled diagram cards",
      "Physical, mechanical apparatus rather than flat sorting cards"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_nature_study",
    work_name: "Nature Study",
    area: "cultural",
    visual_description: "An outdoor or indoor observation activity: a child examining real natural specimens — leaves, rocks, shells, bark, flowers, insects in a bug viewer — often with a magnifying glass, a nature journal for sketching/recording observations, or a collecting tray/basket of found items brought in from outside. The defining picture is a child closely observing or handling REAL natural specimens (not printed cards or diagrams), often with a magnifier or sketching in a journal, capturing an open-ended exploratory moment rather than a fixed classification set.",
    key_materials: [
      "Real natural specimens (leaves, rocks, shells, insects, bark)",
      "Magnifying glass for close observation",
      "Nature journal for sketching or recording findings",
      "Collecting tray or basket of found outdoor items"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_weather",
    work_name: "Weather Study",
    area: "cultural",
    visual_description: "A daily weather-tracking activity: a chart or wheel showing weather symbols (sun, cloud, rain, snow, wind) with a movable pointer or clip the child sets to match today's actual weather, sometimes paired with a simple outdoor thermometer, a wind sock, or a rain gauge for direct observation, and often a weather journal or graph tracking the week's or month's weather. The defining picture is a weather symbol chart/wheel with a marker set to today's condition, or hands-on weather instruments, distinct from the day/month calendar grid.",
    key_materials: [
      "Weather chart or wheel with symbols (sun, cloud, rain, snow, wind)",
      "Movable pointer or clip set to today's weather",
      "Sometimes a thermometer, wind sock, or rain gauge",
      "Weather journal or tracking graph"
    ],
    negative_descriptions: [
      "NOT Calendar Work: Weather Study tracks daily WEATHER CONDITIONS on a symbol chart or wheel; Calendar Work tracks the DATE (day/month/year) on a grid, with no weather symbols."
    ]
  },
  {
    work_key: "cu_drawing",
    work_name: "Drawing",
    area: "cultural",
    visual_description: "A child seated at a table or on the floor with paper and drawing tools — pencils, coloured pencils, crayons, or markers — actively producing a line drawing or sketch, sometimes copying from a nature specimen, a picture card, or drawing freely from imagination. The defining picture is dry drawing media (pencil/crayon marks on paper), a work-in-progress sketch, and no wet paint, clay, or cut paper visible.",
    key_materials: [
      "Paper and dry drawing tools (pencils, coloured pencils, crayons, markers)",
      "A line drawing or sketch in progress",
      "Child working at a table or floor mat",
      "No wet paint or three-dimensional media present"
    ],
    negative_descriptions: [
      "NOT Painting: Drawing uses DRY media (pencils, crayons) on paper; Painting uses WET paint, brushes, and often a palette or water cup.",
      "NOT Collage: Drawing produces a line sketch directly on paper; Collage involves cutting/gluing separate paper or material pieces onto a base."
    ]
  },
  {
    work_key: "cu_painting",
    work_name: "Painting",
    area: "cultural",
    visual_description: "A child at an easel or table with paint (watercolour, tempera, or finger paint), a brush or fingers, a palette or small paint pots, a water cup for rinsing, and paper or canvas showing wet colour strokes or a finished painted picture. Often protected by a smock and a covered table surface. The defining picture is visibly WET, coloured paint applied with a brush or fingers, distinctly different from dry pencil/crayon drawing or dry cut-paper collage.",
    key_materials: [
      "Paint (watercolour, tempera, or finger paint) in pots or a palette",
      "Paintbrush or bare fingers, water cup for rinsing",
      "Paper or canvas with wet colour strokes",
      "Often a smock and covered table surface"
    ],
    negative_descriptions: [
      "NOT Drawing: Painting uses WET paint and brushes; Drawing uses DRY pencils, crayons, or markers.",
      "NOT Color Mixing: Painting produces a picture on paper/canvas with paint; Color Mixing is specifically about blending primary colours in small cups/droppers to observe the resulting colour, not producing a finished artwork."
    ]
  },
  {
    work_key: "cu_collage",
    work_name: "Collage",
    area: "cultural",
    visual_description: "A child working with scissors, glue, and an assortment of paper scraps, fabric pieces, buttons, or natural materials (leaves, seeds) arranged and glued onto a base sheet of paper or card to build a layered picture. The defining picture is multiple cut or torn pieces of varied material GLUED onto a flat base, producing a textured, layered composition — distinct from a single continuous drawn or painted image.",
    key_materials: [
      "Scissors, glue, and a base sheet of paper or card",
      "Assorted paper scraps, fabric, buttons, or natural materials",
      "Pieces cut, torn, and glued onto the base",
      "A layered, textured composition rather than a single drawn/painted image"
    ],
    negative_descriptions: [
      "NOT Drawing: Collage assembles CUT/GLUED pieces onto a base; Drawing is a single continuous pencil or crayon sketch.",
      "NOT Painting: Collage is dry material glued together; Painting is wet paint applied with a brush."
    ]
  },
  {
    work_key: "cu_clay",
    work_name: "Clay and Playdough",
    area: "cultural",
    visual_description: "A child working at a table with a soft, mouldable material (clay, playdough, or plasticine) in hand, pressing, rolling, or shaping it into a three-dimensional form, often with simple tools nearby (rolling pin, cutters, a small mat to protect the table). The defining picture is a three-dimensional, hand-shaped mound or figure made of soft mouldable material, clearly different from flat paper-based drawing, painting, or collage work.",
    key_materials: [
      "Soft mouldable material: clay, playdough, or plasticine",
      "Hands actively pressing, rolling, or shaping the material",
      "Optional tools: rolling pin, cutters, shaping mat",
      "A three-dimensional form rather than a flat paper artwork"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_printmaking",
    work_name: "Printmaking",
    area: "cultural",
    visual_description: "A child pressing an inked or paint-coated stamp, sponge, vegetable half, or carved block onto paper to leave a repeated impression, with a stamp pad, small paint tray, or dish of paint visible alongside the paper showing multiple repeated shapes or patterns. The defining picture is a REPEATED stamped or pressed pattern on paper (the same shape appearing multiple times), distinct from a single freehand drawing, a single painted picture, or a glued collage.",
    key_materials: [
      "Stamps, sponges, vegetable halves, or carved printing blocks",
      "Ink pad or shallow paint tray",
      "Paper showing repeated pressed/stamped impressions",
      "Multiple identical or similar shapes appearing across the page"
    ],
    negative_descriptions: [
      "NOT Painting: Printmaking produces REPEATED stamped shapes using a pressed tool; Painting is freehand brushwork producing a unique continuous image.",
      "NOT Collage: Printmaking presses ink/paint onto paper directly; Collage glues separate cut material pieces onto a base with no ink transfer."
    ]
  },
  {
    work_key: "cu_art_appreciation",
    work_name: "Art Appreciation",
    area: "cultural",
    visual_description: "Children gathered around or seated facing a reproduction of a famous painting or artwork (a printed art card, poster, or book), often with the teacher discussing the artist, style, or subject, sometimes followed by children attempting their own interpretation inspired by the artwork. The defining picture is a REPRODUCTION of existing famous art being viewed/discussed as a group, not a child's own in-progress artwork — this is an observational/discussion activity, not a hands-on production activity.",
    key_materials: [
      "Reproduction of a famous painting or artwork (card, poster, book)",
      "Group viewing or discussion setting",
      "Teacher-led conversation about artist/style/subject",
      "Observational, not a hands-on art-making activity"
    ],
    negative_descriptions: []
  },
  {
    work_key: "cu_singing",
    work_name: "Singing",
    area: "cultural",
    visual_description: "Children gathered in a circle or group, mouths open, engaged in singing together, often led by a teacher with a songbook, lyric cards, or simple hand gestures/actions accompanying the song, with no instruments necessarily present. The defining picture is a group vocal activity — visible open mouths, circle formation, sometimes lyric sheets — distinct from instrumental play (Rhythm Instruments) or physical movement (Movement to Music).",
    key_materials: [
      "Group of children in a circle or gathered formation",
      "Teacher leading, sometimes with a songbook or lyric cards",
      "Vocal/singing activity, mouths open",
      "No instruments required"
    ],
    negative_descriptions: [
      "NOT Rhythm Instruments: Singing is a vocal group activity with no instruments needed; Rhythm Instruments involves children holding and playing physical instruments (bells, drums, shakers).",
      "NOT Movement to Music: Singing is a seated or standing vocal activity; Movement to Music involves children physically moving/dancing their whole bodies."
    ]
  },
  {
    work_key: "cu_rhythm",
    work_name: "Rhythm Instruments",
    area: "cultural",
    visual_description: "Children each holding a small percussion instrument — bells, tambourines, maracas/shakers, rhythm sticks, small drums — actively playing them in a group setting, often following a beat pattern led by the teacher or matched to a recorded song. The defining picture is small hand-held percussion instruments physically being held and played by children, distinct from vocal-only singing or bodily movement without instruments.",
    key_materials: [
      "Small hand-held percussion instruments (bells, maracas, tambourines, sticks)",
      "Children actively holding and playing the instruments",
      "Group setting, often following a rhythmic beat",
      "Sound-producing objects clearly visible in children's hands"
    ],
    negative_descriptions: [
      "NOT Singing: Rhythm Instruments involves children playing PHYSICAL instruments; Singing is purely vocal with no instruments held.",
      "NOT Montessori Bells: Rhythm Instruments are simple hand percussion (shakers, tambourines) played rhythmically in a group; the Montessori Bells are a graded set of tonal metal bells worked individually for pitch-matching, not group rhythm play."
    ]
  },
  {
    work_key: "cu_movement",
    work_name: "Movement to Music",
    area: "cultural",
    visual_description: "Children physically moving their whole bodies — dancing, swaying, marching, or performing simple choreographed motions — in an open floor space, often in response to recorded or live music, sometimes with scarves, ribbons, or simple props to wave. The defining picture is whole-body movement/dance in an open space, not seated singing or hand-held instrument play.",
    key_materials: [
      "Open floor space for whole-body movement",
      "Children dancing, swaying, or marching to music",
      "Sometimes scarves or ribbons as movement props",
      "Whole-body physical activity, not vocal or instrument-focused"
    ],
    negative_descriptions: [
      "NOT Singing: Movement to Music is whole-body physical dance/movement; Singing is a seated or standing vocal activity with no dancing.",
      "NOT Rhythm Instruments: Movement to Music is whole-body dance, sometimes with light props like scarves; Rhythm Instruments involves children holding and playing percussion instruments while typically staying in place."
    ]
  },
  {
    work_key: "cu_bells",
    work_name: "Montessori Bells",
    area: "cultural",
    visual_description: "A set of small identical-looking metal bells mounted on wooden bases in two rows (often white bases for the diatonic scale and brown/black bases for sharps/flats, resembling a piano keyboard layout), each bell striking a distinct musical pitch when tapped with a small wooden mallet. The child works individually, striking one bell then searching among a matching duplicate set to find its pitch pair, or arranging bells in scale order. The defining picture is a graded row of visually near-identical metal bells on wooden stands with a small mallet, worked for PITCH matching, distinct from group rhythm percussion instruments.",
    key_materials: [
      "Set of small metal bells on wooden bases, arranged like a keyboard",
      "White bases for the diatonic scale, black/brown for sharps and flats",
      "A small wooden mallet for striking",
      "Worked individually for pitch matching or scale sequencing"
    ],
    negative_descriptions: [
      "NOT Rhythm Instruments: Montessori Bells are a graded set of TONAL bells worked individually to match PITCH; Rhythm Instruments are varied simple percussion (tambourines, shakers, sticks) played together as a group for rhythm/beat, not pitch matching."
    ]
  },
  {
    work_key: "cu_music_appreciation",
    work_name: "Music Appreciation",
    area: "cultural",
    visual_description: "Children seated and listening attentively to recorded or live music (classical, world music, or instrumental pieces played from a device or by a visiting musician), often with a picture card of the composer or instrument being discussed, or a chart showing an orchestra/instrument family. The defining picture is a quiet LISTENING activity — children seated, focused, sometimes with eyes closed or following along on a composer/instrument card — distinct from active singing, instrument playing, or dancing.",
    key_materials: [
      "Recorded or live music being played for listening",
      "Children seated attentively, often quiet or eyes closed",
      "Sometimes a composer portrait or instrument family chart",
      "A listening/observational activity, not active performance"
    ],
    negative_descriptions: []
  }
];

const keys = new Set(j.entries.map(e => e.work_key));
let a = 0;
for (const e of NEW) {
  if (!keys.has(e.work_key)) {
    j.entries.push(e);
    keys.add(e.work_key);
    a++;
  }
}

fs.writeFileSync(P, JSON.stringify(j, null, 2) + '\n');
console.log('cultural +' + a + ' -> ' + j.entries.length);
