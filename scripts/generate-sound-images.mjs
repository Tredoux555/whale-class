// DALL-E 3 Sound Games Image Generator
// Generates all 60 images automatically

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';

// ⚠️ PASTE YOUR API KEY HERE:
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_API_KEY_HERE';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Output directory
const OUTPUT_DIR = './generated-images';

// Style suffix for all images
const STYLE = `Simple cute children's book illustration style, soft pastel colors with vibrant accents, clean white background, friendly and approachable, gentle rounded shapes, suitable for 3-5 year olds, no text or letters anywhere in the image, digital art, professional quality`;

// All 60 prompts
const PROMPTS = [
  { word: 'add', prompt: 'A cheerful cartoon plus sign made of colorful wooden blocks in red and blue, with two small groups of apples (2+3) arranged playfully around it, warm composition suggesting addition' },
  { word: 'arrow', prompt: 'A single beautiful curved arrow in rich forest green with a golden tip, feathered fletching in warm brown tones, pointing gracefully to the right, fairy tale quality' },
  { word: 'bin', prompt: 'A friendly round trash bin in cheerful mint green, slightly tilted with personality, lid slightly ajar showing it is empty and clean, cute curved shape' },
  { word: 'book', prompt: 'An open storybook with colorful pages fanning out beautifully, rich ruby red cover with golden spine, magical and inviting' },
  { word: 'cake', prompt: 'A perfect round birthday cake with fluffy pink frosting in gentle swirls, three cheerful candles with tiny flames, colorful rainbow sprinkles, sitting on a delicate doily' },
  { word: 'chair', prompt: 'A cozy wooden child chair in warm honey color, simple farmhouse style, with a tiny heart carved in the backrest, inviting you to sit' },
  { word: 'cheese', prompt: 'A perfect wedge of Swiss cheese in rich golden yellow, three perfectly round holes showing through, slightly glossy surface, sitting at a friendly angle' },
  { word: 'cherry', prompt: 'Two plump cherries in deep ruby red connected by curved green stems, with a single bright green leaf, glistening with a tiny highlight' },
  { word: 'chicken', prompt: 'A fluffy mother hen in warm orange and cream feathers, round and content body shape, sweet expression with small orange beak, tiny red comb' },
  { word: 'chin', prompt: 'A friendly cartoon child face from nose down, focusing on a cute round chin, rosy cheeks, happy smile, shown in profile, warm peachy tones' },
  { word: 'chip', prompt: 'A single golden crispy potato chip with natural wavy ridges, warm amber color with tiny salt crystals sparkling, appetizing curved shape' },
  { word: 'cow', prompt: 'A gentle dairy cow in classic black and white patches, sweet brown eyes, pink nose, sitting peacefully on grass, friendly farm feel' },
  { word: 'dig', prompt: 'A small red garden shovel stuck in a mound of rich brown earth, dirt flying upward in a playful arc, earthworm peeking out, garden adventure' },
  { word: 'end', prompt: 'A winding path in soft colors leading to a cheerful red finish line ribbon, with confetti floating gently, journey complete sensation' },
  { word: 'foot', prompt: 'A cute cartoon child bare foot in warm peachy tones, five little toes with tiny highlights, gentle curved arch, side profile view' },
  { word: 'girl', prompt: 'A happy little girl with curly brown pigtails tied with pink ribbons, rosy cheeks, bright eyes, wearing a simple yellow dress, joyful expression' },
  { word: 'green', prompt: 'A large perfect circle filled with beautiful grass green color, gradient from light spring green at top to deep emerald at bottom, fresh and nature-inspired' },
  { word: 'heart', prompt: 'A perfect plump heart shape in soft rose red, with a gentle sheen and subtle gradient, slightly dimensional looking, classic valentine style' },
  { word: 'hop', prompt: 'A joyful cartoon bunny mid-hop with ears flying back, fluffy white and gray fur, pink inner ears, all four paws off the ground, pure happiness' },
  { word: 'hut', prompt: 'A cozy round grass hut with thatched golden roof, small circular doorway, simple wooden structure, sitting on green grass, storybook village feel' },
  { word: 'ill', prompt: 'A small cartoon child in bed with covers pulled up, tiny red nose, holding a tissue, teddy bear companion, gentle sick-day feeling, cozy but under the weather' },
  { word: 'in', prompt: 'A curious orange and white cat halfway inside a cardboard box, tail sticking out, playful composition, clearly showing concept of in, cozy moment' },
  { word: 'itch', prompt: 'A cartoon child arm with a tiny red bump, small hand scratching gently, little scratch lines, focusing on the action of scratching an itch' },
  { word: 'jeans', prompt: 'A pair of classic blue denim jeans in indigo color, folded neatly showing pocket detail, tiny copper rivets, characteristic stitching' },
  { word: 'juice', prompt: 'A clear glass filled with bright orange juice, fresh orange slice on rim, tiny bubbles, condensation droplets on glass, refreshing and delicious' },
  { word: 'jump', prompt: 'A joyful child silhouette in mid-jump, arms spread wide reaching for sky, hair flying up, pure freedom and joy, subtle gradient suggesting height' },
  { word: 'milk', prompt: 'A classic glass bottle of fresh white milk, old-fashioned shape with gentle curves, cream rising to top, red cap, farm-fresh wholesome feeling' },
  { word: 'nine', prompt: 'Nine friendly rubber ducks arranged in a 3x3 grid, each slightly different shade of yellow, some facing different directions, clearly countable, cheerful' },
  { word: 'nurse', prompt: 'A kind female nurse in traditional white uniform, small red cross on cap, holding clipboard, warm brown skin, gentle smile, caring and trustworthy' },
  { word: 'on', prompt: 'A small yellow lamp turned on glowing warmly, sitting on a simple wooden table, light rays emanating, cozy room feeling, clearly showing on state' },
  { word: 'peg', prompt: 'A classic wooden clothespin in natural wood color, spring mechanism visible, standing upright, simple functional beauty' },
  { word: 'pink', prompt: 'A large perfect circle filled with beautiful soft pink color, gradient from cotton candy pink to deeper rose, dreamy and gentle feeling' },
  { word: 'run', prompt: 'A cartoon child in motion running fast to the right, ponytail flying behind, sneakers blurred with speed, arms pumping, joyful expression, motion lines' },
  { word: 'sad', prompt: 'A cartoon child face with gentle frown, single tear on cheek, downcast eyes, soft expression showing sadness, empathetic and gentle portrayal' },
  { word: 'sheep', prompt: 'A fluffy white sheep with puffy cloud-like wool, black face and legs peeking out, sweet gentle expression, tiny ears, pastoral and peaceful' },
  { word: 'shell', prompt: 'A beautiful seashell in soft peach and pink spiral, classic conch shape with delicate ridges, ocean treasure feeling, natural patterns' },
  { word: 'ship', prompt: 'A classic wooden sailing ship with billowing white sails, red hull, wooden deck, small porthole windows, adventure on the seas, storybook maritime' },
  { word: 'shirt', prompt: 'A folded cotton t-shirt in bright sky blue, soft fabric folds visible, classic crew neck, short sleeves folded neatly, casual and clean' },
  { word: 'shoe', prompt: 'A single child sneaker in bright red, white laces tied in bow, white rubber sole with tread pattern, playful and ready for adventure' },
  { word: 'shop', prompt: 'A charming small storefront with striped awning, large window display, friendly open door, flower boxes, welcoming village shop feeling' },
  { word: 'thick', prompt: 'Two tree trunks side by side for comparison, one thin birch one thick oak, clearly showing concept of thick, forest feeling, natural texture' },
  { word: 'thin', prompt: 'A tall thin pencil standing next to a thick crayon, showing the contrast clearly, the thin pencil is the focus, sharp and elegant' },
  { word: 'think', prompt: 'A cartoon child with finger on chin, thought bubble above head with question mark, contemplative expression, eyes looking up, wondering' },
  { word: 'throw', prompt: 'A cartoon child in mid-throw motion, arm extended releasing a red ball, ball in mid-air with motion arc, athletic and dynamic pose' },
  { word: 'tree', prompt: 'A perfect friendly tree with thick brown trunk, full round canopy of bright green leaves, strong roots visible at base, classic children book tree' },
  { word: 'two', prompt: 'Two identical teddy bears sitting side by side, one honey brown one caramel tan, holding paws, clearly showing number two, friendship concept' },
  { word: 'uncle', prompt: 'A friendly uncle figure with warm smile, casual sweater in forest green, slightly receding hairline, kind eyes, approachable adult male' },
  { word: 'under', prompt: 'A curious puppy hiding under a wooden table, only eyes and nose peeking out, clearly showing concept of under, playful hide and seek' },
  { word: 'up', prompt: 'A colorful hot air balloon floating upward, red yellow and blue stripes, small basket below, clouds around, upward arrow feeling, freedom and height' },
  { word: 'us', prompt: 'Two cartoon children holding hands, diverse appearance, one pointing to themselves as a pair, togetherness and friendship, us concept clearly shown' },
  { word: 'water', prompt: 'A clear glass of pure water with gentle ripples, ice cubes floating, condensation drops, refreshing and clean, pure and essential' },
  { word: 'wet', prompt: 'A cartoon puppy just out of the bath, fur dripping with water drops, puddle forming below, shaking slightly, adorable wet dog moment' },
  { word: 'wing', prompt: 'A single beautiful bird wing spread wide, feathers in gradient from white to soft gray, detailed feather texture, graceful and ready for flight' },
  { word: 'yak', prompt: 'A friendly yak with long shaggy brown fur, curved horns, kind eyes, standing on snowy mountain hint, Himalayan feeling, gentle giant' },
  { word: 'yam', prompt: 'A sweet potato yam in rich orange-red skin, slightly earthy organic shape, cut open showing bright orange inside, harvest vegetable feeling' },
  { word: 'yarn', prompt: 'A colorful ball of yarn in rainbow colors, loose strand curling out playfully, soft and fluffy texture, craft time feeling, cozy' },
  { word: 'yell', prompt: 'A cartoon child with mouth wide open, hands cupped around mouth, sound waves emanating outward, calling out expression, not angry just loud and fun' },
  { word: 'yellow', prompt: 'A large perfect circle filled with sunshine yellow, gradient from bright lemon to warm golden, happy and energetic feeling, pure color' },
  { word: 'yo-yo', prompt: 'A classic yo-yo in bright red, string extending from center, mid-trick position, golden center cap with swirl pattern, retro toy charm' },
  { word: 'zone', prompt: 'A clearly marked area with colorful boundary lines, child standing in middle of the zone, distinct inside vs outside areas, play zone feeling' },
];

