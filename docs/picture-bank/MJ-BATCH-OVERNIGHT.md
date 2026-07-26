# Midjourney batch — Montessori Picture Bank

127 prompts. 19 replace a bad existing photo, 108 fill a gap.

## House rules baked into every prompt below

Real photographed object. One object. Plain pure white background. No text, no people, no props.
Anti-render negatives added so nothing comes back as CGI, clay or glossy plastic.

## Saving — the naming is not optional

Save each image as the EXACT word shown, lower case, nothing else:

    <word>.png     e.g.  snake.png   ink-bottle -> inkbottle.png

Drop them all in one folder, then file them with:

    node scripts/curriculum/picture-bank-add.mjs --sweep <that folder> --force

That converts to JPEG, files each to docs/picture-bank/photos/<word>/<word>.jpg,
and REFUSES any that are not white-background, not visible against white, or too
small to print. Then:

    node --env-file=.env.local scripts/curriculum/picture-bank-add.mjs --publish

---

## 1. astronaut   (REPLACE existing)

save as: **astronaut.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real astronaut figurine in a white spacesuit with a gold visor helmet, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no abstract metallic blob silver melted illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 2. comb   (REPLACE existing)

save as: **comb.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real black plastic hair comb with fine teeth, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no transparent clear white illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 3. door   (REPLACE existing)

save as: **door.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real white panelled wooden door standing upright, isolated, no wall, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wall floor room frame hallway illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 4. eel   (REPLACE existing)

save as: **eel.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real dark green moray eel, one single eel, elongated body, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no two eels multiple pair illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 5. fin   (REPLACE existing)

save as: **fin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real grey shark dorsal fin, curved triangular shape, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no abstract black sculpture flipper illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 6. gate   (REPLACE existing)

save as: **gate.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real dark wrought-iron garden gate standing isolated, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white baby safety gate wall fence illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 7. house   (REPLACE existing)

save as: **house.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small model house with a red roof and white walls, isolated, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no lawn garden grass landscaping trees street illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 8. jewel   (REPLACE existing)

save as: **jewel.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real faceted deep blue sapphire gemstone, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no crumpled foil silver ball illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 9. moon   (REPLACE existing)

save as: **moon.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real grey cratered moon globe model, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no black background night sky space dark illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 10. napkin   (REPLACE existing)

save as: **napkin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real folded deep red cloth napkin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white cream pale paper illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 11. needle   (REPLACE existing)

save as: **needle.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real steel sewing needle threaded with bright red thread, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bare needle syringe knitting illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 12. pin   (REPLACE existing)

save as: **pin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real silver metal safety pin, closed, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bowling pin rolling pin pushpin illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 13. quilt   (REPLACE existing)

save as: **quilt.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real folded patchwork quilt with colorful red blue and yellow squares, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white cream plain illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 14. satin   (REPLACE existing)

save as: **satin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real deep red satin ribbon coiled, glossy sheen, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white cream pale fabric illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 15. snake   (REPLACE existing)

save as: **snake.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real green garden snake with natural brown and green scale markings, coiled, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no albino white silver metallic toy plastic illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 16. star   (REPLACE existing)

save as: **star.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real bright golden-yellow five-pointed star ornament with a matte painted surface, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no silver metallic chrome celestial night sky illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 17. sun   (REPLACE existing)

save as: **sun.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real bright orange-yellow sun sculpture with radiating rays, matte painted surface, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no blue sky background photograph of the real sun lens flare illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 18. towel   (REPLACE existing)

save as: **towel.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real folded turquoise blue bath towel, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white cream pale illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 19. yoyo   (REPLACE existing)

save as: **yoyo.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red wooden yoyo with a white string wound around its axle, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no abstract green blob illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 20. bat   (new)

save as: **bat.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small brown bat with folded leathery wings and large ears, perched, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no baseball bat cricket bat sports equipment illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 21. bee   (new)

save as: **bee.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real honey bee with black and yellow striped body and transparent wings, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wasp hornet illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 22. belt   (new)

save as: **belt.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown leather belt coiled with a silver buckle, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 23. bike   (new)

save as: **bike.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small red children's bicycle with two wheels, handlebars and a bell, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no motorcycle tricycle illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 24. bone   (new)

save as: **bone.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real off-white dog bone chew treat, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no skeleton human bone illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 25. book   (new)

save as: **book.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real closed hardcover book with a blue cover and no visible text, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no open pages visible text illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 26. boot   (new)

save as: **boot.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real yellow rubber rain boot, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no cowboy boot high heel illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 27. brick   (new)

