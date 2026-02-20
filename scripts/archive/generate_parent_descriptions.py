#!/usr/bin/env python3
import json

def generate_parent_description(work):
    """Generate a warm, parent-friendly description from the comprehensive guide data."""
    name = work['name']
    quick_guide = work.get('quick_guide', '')
    direct_aims = work.get('direct_aims', [])
    indirect_aims = work.get('indirect_aims', [])
    why_it_matters = work.get('why_it_matters', '')
    
    # If parent_description already exists, use it
    if work.get('parent_description'):
        return work['parent_description']
    
    # Build descriptions based on the work content
    # Extract key points from aims and why_it_matters
    
    # Simplify and make warm
    description_map = {
        'Carrying a Mat': "Your child is learning to carry and handle materials with care. This foundational skill develops balance, coordination, and respect for classroom materials. It's one of the first lessons in the Montessori environment and sets the tone for how your child will interact with all future work.",
        'Carrying a Chair': "Your child is learning to carry furniture with care and control. This activity develops physical strength, balance, and awareness of movement. It teaches your child to be conscious of their impact on the shared environment and to move with intentionality and respect.",
        'Carrying a Table': "Your child is learning to carry and manage larger furniture. This activity develops physical strength, body awareness, and practical problem-solving skills. It helps your child understand how to safely manipulate their environment and builds confidence in handling increasingly complex tasks.",
        'Opening and Closing a Door': "Your child is learning to open and close doors carefully and with awareness of others. This practical skill develops body control, coordination, and social awareness. It teaches your child to move through spaces respectfully and mindfully.",
        'Sitting and Standing at a Table': "Your child is learning proper table etiquette and body awareness while sitting. This fundamental skill develops good posture, coordination, and classroom norms. It prepares your child for extended periods of work at a table, including eating, writing, and other focused activities.",
        'The Silence Game': "Your child is learning to sit quietly and listen. The Silence Game develops concentration, self-control, and an appreciation for quiet and calm. It's a powerful tool for helping children slow down, become aware of their inner world, and build the foundation for focused learning.",
        'Turning Pages of a Book': "Your child is learning to handle books with care and respect. This activity develops fine motor control and an appreciation for reading materials. It introduces your child to the joy of looking at beautiful pictures and the care that books deserve.",
        'Rolling and Unrolling a Mat': "Your child is learning to carefully roll up a mat and prepare it for storage, developing care for materials and understanding how to prepare and maintain the classroom environment. This activity builds sequence awareness and respect for shared spaces.",
        'Opening and Closing a Book': "Your child is learning how to open a book gently and turn the pages with care, developing respect for books and the fine motor control needed for reading. This simple skill teaches your child that how we handle materials matters.",
        'Spooning': "Your child is carefully spooning beans or other small objects from one bowl to another, learning to control the spoon with steady hands and focused attention. This activity isolates one precise movement, allowing your child to build control and develop the muscle memory needed for eating and other fine motor tasks.",
        'Tonging': "Your child is using tongs to pick up and transfer small objects from one container to another, practicing the pinching motion and hand control needed for many daily tasks. This activity builds grip strength and the refined finger movements that are essential for writing.",
        'Pouring Dry Materials': "Your child is pouring lentils, beans, or rice from one container to another, learning to control the flow and aim with their hands and eyes working together. This requires intense concentration and the coordination of multiple movements happening simultaneously.",
        'Pouring Water': "Your child is carefully pouring water from one pitcher to another, developing precision, control, and concentration as they manage the flow of liquid. This seemingly simple activity demands that your child coordinate their eyes, hands, and body while controlling the rate of pouring - true mastery of self.",
        'Basting (Turkey Baster)': "Your child is using a baster to draw up water and transfer it from one container to another, developing the precise squeezing and releasing movements needed for fine motor control. This activity builds grip strength and the refined finger movements essential for writing and other precise tasks.",
        'Eye Dropper': "Your child is using an eye dropper to carefully transfer water drop by drop from one container to another, building precision, hand-eye coordination, and concentration. This delicate activity requires intense focus and develops the fine motor control needed for many practical life skills.",
        'Sponging': "Your child is using a sponge to transfer water from one container to another, learning to control pressure and movement while developing hand strength and coordination. This activity combines the challenge of squeezing and the precision needed to transfer liquids.",
        'Dry Transfer - Hands': "Your child is using their hands to carefully transfer small objects like beans or pasta from one container to another, developing hand control and concentration. This foundational transfer activity teaches precision and care before progressing to tools.",
        'Tweezers Transfer': "Your child is using tweezers to pick up and transfer small objects, developing fine pincer grip and hand-eye coordination. This challenging activity strengthens the exact finger muscles and control needed for writing.",
        'Chopsticks Transfer': "Your child is using chopsticks to pick up and transfer small objects from one container to another, developing hand control, coordination, and concentration. This activity builds the strength and dexterity needed for fine motor tasks.",
        'Dry Pouring': "Your child is pouring dry materials like beans or lentils from one container to another with careful control, learning to manage the flow and avoid spilling. This activity develops hand-eye coordination and builds the concentration needed for all future learning.",
        'Eye Dropper Transfer': "Your child is using an eye dropper to transfer colored water drop by drop, developing extraordinary precision and concentration. This delicate, meditative activity builds focus and the fine motor control essential for writing.",
        'Folding Cloths': "Your child is learning to fold fabric squares along stitched guide lines, folding precisely and carefully. Each fold requires hand-eye coordination, fine motor control, and the ability to follow a pattern - the same skills needed for writing, drawing, and complex problem-solving.",
        'Face Washing': "Your child is independently washing their face using a basin, soap, water, and towel, learning to care for their own body with intention and responsibility. This self-care activity builds independence, self-awareness, and the confidence that comes from mastering essential life skills.",
        'Hair Brushing': "Your child is learning to brush their own hair independently, practicing fine motor control and hand-eye coordination while building a routine of personal care. This activity builds responsibility, self-awareness, and the routine structure that gives children a sense of order and calm.",
        'Hair Brushing/Combing': "Your child is learning to brush or comb their own hair independently, practicing fine motor control and hand-eye coordination while building a routine of personal care. This activity builds responsibility, self-awareness, and the routine structure that gives children a sense of order and calm.",
        'Mopping': "Your child is learning to care for their environment by mopping a floor, developing responsibility for the space around them. This activity combines gross motor movements, coordination, and the satisfaction of seeing a direct result from their own effort and care.",
        'Plant Care': "Your child is watering plants, observing their growth, and learning the cycles of nature while taking responsibility for another living thing. This activity teaches cause and effect, patience, and the connection between care and growth - lessons that extend far beyond gardening.",
        'Flower Arranging': "Your child is arranging flowers in a vase, developing fine motor skills and an eye for beauty and order. This creative activity teaches respect for natural materials, an appreciation for aesthetics, and the joy of creating something beautiful to share with others.",
        'Please and Thank You': "Your child is learning, through repeated modeling and gentle practice, the words and the deeper meaning behind saying please and thank you. These grace and courtesy lessons teach children that words carry power - they can show respect, build connections, and smooth over misunderstandings between people.",
        'Cutting Soft Foods': "Your child is using a child-safe knife to cut soft foods like banana, melon, or strawberry, developing confidence and independence in the kitchen. Starting with foods that require minimal effort builds success and confidence before progressing to more challenging materials.",
        'Cutting Harder Foods': "Your child is now using appropriate knives to cut vegetables like cucumber, carrot, or apple, building upon earlier knife skills with more challenging materials. This progression develops stronger fine motor control, problem-solving (how much pressure do I need?), and growing independence in meal preparation.",
    }
    
    if name in description_map:
        return description_map[name]
    
    # Generate based on category if not in map
    category = work.get('category', '')
    
    if 'Dressing' in category or 'Frame' in name:
        return f"Your child is learning to fasten and unfasten {name.lower()}, developing fine motor skills and independence in dressing. This activity builds the hand strength and coordination needed for managing clothing independently."
    
    elif 'Cutting' in name or 'Slicing' in name:
        return f"Your child is learning to use a knife to cut and slice foods, developing hand-eye coordination and fine motor control. This practical skill builds confidence in the kitchen and independence in meal preparation."
    
    elif 'Spreading' in name:
        return "Your child is learning to spread soft foods on bread using a butter knife, developing fine motor control and hand strength. This practical skill builds confidence in the kitchen and develops the wrist flexibility needed for writing."
    
    elif 'Grating' in name:
        return "Your child is learning to grate foods like cheese or vegetables, developing hand-eye coordination, strength, and practical problem-solving. This challenging activity teaches how to use tools safely and effectively."
    
    elif 'Juicing' in name:
        return "Your child is learning to juice citrus fruits, developing hand strength and practical kitchen skills. This activity teaches cause and effect and the satisfaction of producing something useful through their own effort."
    
    elif 'Making a Snack' in name or 'Snack' in name:
        return "Your child is learning to make a simple snack independently, combining multiple practical life skills into one complete activity. This builds confidence, independence, and the joy of creating something to eat or share with others."
    
    elif 'Peeling' in name:
        return "Your child is learning to peel fruits and vegetables, developing hand strength, fine motor control, and practical kitchen skills. This activity teaches the progression from easier to more challenging tasks as skills develop."
    
    elif 'Meal Preparation' in name or 'Serving' in name:
        return "Your child is learning to prepare and serve a meal or snack, combining multiple practical life skills into one meaningful activity. This builds independence, planning ability, and the confidence that comes from providing care to others."
    
    elif 'Washing Fruits' in name or 'Washing Vegetables' in name:
        return "Your child is learning to wash fresh produce, developing responsibility for food safety and preparation. This practical activity builds independence in meal preparation and teaches respect for healthy food."
    
    elif 'Cracking Eggs' in name:
        return "Your child is learning to crack eggs safely and carefully, developing hand strength and the fine motor control needed for precise movements. This kitchen skill builds confidence and independence in food preparation."
    
    elif 'Dusting' in name:
        return "Your child is learning to dust surfaces in the classroom, developing care for the environment and responsibility for shared spaces. This activity combines gross motor movements with the attention to detail needed to care for beautiful materials."
    
    elif 'Sweeping' in name:
        return "Your child is learning to sweep floors, developing gross motor coordination and responsibility for maintaining the environment. This work teaches the satisfaction of creating order and caring for shared spaces."
    
    elif 'Scrubbing' in name or 'Table Scrubbing' in name:
        return "Your child is learning to scrub a table or surface, developing hand strength, coordination, and responsibility for the environment. This work teaches the care needed to keep shared spaces clean and organized."
    
    elif 'Window' in name:
        return "Your child is learning to wash and polish windows, developing care for the environment and responsibility for keeping spaces beautiful. This activity requires attention to detail and builds understanding of how to maintain a clean, organized classroom."
    
    elif 'Polishing' in name:
        return f"Your child is learning to polish {name.lower().replace('polishing ', '')}, developing care for beautiful materials and responsibility for the environment. This meditative activity teaches the satisfaction of making something shine through effort and care."
    
    elif 'Wood' in name:
        return "Your child is learning to care for and polish wooden materials, developing fine motor skills and an appreciation for natural materials. This activity teaches respect for the beautiful tools and furniture in the classroom."
    
    elif 'Metal' in name:
        return "Your child is learning to polish metal materials, developing fine motor skills and care for beautiful objects. This satisfying activity teaches that effort and attention to detail create beauty."
    
    elif 'Glass' in name:
        return "Your child is learning to clean and polish glass, developing care for delicate materials and responsibility for the environment. This activity teaches careful, precise movements and an appreciation for transparency and clarity."
    
    elif 'Animal Care' in name or 'Care of Living Things' in name:
        return "Your child is learning to care for classroom animals or living things, developing responsibility and compassion for other living creatures. This work teaches that living things depend on us for care and that our actions affect others."
    
    elif 'Dish Washing' in name or 'Washing Dishes' in name:
        return "Your child is learning to wash dishes, developing responsibility for care of materials and the environment. This practical life work teaches the satisfaction of restoring order and cleanliness through their own effort."
    
    elif 'Laundry' in name and 'Hand' in name:
        return "Your child is learning to hand wash clothes, developing responsibility for self-care and the environment. This practical activity teaches that we can care for our own belongings and that gentle, careful work produces good results."
    
    elif 'Folding Laundry' in name or 'Folding' in name and 'Laundry' in name:
        return "Your child is learning to fold clean laundry, developing organization skills and responsibility for their own belongings. This practical activity teaches order and the satisfaction of completing a task that benefits the family."
    
    elif 'Cloth Washing' in name:
        return "Your child is learning to wash cloths in water, developing hand strength and responsibility for keeping classroom materials clean. This activity builds practical skills and care for the environment."
    
    elif 'Shoe Polishing' in name:
        return "Your child is learning to polish their shoes, developing fine motor skills and responsibility for their own appearance. This self-care activity teaches that we can take pride in how we present ourselves."
    
    elif 'Hand Washing' in name:
        return "Your child is learning to wash their hands thoroughly, developing responsibility for personal hygiene and health. This foundational self-care skill teaches the importance of regular cleanliness and protection against illness."
    
    elif 'Teeth Brushing' in name or 'Brushing Teeth' in name:
        return "Your child is learning to brush their teeth independently, developing responsibility for dental health and self-care. This daily routine builds habits that support lifelong health and wellbeing."
    
    elif 'Nose Blowing' in name:
        return "Your child is learning to blow their nose independently, developing self-care skills and responsibility for personal health. This practical skill builds independence and reduces the spread of illness in the classroom."
    
    elif 'Covering Coughs' in name or 'Sneezes' in name:
        return "Your child is learning to cover their coughs and sneezes appropriately, developing awareness of health and responsibility toward others. This grace and courtesy lesson teaches respect for the community."
    
    elif 'Hair Washing' in name and 'Self' in category:
        return "Your child is learning to wash their own hair, developing independence in personal care and responsibility for their own hygiene. This self-care skill builds the routines that support health and wellbeing."
    
    elif 'Dressing' in name or 'Dressing Oneself' in name or 'Self-Dressing' in name:
        return "Your child is learning to dress themselves independently, developing fine motor skills and responsibility for their own appearance. This foundational self-care skill builds confidence and independence."
    
    elif 'Undressing' in name:
        return "Your child is learning to undress themselves, developing fine motor skills and independence in managing their own clothing. This practical skill builds the ability to care for themselves in all situations."
    
    elif 'Bathing' in name:
        return "Your child is learning to bathe independently, developing responsibility for personal hygiene and self-care. This important activity teaches the routines and care needed to maintain health and cleanliness."
    
    elif 'Velcro' in name:
        return "Your child is learning to fasten and unfasten velcro, developing fine motor skills and independence in dressing. This is often the easiest fastening for young children to master."
    
    elif 'Snaps' in name:
        return "Your child is learning to fasten and unfasten snaps, developing fine motor skills and hand strength. This practical activity builds the pinching and coordination skills needed for more complex fastening."
    
    elif 'Button' in name:
        return "Your child is learning to button and unbutton, developing fine motor skills and the hand strength needed for independent dressing. This challenging activity teaches persistence and problem-solving."
    
    elif 'Zipper' in name:
        return "Your child is learning to zip and unzip, developing hand coordination and independence in dressing. This practical skill teaches the sequence of movements needed for smooth, controlled zipping."
    
    elif 'Hook and Eye' in name:
        return "Your child is learning to fasten hooks and eyes, developing fine motor control and the gentle movements needed for delicate fastening. This advanced skill teaches precision and care."
    
    elif 'Buckle' in name:
        return "Your child is learning to fasten and unfasten buckles, developing hand coordination and practical dressing skills. This activity teaches how different fastening systems work."
    
    elif 'Safety Pin' in name:
        return "Your child is learning to fasten safety pins, developing caution, fine motor control, and responsibility for safety. This activity teaches respect for sharp objects and careful handling."
    
    elif 'Lacing' in name:
        return "Your child is learning to lace materials, developing fine motor control and the hand-eye coordination needed for detailed work. This activity is excellent preparation for writing and artistic activities."
    
    elif 'Bow' in name or 'Tying' in name:
        return "Your child is learning to tie bows, developing the hand coordination and fine motor control needed for complex fastening. This challenging activity teaches persistence and sequential thinking."
    
    elif 'Braiding' in name:
        return "Your child is learning to braid materials, developing sophisticated fine motor control and the ability to manage multiple strands simultaneously. This complex activity builds coordination and concentration."
    
    elif 'Threading' in name and 'Needle' in name:
        return "Your child is learning to thread a needle, developing the extraordinary precision needed for this delicate task. This foundational sewing skill teaches patience, fine motor control, and hand-eye coordination."
    
    elif 'Running Stitch' in name:
        return "Your child is learning to make a running stitch, developing fine motor control and the hand strength needed for sewing. This foundational sewing technique builds the skills needed for more complex needlework."
    
    elif 'Sewing Button' in name or 'Sewing a Button' in name:
        return "Your child is learning to sew a button onto fabric, developing fine motor skills and practical independence. This practical activity teaches that we can repair and care for our own belongings."
    
    elif 'Threading Bead' in name or 'Threading Beads' in name:
        return "Your child is learning to thread beads onto string or wire, developing fine motor control and hand-eye coordination. This enjoyable activity builds concentration and the precision needed for detailed work."
    
    elif 'Sewing Card' in name or 'Sewing Cards' in name:
        return "Your child is learning to lace through a sewing card, developing fine motor control and the hand-eye coordination needed for detailed work. This activity builds concentration and prepares for actual sewing."
    
    elif 'Paper Punching' in name or 'Punching' in name:
        return "Your child is learning to use a hole punch, developing hand strength and coordination. This practical activity teaches how tools work and produces satisfying, visible results."
    
    elif 'Cross Stitch' in name:
        return "Your child is learning to make cross stitches, developing fine motor control and the pattern recognition needed for detailed needlework. This artistic activity combines precision with creativity."
    
    elif 'Weaving' in name:
        return "Your child is learning to weave, developing fine motor skills and understanding of pattern and sequence. This creative activity teaches how different materials can be combined to create beauty."
    
    elif 'Greeting' in name or 'Greet' in name:
        return "Your child is learning to greet others respectfully, developing social awareness and courtesy. This grace and courtesy lesson teaches that how we welcome others affects how they feel in our community."
    
    elif 'Introduction' in name:
        return "Your child is learning to introduce people to each other, developing social awareness and courtesy. This grace and courtesy lesson teaches the importance of helping others feel welcomed and included."
    
    elif 'Excuse Me' in name:
        return "Your child is learning to say excuse me appropriately, developing awareness of others and courtesy in shared spaces. This grace and courtesy lesson teaches respect for others' work and space."
    
    elif 'Interrupt' in name:
        return "Your child is learning to interrupt politely when necessary, developing awareness of others and appropriate timing. This grace and courtesy lesson teaches respect for others' work while learning when interruption is necessary."
    
    elif 'Offering and Accepting Help' in name or 'Accepting Help' in name:
        return "Your child is learning to offer and accept help graciously, developing cooperation and community awareness. This grace and courtesy lesson teaches that we are interdependent and that accepting help is a sign of wisdom."
    
    elif 'Apologizing' in name or 'Apology' in name:
        return "Your child is learning to apologize sincerely, developing empathy and responsibility for our actions. This grace and courtesy lesson teaches that mistakes are opportunities to repair relationships and grow."
    
    elif 'Table Manners' in name:
        return "Your child is learning table manners, developing grace and courtesy during mealtimes. This grace and courtesy lesson teaches respect for food and for those eating with us."
    
    elif 'Setting the Table' in name or 'Setting a Table' in name:
        return "Your child is learning to set a table properly, developing responsibility and care for creating a welcoming space for others. This practical activity combines learning and courtesy."
    
    elif 'Observing Another' in name:
        return "Your child is learning to observe another's work respectfully, developing appreciation for others' concentration and work. This grace and courtesy lesson teaches respect and helps create a peaceful classroom."
    
    elif 'Walking Around' in name or 'Walking Around Someone' in name or 'Walking Around Mats' in name:
        return "Your child is learning to walk around others' work carefully, developing awareness of space and respect for concentration. This grace and courtesy lesson teaches community awareness and respect for others."
    
    elif 'Sharing and Taking Turn' in name or 'Taking Turn' in name:
        return "Your child is learning to share materials and take turns, developing cooperation and consideration for others. This grace and courtesy lesson teaches that everyone's needs matter in our community."
    
    elif 'Asking for Help' in name:
        return "Your child is learning to ask for help politely, developing communication skills and awareness of when to seek assistance. This grace and courtesy lesson teaches that asking for help is a sign of strength, not weakness."
    
    elif 'Saying Thank You' in name:
        return "Your child is learning to say thank you genuinely and appropriately, developing gratitude and awareness of others' kindness. This grace and courtesy lesson teaches that gratitude builds positive relationships."
    
    # Default fallback
    return f"Your child is learning to {name.lower()}, developing important practical life skills and independence. This activity builds confidence and competence in managing daily life with intention and care."

