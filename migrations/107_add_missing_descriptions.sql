-- Add descriptions for common work name variants
-- Run this in Supabase SQL editor

-- Hand Washing (if it exists with this name)
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the important routine of hand washing - turning on the tap, using soap, scrubbing hands thoroughly, rinsing, and drying. This essential life skill promotes health and independence.',
  why_it_matters = 'Hand washing teaches children to take care of their health independently. The step-by-step process develops sequencing skills, and the visible results build confidence in self-care.'
WHERE LOWER(name) LIKE '%hand wash%' OR LOWER(name) = 'hand washing';

-- Lacing Frame (variant name for Dressing Frame - Lacing)
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing lacing on a wooden frame. This challenging work develops fine motor skills and hand-eye coordination.',
  why_it_matters = 'Lacing develops the pincer grip and bilateral coordination needed for writing, while building patience and concentration.'
WHERE LOWER(name) LIKE '%lacing%' AND parent_description IS NULL;

-- Update any work with "frame" that has lacing
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing lacing on a wooden frame. This challenging work develops fine motor skills and hand-eye coordination.',
  why_it_matters = 'Lacing develops the pincer grip and bilateral coordination needed for writing, while building patience and concentration.'
WHERE LOWER(name) LIKE '%lacing frame%' AND parent_description IS NULL;
