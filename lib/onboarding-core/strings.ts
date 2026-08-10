// lib/onboarding-core/strings.ts
//
// Every user-facing label the intake form and the printed sheets need, as ONE
// typed object. English values ship here; the shape is deliberately flat and
// fully typed so a zh (or any other) map can be added as `const ZH: IntakeStrings`
// with no structural drift — the compiler enforces completeness.
//
// Montree maps these into its own i18n keys where it wants translation on the
// teacher chrome; the parent form and the printed paper consume EN directly.
// PSS (phase 2) uses EN directly everywhere — it is hardcoded English by design.
//
// No imports. This file is data.

export interface IntakeStrings {
  // Section headings
  sectionIdentity: string;
  sectionFamily: string;
  sectionEmergency: string;
  sectionPickup: string;
  sectionHealth: string;
  sectionDocuments: string;
  sectionConsents: string;
  sectionDevelopment: string;

  // Section hints
  hintIdentity: string;
  hintFamily: string;
  hintEmergency: string;
  hintPickup: string;
  hintHealth: string;
  hintDocuments: string;
  hintConsents: string;
  hintDevelopment: string;

  // Identity
  legalName: string;
  preferredName: string;
  dob: string;
  sex: string;
  sexMale: string;
  sexFemale: string;
  sexUnspecified: string;
  nationality: string;
  homeLanguages: string;
  homeLanguagesHint: string;

  // Family
  guardian: string;
  addGuardian: string;
  name: string;
  relation: string;
  phone: string;
  wechat: string;
  email: string;
  homeAddress: string;

  // Emergency
  emergencyContact: string;
  addEmergencyContact: string;

  // Pickup
  pickupPerson: string;
  addPickupPerson: string;
  pickupPhoto: string;
  pickupNotes: string;

  // Health
  allergies: string;
  addAllergy: string;
  allergen: string;
  severity: string;
  severityMild: string;
  severityModerate: string;
  severitySevere: string;
  allergyAction: string;
  dietaryRestrictions: string;
  conditions: string;
  medications: string;
  physicianName: string;
  physicianPhone: string;
  bloodType: string;
  noAllergies: string;

  // Documents
  facePhoto: string;
  facePhotoHint: string;
  vaccinationBooklet: string;
  healthCheck: string;
  medicalCerts: string;
  uploaded: string;
  upload: string;
  replace: string;
  uploading: string;

  // Consents
  consentPhotoInternal: string;
  consentPhotoMarketing: string;
  consentEmergencyTreatment: string;
  consentSunscreenMedication: string;
  consentDataPrivacy: string;
  consentRequiredNote: string;

  // Development
  temperamentNotes: string;
  strengths: string;
  growthAreas: string;
  fears: string;
  comfortItems: string;
  toileting: string;
  toiletingTrained: string;
  toiletingTraining: string;
  toiletingDiapers: string;
  toiletingUnspecified: string;
  napHabits: string;
  eatingHabits: string;
  separationHistory: string;
  priorCare: string;
  otherNotes: string;

  // Actions / status
  saveDraft: string;
  submit: string;
  saved: string;
  submitted: string;
  committed: string;
  draft: string;
  required: string;
  optional: string;
  remove: string;

  // Print
  printCubbyTitle: string;
  printToothbrushTitle: string;
  printBedTitle: string;
  printTableTitle: string;
  printPickupAuthTitle: string;
  printSignInOutTitle: string;
  printDate: string;
  printChild: string;
  printTimeIn: string;
  printDroppedBy: string;
  printTimeOut: string;
  printPickedUpBy: string;
  printSignature: string;
  printAuthorizedPickup: string;
  printAllergyFlag: string;
  printNoPickupPersons: string;
}