save as: **brick.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red clay brick, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no gray concrete block lego illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 28. broom   (new)

save as: **broom.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real broom with a long wooden handle and straw bristles, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no witch broomstick illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 29. cage   (new)

save as: **cage.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small golden metal birdcage with a domed top, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bird inside prison cell illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 30. candle   (new)

save as: **candle.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red cylindrical wax candle with a dark unlit wick, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white candle flame lit illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 31. candy   (new)

save as: **candy.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red and white wrapped peppermint hard candy with twisted ends, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no candy pile multiple pieces illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 32. cap   (new)

save as: **cap.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red baseball cap with a curved brim, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bottle cap winter hat illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 33. cape   (new)

save as: **cape.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red fabric superhero cape with a gold clasp, laid flat, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no worn on person geographic headland illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 34. cart   (new)

save as: **cart.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small metal shopping cart with four wheels and a handle, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wagon golf cart horse cart illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 35. chair   (new)

save as: **chair.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small wooden chair with four legs and a backrest, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no armchair sofa illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 36. cheese   (new)

save as: **cheese.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real wedge of yellow Swiss cheese with visible holes, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white cheese round wheel illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 37. cherry   (new)

save as: **cherry.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red cherry with a green stem, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no cherry pair pit illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 38. chick   (new)

save as: **chick.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real fluffy yellow baby chick, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no adult hen rooster egg illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 39. chip   (new)

save as: **chip.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real golden-brown crinkle-cut potato chip, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no computer chip poker chip wood chip circuit board illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 40. clock   (new)

save as: **clock.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real round analog alarm clock with two bells on top and metal hands, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no digital clock wristwatch illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 41. coat   (new)

save as: **coat.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real navy blue winter coat with buttons, laid flat, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no jacket vest worn on person illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 42. coil   (new)

save as: **coil.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real coiled metal spring, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no snake rope illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 43. coin   (new)

save as: **coin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real round gold coin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no pile of coins paper bill illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 44. cone   (new)

save as: **cone.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real orange plastic traffic cone with a white reflective stripe, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no ice cream waffle cone pine cone illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 45. corn   (new)

save as: **corn.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real yellow corn cob with husk peeled back, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no popcorn illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 46. crab   (new)

save as: **crab.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red crab with two large claws and eight legs, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no lobster cooked plate illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 47. crow   (new)

save as: **crow.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real black crow with glossy black feathers, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no raven eagle illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 48. crown   (new)

save as: **crown.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real gold crown with colored jewels, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no worn on head tiara illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 49. cube   (new)

save as: **cube.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real natural wood cube building block, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no dice with pips ice cube illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 50. deer   (new)

save as: **deer.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown deer with antlers, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no reindeer sleigh moose illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 51. desk   (new)

save as: **desk.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small wooden school desk with a drawer and slanted top, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no dining table office desk illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 52. dish   (new)

save as: **dish.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real light blue shallow ceramic dish, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no white plate satellite dish illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 53. dolphin   (new)

save as: **dolphin.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real grey bottlenose dolphin, curved leaping pose, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no shark whale illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 54. donut   (new)

save as: **donut.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real pink glazed donut with rainbow sprinkles, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bagel plain white donut illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 55. dress   (new)

save as: **dress.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red children's dress with short sleeves, laid flat, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no worn on person skirt illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 56. eggplant   (new)

save as: **eggplant.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real eggplant with glossy deep-purple skin and a small green calyx stem, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no sliced cut-open unripe green white pale illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 57. engine   (new)

save as: **engine.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real toy steam locomotive train engine, red and black metal body with black smokestack, on four wheels, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no multiple train cars tracks diesel car engine block illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 58. fern   (new)

save as: **fern.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real fresh green fern frond with feathery pinnate leaflets, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no dried brown potted palm leaf illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 59. fig   (new)

save as: **fig.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real ripe fig with purplish-brown skin and a small stem, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no sliced cut-open green unripe dried illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 60. flag   (new)

save as: **flag.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small triangular pennant flag on a short wooden dowel, plain red and white striped fabric, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no national emblem text logo writing illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 61. flower   (new)

save as: **flower.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red tulip flower on a straight green stem with one leaf, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no rose daisy white wilted illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 62. flute   (new)

save as: **flute.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real silver metal concert flute lying horizontally with visible keys, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no recorder clarinet gold brass illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 63. fly   (new)