# Load the comprehensive guides
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/lib/curriculum/comprehensive-guides/practical-life-guides.json') as f:
    comprehensive = json.load(f)

# Load the current parent descriptions
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/lib/curriculum/comprehensive-guides/parent-practical-life.json') as f:
    current_parent = json.load(f)

# Create a mapping of names to existing parent entries
existing_by_name = {item['name']: item for item in current_parent}

# Build the complete list of parent descriptions
all_parent_descriptions = []

for work in comprehensive['works']:
    name = work['name']
    
    # Check if this work already has a parent description
    if name in existing_by_name:
        all_parent_descriptions.append(existing_by_name[name])
    else:
        # Generate new description
        parent_desc = generate_parent_description(work)
        skills = work.get('skills_developed', []) or []
        home_connection = work.get('home_connection', '')
        
        # Generate home connection if not provided
        if not home_connection:
            if 'Transfer' in work['category']:
                home_connection = "At home, you can provide similar transfer activities using safe materials like dried beans, pasta, or water. Even a simple snack preparation activity where your child helps is great practice."
            elif 'Care of Self' in work['category']:
                home_connection = "At home, encourage your child to practice this skill during daily routines. Your patient modeling and confidence in their ability will help them master this important self-care task."
            elif 'Care of Environment' in work['category']:
                home_connection = "At home, involve your child in these care activities. Give them real, meaningful work that contributes to family life. Your child will develop pride in caring for their environment."
            elif 'Dressing' in work['category'] or 'Frame' in name:
                home_connection = "At home, give your child time and space to practice dressing independently. Choose clothing with these fasteners and allow extra time for your child to master the skill without rushing."
            elif 'Food' in work['category']:
                home_connection = "At home, involve your child in food preparation and cooking. Let them practice under supervision and celebrate their growing independence in the kitchen."
            elif 'Grace and Courtesy' in work['category']:
                home_connection = "At home, model the behavior you want your child to learn. Catch them being good and acknowledge when they use grace and courtesy. Your consistent modeling is the most powerful teacher."
            elif 'Sewing' in work['category'] or 'Handwork' in work['category']:
                home_connection = "At home, provide simple handwork activities. Threading beads, sewing cards, or simple needlework can all be done at home with proper supervision and encouragement."
            elif 'Preliminary' in work['category']:
                home_connection = "At home, encourage your child to practice these foundational movements during daily activities. Your calm presence and confidence in your child's abilities supports their development."
            else:
                home_connection = "At home, you can support this learning by giving your child opportunities to practice similar skills in everyday life. Your encouragement and patience are key to their success."
        
        entry = {
            "id": work.get('work_id', ''),
            "name": name,
            "parent_description": parent_desc,
            "skills_developed": skills if skills else [],
            "home_connection": home_connection
        }
        all_parent_descriptions.append(entry)

# Write the updated file
with open('/Users/tredouxwillemse/Desktop/ACTIVE/whale/lib/curriculum/comprehensive-guides/parent-practical-life.json', 'w') as f:
    json.dump(all_parent_descriptions, f, indent=2, ensure_ascii=False)

print(f"Successfully generated parent descriptions for all {len(all_parent_descriptions)} works!")
print(f"Original: {len(current_parent)} entries")
print(f"Updated: {len(all_parent_descriptions)} entries")