// Download image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Generate single image
async function generateImage(word, prompt, index) {
  const fullPrompt = `${prompt}. ${STYLE}`;
  
  console.log(`\n[${index + 1}/60] Generating: ${word}...`);
  
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0].url;
    const filename = `sound-${word}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    await downloadImage(imageUrl, filepath);
    console.log(`   ✅ Saved: ${filename}`);
    
    return { word, success: true, filepath };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { word, success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('🎨 DALL-E Sound Games Image Generator');
  console.log('=====================================\n');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`📁 Output folder: ${OUTPUT_DIR}\n`);
  
  const results = [];
  const failed = [];
  
  for (let i = 0; i < PROMPTS.length; i++) {
    const { word, prompt } = PROMPTS[i];
    const result = await generateImage(word, prompt, i);
    results.push(result);
    
    if (!result.success) {
      failed.push(word);
    }
    
    // Rate limit: wait 2 seconds between requests
    if (i < PROMPTS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 SUMMARY');
  console.log('=====================================');
  console.log(`✅ Successful: ${results.filter(r => r.success).length}/60`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log(`\nFailed words: ${failed.join(', ')}`);
    console.log('Run the script again to retry failed images.');
  }
  
  console.log(`\n📁 Images saved to: ${OUTPUT_DIR}/`);
  console.log('\nNext steps:');
  console.log('1. Upload all images to Supabase images/sound-objects/');
  console.log('2. Update lib/sound-games/word-images.ts');
}

main().catch(console.error);