save as: **fly.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real housefly with dark grey-black segmented body and translucent veined wings, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no butterfly bee oversized illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 64. glue   (new)

save as: **glue.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real bottle of white school glue with an orange pointed cap, blank unlabeled, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no label text brand logo glue stick illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 65. gong   (new)

save as: **gong.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small tabletop brass gong, golden-bronze disc in a wooden frame stand, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no cymbal bell mallet person illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 66. gorilla   (new)

save as: **gorilla.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real western lowland gorilla with black-grey fur, seated, knuckles on ground, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no chimpanzee orangutan illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 67. hawk   (new)

save as: **hawk.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red-tailed hawk with brown mottled feathers, perched, wings folded, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no eagle owl white albino illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 68. helicopter   (new)

save as: **helicopter.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small helicopter with grey metal body, main and tail rotor, black skids, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bright primary colors airplane jet illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 69. hippo   (new)

save as: **hippo.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real hippopotamus with thick grey skin, standing on four short legs, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no rhino pink illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 70. hive   (new)

save as: **hive.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real beehive, oval dome-shaped papery nest with layered grey-tan texture, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wooden box honeycomb frame bees illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 71. horn   (new)

save as: **horn.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brass French horn with coiled tubing and a wide bell, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no animal horn car horn trumpet illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 72. hose   (new)

save as: **hose.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real green rubber garden hose coiled in a loose circle with a brass nozzle, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no red fire hose reel illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 73. hut   (new)

save as: **hut.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small thatched-roof hut with round mud-brick walls and a conical straw roof, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no house cabin tent illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 74. jeep   (new)

save as: **jeep.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real green open-top jeep with four wheels and a spare tire on the back, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no car truck convertible illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 75. knife   (new)

save as: **knife.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real stainless steel table knife with a black handle, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no pocket knife weapon serrated illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 76. knot   (new)

save as: **knot.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real overhand knot tied in thick beige natural fiber rope, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no shoelace string thin illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 77. lamb   (new)

save as: **lamb.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real baby lamb with cream curly wool fleece and pink face, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no adult sheep goat illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 78. lock   (new)

save as: **lock.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brass padlock, closed, with an oval shackle and a keyhole, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no combination digital lock illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 79. lollipop   (new)

save as: **lollipop.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real round swirl lollipop on a white paper stick, red and white spiral, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wrapper visible text logo illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 80. mask   (new)

save as: **mask.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real black masquerade eye mask with two eye holes and an elastic band, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no surgical gas mask ornate glitter illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 81. mat   (new)

save as: **mat.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small rectangular woven floor mat in solid tan natural fiber, flat lay, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no yoga mat blue text door mat with words illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 82. match   (new)

save as: **match.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real wooden matchstick with a red phosphorus tip, unused, lying diagonally, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no matchbox lit flame smoke illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 83. moth   (new)

save as: **moth.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown moth with patterned wings spread flat and feathery antennae, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no butterfly colorful monarch illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 84. mule   (new)

save as: **mule.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real mule with grey-brown coat and long ears, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no horse donkey zebra illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 85. octagon   (new)

save as: **octagon.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red wooden octagon shape block, flat eight-sided geometric tile, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no stop sign hexagon circle illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 86. omelette   (new)

save as: **omelette.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real folded cooked omelette, golden-yellow egg, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no scrambled eggs fried egg pancake crepe illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 87. pie   (new)

save as: **pie.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real whole baked pie with a golden-brown lattice crust, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no slice cake tart illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 88. plane   (new)

save as: **plane.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real commercial passenger airplane with white fuselage, blue stripe, wings and tail fin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no carpenter's plane woodworking tool fighter jet rocket illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 89. plum   (new)

save as: **plum.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real ripe purple plum, whole, with smooth glossy skin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no prune dried wrinkled illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 90. potato   (new)

save as: **potato.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real whole brown potato with rustic skin and small eyes, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no fries mashed sweet potato illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 91. prune   (new)

save as: **prune.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real dried prune with wrinkled dark purple-black skin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no fresh plum grape raisin illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 92. pup   (new)

save as: **pup.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small fluffy puppy with floppy ears and brown and white fur, sitting, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no adult dog cat wolf illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 93. puppy   (new)

save as: **puppy.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small fluffy golden puppy with floppy ears, sitting, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no adult dog cat wolf illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 94. purse   (new)

save as: **purse.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown leather handbag purse, closed, with a shoulder strap, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no wallet backpack coin purse illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 95. quiver   (new)