export const EN: IntakeStrings = {
  sectionIdentity: 'About your child',
  sectionFamily: 'Parents & guardians',
  sectionEmergency: 'Emergency contacts',
  sectionPickup: 'Who may collect your child',
  sectionHealth: 'Health',
  sectionDocuments: 'Photo & documents',
  sectionConsents: 'Permissions',
  sectionDevelopment: 'Getting to know your child',

  hintIdentity: 'The basics, exactly as they appear on official documents.',
  hintFamily: 'At least one guardian with a phone number we can reach.',
  hintEmergency: 'Who we call if we cannot reach you. At least one.',
  hintPickup: 'Only these adults will be allowed to take your child home. Their photo goes on the classroom pickup sheet.',
  hintHealth: 'Anything that could matter on a difficult day.',
  hintDocuments: 'A clear face photo is used for your child\'s cubby, bed and table labels.',
  hintConsents: 'Each permission is separate. You may grant some and refuse others.',
  hintDevelopment: 'You know your child better than anyone. Whatever you write here helps their teacher from day one.',

  legalName: 'Full legal name',
  preferredName: 'Name they are called',
  dob: 'Date of birth',
  sex: 'Sex',
  sexMale: 'Male',
  sexFemale: 'Female',
  sexUnspecified: 'Prefer not to say',
  nationality: 'Nationality',
  homeLanguages: 'Languages spoken at home',
  homeLanguagesHint: 'Separate with commas.',

  guardian: 'Guardian',
  addGuardian: 'Add another guardian',
  name: 'Name',
  relation: 'Relationship',
  phone: 'Phone',
  wechat: 'WeChat',
  email: 'Email',
  homeAddress: 'Home address',

  emergencyContact: 'Emergency contact',
  addEmergencyContact: 'Add another emergency contact',

  pickupPerson: 'Authorized adult',
  addPickupPerson: 'Add another authorized adult',
  pickupPhoto: 'Their photo',
  pickupNotes: 'Anything else we should know about pickup',

  allergies: 'Allergies',
  addAllergy: 'Add an allergy',
  allergen: 'Allergen',
  severity: 'Severity',
  severityMild: 'Mild',
  severityModerate: 'Moderate',
  severitySevere: 'Severe',
  allergyAction: 'What we should do',
  dietaryRestrictions: 'Dietary restrictions',
  conditions: 'Medical conditions',
  medications: 'Regular medication',
  physicianName: 'Doctor / clinic',
  physicianPhone: 'Doctor\'s phone',
  bloodType: 'Blood type',
  noAllergies: 'No allergies recorded.',

  facePhoto: 'Face photo',
  facePhotoHint: 'Face the camera, good light, plain background.',
  vaccinationBooklet: 'Vaccination booklet',
  healthCheck: 'Health check certificate',
  medicalCerts: 'Other medical documents',
  uploaded: 'Uploaded',
  upload: 'Upload',
  replace: 'Replace',
  uploading: 'Uploading…',

  consentPhotoInternal: 'Photos of my child may be taken and shared with our family and their teachers inside the school\'s own system.',
  consentPhotoMarketing: 'Photos of my child may be used publicly by the school (website, brochures, social media).',
  consentEmergencyTreatment: 'If my child is injured and I cannot be reached, the school may seek emergency medical treatment.',
  consentSunscreenMedication: 'Staff may apply sunscreen and administer the medication I have listed above.',
  consentDataPrivacy: 'I agree that the school may store and process the information on this form to care for my child.',
  consentRequiredNote: 'This one is required — we cannot enroll your child without it.',

  temperamentNotes: 'How would you describe their temperament?',
  strengths: 'What are they good at? What lights them up?',
  growthAreas: 'What do they find hard?',
  fears: 'Anything that frightens or upsets them',
  comfortItems: 'What comforts them',
  toileting: 'Toileting',
  toiletingTrained: 'Independent',
  toiletingTraining: 'Learning',
  toiletingDiapers: 'In diapers',
  toiletingUnspecified: 'Not specified',
  napHabits: 'Sleeping and naps',
  eatingHabits: 'Eating',
  separationHistory: 'How they usually handle saying goodbye',
  priorCare: 'Previous school or care arrangement',
  otherNotes: 'Anything else you want their teacher to know',

  saveDraft: 'Save draft',
  submit: 'Submit to school',
  saved: 'Saved',
  submitted: 'Submitted',
  committed: 'Accepted by the school',
  draft: 'Draft',
  required: 'Required',
  optional: 'Optional',
  remove: 'Remove',

  printCubbyTitle: 'Cubby labels',
  printToothbrushTitle: 'Toothbrush labels',
  printBedTitle: 'Bed labels',
  printTableTitle: 'Table place cards',
  printPickupAuthTitle: 'Pickup Authorization',
  printSignInOutTitle: 'Daily Sign In / Sign Out',
  printDate: 'Date',
  printChild: 'Child',
  printTimeIn: 'Time in',
  printDroppedBy: 'Dropped off by',
  printTimeOut: 'Time out',
  printPickedUpBy: 'Picked up by',
  printSignature: 'Signature',
  printAuthorizedPickup: 'Authorized to collect',
  printAllergyFlag: 'ALLERGY',
  printNoPickupPersons: 'No authorized adults listed — release to registered guardians only.',
};