save as: **quiver.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown leather archery quiver holding several arrows with feathered fletching, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no trembling shaking illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 96. radio   (new)

save as: **radio.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real vintage portable radio with black and silver body, antenna and tuning dial, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no smartphone speaker television illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 97. rat   (new)

save as: **rat.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown rat with a long tail and whiskers, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no mouse hamster white albino illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 98. rock   (new)

save as: **rock.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real grey natural stone rock with smooth rounded texture, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no gem crystal jewel diamond illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 99. rope   (new)

save as: **rope.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real coiled thick brown natural fiber rope, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no snake cable wire illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 100. screw   (new)

save as: **screw.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real silver metal screw with a phillips cross head and threaded shaft, upright, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no nail bolt nut illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 101. shark   (new)

save as: **shark.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real grey shark with streamlined body and tall dorsal fin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no whale dolphin illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 102. sheep   (new)

save as: **sheep.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real sheep with fluffy white wool, black face and legs, standing, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no goat lamb llama illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 103. shell   (new)

save as: **shell.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real spiral seashell with cream and brown natural patterns, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no starfish coral pearl illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 104. ship   (new)

save as: **ship.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real wooden sailing ship with brown hull, tall white sails and masts, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no rowboat canoe raft illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 105. shirt   (new)

save as: **shirt.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real folded blue collared button-up shirt, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no jacket sweater t-shirt illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 106. shoe   (new)

save as: **shoe.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red and white child's sneaker, single shoe, laces tied, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no boot sandal slipper pair illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 107. skunk   (new)

save as: **skunk.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real black and white skunk with a bushy striped tail raised, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no cat raccoon badger illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 108. sled   (new)

save as: **sled.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real wooden sled with red metal runners, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no snow toboggan sledgehammer illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 109. slug   (new)

save as: **slug.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown garden slug with an elongated soft body and no shell, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no snail shell white albino illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 110. snail   (new)

save as: **snail.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown and tan garden snail with a spiral shell, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no slug shell-less illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 111. spider   (new)

save as: **spider.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real black and brown garden spider with eight legs and hairy texture, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no rubber fake ant illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 112. stamp   (new)

save as: **stamp.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real wooden-handled rubber ink stamp, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no postage stamp envelope illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 113. straw   (new)

save as: **straw.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red and white striped bendy drinking straw, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no clear transparent hay wheat broom illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 114. swan   (new)

save as: **swan.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real white swan with a graceful curved neck and bright orange beak, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no goose duck grey illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 115. tank   (new)

save as: **tank.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real green military tank with treads and a rotating turret, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no fish tank water tank truck car illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 116. tape   (new)

save as: **tape.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real roll of colorful patterned washi tape, cylindrical roll, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no clear transparent cassette measuring tape wheel illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 117. tent   (new)

save as: **tent.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small orange camping tent pitched in a dome shape, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no circus tent illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 118. thorn   (new)

save as: **thorn.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown rose thorn on a short stem segment with a sharp spiked point, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no whole rose leaf flower illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 119. tie   (new)

save as: **tie.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real red silk necktie hanging straight, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no bow tie clip-on shoelace illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 120. toad   (new)

save as: **toad.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown warty toad with a squat rounded body and dry bumpy skin, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no frog smooth green glossy illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 121. tooth   (new)

save as: **tooth.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real human molar tooth, off-white ivory with visible roots, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no transparent glowing illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 122. tray   (new)

save as: **tray.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small rectangular wooden serving tray with raised edges, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no plate bowl illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 123. tree   (new)

save as: **tree.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real miniature model pine tree with green foliage and a brown trunk, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no full size tree forest illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 124. vacuum   (new)

save as: **vacuum.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small upright toy vacuum cleaner with a colorful body and hose, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no full-size industrial illustration cartoon 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 125. whip   (new)

save as: **whip.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real brown leather bullwhip, coiled, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no rope whisk illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 126. whisk   (new)

save as: **whisk.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real stainless steel kitchen balloon whisk with wire loops, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no whip illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```

## 127. wren   (new)

save as: **wren.png**

```
ultra-realistic professional studio photograph, real photograph shot on a DSLR with a macro lens, true photographic depth of field, natural material texture, of a single real small brown wren perched, realistic feather texture, centered, soft even studio lighting, plain pure white seamless background, sharp focus, no props, no people, no text, no words, no letters, no numbers, no watermark --ar 3:2 --no sparrow robin illustration cartoon toy plastic 3d render cgi digital art painting drawing sculpture clay figurine-look glossy-plastic
```
