// lib/cms/i18n/dictionaries/en.ts
// The SOURCE dictionary. English is the key set of record: every other locale is
// typed against `typeof en`, so a missing key is a compile error, not a runtime
// blank. Keys are flat and dotted — `<area>.<screen>.<thing>`.
//
// LAW: no user-facing string may exist outside this file (and its siblings).
// Data values — a child's name, a room's name, an allergen — are DATA and come
// from the engine, not from here.

const en = {
  // ── app-level ──────────────────────────────────────────────────────────
  'app.name': 'CMS',
  'app.fullName': 'Classroom Management System',
  'app.strapline': 'Every child accounted for, every day.',
  'app.description':
    'CMS keeps the register, the allergies, the pickup authority and the parent thread in one place — so the answer to "who has Amara today?" takes three seconds, not three phone calls.',

  // ── the hourglass ──────────────────────────────────────────────────────
  'layer.parent': 'Parent',
  'layer.teacher': 'Teacher',
  'layer.org': 'Organisation',
  'layer.parent.role': 'What families put in',
  'layer.teacher.role': 'What the classroom gets out',
  'layer.org.role': 'What the group sees across schools',

  // ── shared chrome ──────────────────────────────────────────────────────
  'nav.dashboard': 'Dashboard',
  'nav.enroll': 'Enrolment',
  'nav.messages': 'Messages',
  'nav.updates': 'Updates',
  'nav.today': 'Today',
  'nav.documents': 'Documents',
  'nav.overview': 'Overview',
  'nav.skipToContent': 'Skip to content',
  'nav.primary': 'Primary navigation',

  'lang.label': 'Language',
  'lang.change': 'Change language',
  'lang.incomplete': 'Partly translated',

  // ── common ─────────────────────────────────────────────────────────────
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.saveDraft': 'Save draft',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.skip': 'Skip for now',
  'common.open': 'Open',
  'common.viewAll': 'View all',
  'common.required': 'Required',
  'common.optional': 'Optional',
  'common.comingSoon': 'Coming soon',
  'common.notBuiltYet': 'Not built yet',
  'common.demoData': 'Demo data',
  'common.demoDataNote':
    'Seeded sample records, flowing through the engine types — no database is connected yet.',

  // ── generic stub chrome (every unbuilt screen wears the same clothes) ───
  'stub.title': 'This screen is scaffolded, not built',
  'stub.body':
    'The route, the chrome and the engine contract are in place. The working surface lands in a later phase — see CLAUDE.md for the build order.',
  'stub.phase': 'Planned for phase {phase}',

  // ── landing ────────────────────────────────────────────────────────────
  'home.title': 'Three layers, one record',
  'home.subtitle':
    'A parent fills a form once. The engine turns it into everything a classroom needs. Nobody retypes anything.',
  'home.enter': 'Enter',
  'home.engine.title': 'The engine',
  'home.engine.body':
    'Between the two ends sits the waist of the hourglass: typed records, routing, assessments, and the document generator. Pure TypeScript, no interface of its own.',

  // ── parent · dashboard ─────────────────────────────────────────────────
  'parent.dashboard.title': 'Your children',
  'parent.dashboard.subtitle': 'Everything the school holds on file, and what still needs you.',
  'parent.dashboard.greeting': 'Good morning, {name}',
  'parent.dashboard.enrolCta': 'Start an enrolment',
  'parent.dashboard.messageSchool': 'Message school',
  'parent.dashboard.viewRecords': 'View records',
  'parent.dashboard.stat.children': 'Children enrolled',
  'parent.dashboard.stat.actions': 'Needs your attention',
  'parent.dashboard.stat.updates': 'New updates',
  'parent.dashboard.needsAttention': 'Needs your attention',
  'parent.dashboard.needsAttentionBody':
    'One consent form is unsigned and one medical record is past its yearly review.',
  'parent.dashboard.resolve': 'Resolve now',

  'child.room': 'Room',
  'child.age': 'Age {years}',
  'child.guardian': 'Guardian',
  'child.status.present': 'Checked in',
  'child.status.absent': 'Absent',
  'child.status.expected': 'Expected',
  'child.medicalNote': 'Medical note',
  'child.pickup.authorised': 'Authorised for pickup',
  'child.pickup.add': 'Add person',
  'child.flags.none': 'No flags',

  'relationship.mother': 'mother',
  'relationship.father': 'father',
  'relationship.aunt': 'aunt',
  'relationship.uncle': 'uncle',
  'relationship.grandparent': 'grandparent',
  'relationship.guardian': 'guardian',
  'relationship.other': 'other',

  // ── parent · enrolment wizard ──────────────────────────────────────────
  'enrol.title': 'Enrolment',
  'enrol.subtitle': 'Six steps. Everything you enter here becomes the school’s record.',
  'enrol.progress': 'Step {current} of {total}',
  'enrol.step.child': 'Child',
  'enrol.step.child.desc': 'Name, birth date, the room they are joining.',
  'enrol.step.medical': 'Medical & allergies',
  'enrol.step.medical.desc': 'Conditions, medication on site, allergy severity.',
  'enrol.step.dietary': 'Dietary',
  'enrol.step.dietary.desc': 'Meal requirements, religious and cultural restrictions.',
  'enrol.step.school': 'Previous school',
  'enrol.step.school.desc': 'Where they were before, and why they moved.',
  'enrol.step.contacts': 'Contacts & pickup',
  'enrol.step.contacts.desc': 'Who may collect the child, and in what order to call.',
  'enrol.step.consents': 'Consents',
  'enrol.step.consents.desc': 'Photography, outings, emergency medical treatment.',
  'enrol.child.legalName': 'Full legal name',
  'enrol.child.legalName.help': 'Exactly as it appears on the birth certificate.',
  'enrol.child.preferredName': 'Preferred name',
  'enrol.child.preferredName.help': 'What the child is actually called in the room.',
  'enrol.child.dateOfBirth': 'Date of birth',
  'enrol.child.homeLanguage': 'Language spoken at home',
  'enrol.child.homeLanguage.help': 'Used to route messages and to brief the teacher.',
  'enrol.child.startDate': 'Intended start date',
  'enrol.child.classGroup': 'Room',
  'enrol.child.classGroup.placeholder': 'Choose a room',
  'enrol.child.notes': 'Anything the teacher should know on day one',
  'enrol.child.notes.placeholder':
    'Settling routine, comfort object, how they handle goodbyes…',
  'enrol.saveAndContinue': 'Save and continue',
  'enrol.stepDone': 'Completed',
  'enrol.stepCurrent': 'In progress',
  'enrol.stepTodo': 'Not started',
  'enrol.privacyNote':
    'Medical and dietary answers are visible only to the child’s room staff and the school office.',

  // ── parent · messages ──────────────────────────────────────────────────
  'parent.messages.title': 'Messages',
  'parent.messages.subtitle':
    'Your school runs its conversations with families through Montree. This is your way in.',

  // ── parent · updates ───────────────────────────────────────────────────
  'parent.updates.title': 'Updates',
  'parent.updates.subtitle':
    'Photo films, weekly reports and how the term is going — published to your Montree parent account.',

  // ── teacher · today ────────────────────────────────────────────────────
  'teacher.today.title': 'Today',
  'teacher.today.subtitle': '{room} · {date}',
  'teacher.today.attendance': '{present} of {total} present',
  'teacher.today.takeRegister': 'Take register',
  'teacher.today.confirmAttendance': 'Confirm attendance',
  'teacher.today.yesterday': 'Yesterday',
  'teacher.today.roll': 'Class list',
  'teacher.today.stat.allergies': 'Allergy flags',
  'teacher.today.stat.dietary': 'Dietary requirements',
  'teacher.today.stat.pickup': 'Pickup changes',
  'teacher.today.legend': 'Allergy · dietary · pickup',
  'teacher.today.legend.body':
    'Every flag on this page came from a parent form, through the engine, without a teacher retyping it.',
  'teacher.today.pickupBy': 'Pickup {time} · {person}',
  'teacher.today.droppedOff': 'Dropped off {time}',
  'teacher.today.absentReason': 'Absent · {reason}',
  'teacher.today.severity.severe': 'Severe',
  'teacher.today.severity.moderate': 'Moderate',
  'teacher.today.severity.mild': 'Mild',

  // ── teacher · documents ────────────────────────────────────────────────
  'teacher.documents.title': 'Documents',
  'teacher.documents.subtitle':
    'Generated from the current record, on demand. Nothing here is maintained by hand.',
  'teacher.documents.generate': 'Generate',
  'doc.classList': 'Class list',
  'doc.classList.desc': 'Every child in the room, with age, allergies and meals.',
  'doc.pickupSheet': 'Pickup sheet',
  'doc.pickupSheet.desc': 'Who may collect whom today, with authorisation status.',
  'doc.labels': 'Name labels',
  'doc.labels.desc': 'Cubby, tray and coat-hook labels in one printable sheet.',
  'doc.dietarySheet': 'Dietary sheet',
  'doc.dietarySheet.desc': 'Kitchen-facing list of every requirement in the room.',
  'doc.allergyPoster': 'Allergy poster',
  'doc.allergyPoster.desc': 'One page per child: allergen, severity, EpiPen, what to do.',

  // ── org · overview ─────────────────────────────────────────────────────
  'org.overview.title': 'Overview',
  'org.overview.subtitle': 'Every school in the group, on one line each.',
  'org.overview.col.school': 'School',
  'org.overview.col.children': 'Children',
  'org.overview.col.classes': 'Rooms',
  'org.overview.col.allergies': 'Allergy flags',
  'org.overview.col.enrolments': 'Open enrolments',

  // ── flag categories (UI labels for engine categories) ──────────────────
  'flag.allergy': 'Allergy',
  'flag.dietary': 'Dietary',
  'flag.pickup': 'Pickup',
  'flag.medical': 'Medical',

  // ── auth (phase 2) ─────────────────────────────────────────────────────
  'auth.title': 'Sign in',
  'auth.subtitle': 'One account per family. Everything you enter stays with your child’s school.',
  'auth.signUpTitle': 'Create your family account',
  'auth.signUpSubtitle': 'Parents only. Staff accounts are created by the school office.',
  'auth.tab.signIn': 'Sign in',
  'auth.tab.signUp': 'Create account',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.password.help': 'At least 8 characters.',
  'auth.fullName': 'Your full name',
  'auth.fullName.help': 'As the school should address you.',
  'auth.schoolCode': 'School code',
  'auth.schoolCode.help': 'The short code on your invitation. Leave blank if the school gave you none.',
  'auth.submit.signIn': 'Sign in',
  'auth.submit.signUp': 'Create account',
  'auth.working': 'One moment…',
  'auth.signOut': 'Sign out',
  'auth.backToStart': 'Back to the front door',
  'auth.staffNote': 'Teachers and office staff: use the credentials your school issued you.',
  'auth.error.invalid': 'That email and password do not match an account.',
  'auth.error.rateLimited': 'Too many attempts. Please wait a few minutes and try again.',
  'auth.error.server': 'Something went wrong at our end. Please try again.',
  'auth.error.network': 'Could not reach the school. Check your connection and try again.',
  'auth.error.emailTaken': 'An account already exists for that email. Sign in instead.',
  'auth.error.schoolNotFound': 'We could not find that school code. Check it against your invitation.',
  'auth.error.noMembership': 'Your account is not attached to a school yet. Please contact the office.',
  'auth.error.emailInvalid': 'Enter a valid email address.',
  'auth.error.passwordShort': 'Use at least 8 characters.',
  'auth.error.nameRequired': 'Your full name is required.',
  'auth.demo.title': 'Demo mode',
  'auth.demo.body':
    'No database is configured, so there is nothing to sign in to. Every screen below is walkable with seeded records.',
  'auth.demo.parent': 'Open the parent side',
  'auth.demo.teacher': 'Open the teacher side',
  'auth.demo.org': 'Open the organisation side',

  // ── enrolment (phase 2 — real writes) ──────────────────────────────────
  'enrol.saving': 'Saving…',
  'enrol.saved': 'Saved.',
  'enrol.draftResumed': 'Picking up where you left off.',
  'enrol.demoNote': 'Demo mode — this form does not save. Connect a school to keep what you enter.',
  'enrol.stepNotBuilt': 'This step is not built yet. Anything you type here is kept with your draft.',
  'enrol.error.save': 'We could not save that. Please try again.',
  'enrol.error.session': 'Your session has ended. Sign in again to keep your draft.',
  'enrol.error.legalName': 'Please enter the child’s full legal name.',
  'enrol.error.dateOfBirth': 'Please enter a real date of birth.',
  'enrol.error.homeLanguage': 'Please tell us the language spoken at home.',
  'enrol.error.classGroupId': 'Please choose a room.',
  'enrol.error.requestedStartDate': 'That start date is not a real date.',

  // ── empty states (live mode with no rows yet) ──────────────────────────
  'parent.dashboard.empty.title': 'No children on file yet',
  'parent.dashboard.empty.body':
    'Start an enrolment and your child’s record appears here the moment you save the first step.',
  'teacher.today.noRoom.title': 'No room assigned',
  'teacher.today.noRoom.body':
    'Your account is not attached to a class group yet, so there is no register to take. The school office can assign you one.',
  'org.overview.empty': 'No schools in this group yet.',
  // ── common (phase 3) ───────────────────────────────────────────────────
  'common.add': 'Add',
  'common.remove': 'Remove',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.notAnswered': 'Not answered',
  'common.none': 'None',
  'common.edit': 'Edit',
  'common.submit': 'Submit',

  // ── parent · enrolment, phase 3 steps ──────────────────────────────────
  'enrol.subtitle.v3': 'Seven steps and a last look. Everything you enter here becomes the school’s record.',
  'enrol.step.about': 'About your child',
  'enrol.step.about.desc':
    'The things that make them themselves — what they love, what unsettles them, how they meet a new room.',
  'enrol.step.review': 'Review & submit',
  'enrol.step.review.desc': 'Everything you have told us, in one place, before it becomes the record.',

  // about your child
  'enrol.about.likes': 'Things they love',
  'enrol.about.likes.help': 'Add a few. Anything counts — puddles, a song, a particular blanket.',
  'enrol.about.likes.placeholder': 'Type and press Enter',
  'enrol.about.dislikes': 'Things they would rather avoid',
  'enrol.about.dislikes.help': 'Loud hand dryers, sitting still, being rushed — whatever is true.',
  'enrol.about.interests': 'What they are curious about right now',
  'enrol.about.interests.help': 'Diggers, insects, cooking, drawing the same dinosaur every day.',
  'enrol.about.temperament.title': 'How they meet the world',
  'enrol.about.temperament.body':
    'There is no better end of any of these lines. Put your child where they actually are — it helps the room meet them well on the first morning.',
  'enrol.about.axis.settling': 'Settling in',
  'enrol.about.axis.settling.left': 'Settles quickly',
  'enrol.about.axis.settling.right': 'Needs time',
  'enrol.about.axis.company': 'Company',
  'enrol.about.axis.company.left': 'Happy alone',
  'enrol.about.axis.company.right': 'Seeks company',
  'enrol.about.axis.adventure': 'New things',
  'enrol.about.axis.adventure.left': 'Watches first',
  'enrol.about.axis.adventure.right': 'Dives straight in',
  'enrol.about.axis.energy': 'Energy',
  'enrol.about.axis.energy.left': 'Calm and steady',
  'enrol.about.axis.energy.right': 'Big and busy',
  'enrol.about.axis.clear': 'Clear',
  'enrol.about.axis.mid': 'Somewhere in between',
  'enrol.about.notes': 'What should the teacher know about your child?',
  'enrol.about.notes.help': 'In your own words. This is the part teachers read twice.',
  'enrol.about.notes.placeholder':
    'How they say goodbye, what helps when they are upset, anything you would tell a new babysitter…',
  'enrol.about.guruSync': 'Let this help the teacher’s planning assistant',
  'enrol.about.guruSync.help':
    'Your answers help the school’s planning tools suggest activities that suit your child. Untick and this stays with the room staff only.',
  'enrol.about.privacyNote':
    'This page is visible only to your child’s room staff and the school office — never to the group office.',

  // medical & allergies
  'enrol.medical.conditions': 'Conditions the school should know about',
  'enrol.medical.conditions.help': 'Asthma, eczema, epilepsy… add one at a time.',
  'enrol.medical.doctorName': 'Doctor or clinic',
  'enrol.medical.doctorPhone': 'Doctor’s phone number',
  'enrol.medical.emergencyNote': 'Anything staff must do in an emergency',
  'enrol.medical.emergencyNote.help': 'Short and practical. This is read under pressure.',
  'enrol.medical.allergies.title': 'Allergies',
  'enrol.medical.allergies.body':
    'One row per allergen. Severe allergies go on the room’s wall poster automatically.',
  'enrol.medical.allergies.add': 'Add an allergy',
  'enrol.medical.allergies.none': 'No allergies recorded yet.',
  'enrol.medical.allergen': 'Allergen',
  'enrol.medical.allergen.placeholder': 'Peanut, bee sting, penicillin…',
  'enrol.medical.severity': 'Severity',
  'enrol.medical.severity.placeholder': 'Choose',
  'enrol.medical.reaction': 'What happens',
  'enrol.medical.reaction.placeholder': 'Hives, swelling, anaphylaxis…',
  'enrol.medical.responsePlan': 'What staff should do',
  'enrol.medical.responsePlan.placeholder': 'Give the pen from the room cabinet, then call 112…',
  'enrol.medical.epipen': 'Carries adrenaline (EpiPen, Jext, Anapen)',
  'enrol.medical.allergyRow': 'Allergy {n}',

  // dietary
  'enrol.dietary.title': 'Meals',
  'enrol.dietary.body':
    'The kitchen works from this list. One row per requirement — halal, no dairy, vegetarian.',
  'enrol.dietary.add': 'Add a requirement',
  'enrol.dietary.none': 'No dietary requirements recorded yet.',
  'enrol.dietary.label': 'Requirement',
  'enrol.dietary.label.placeholder': 'Halal, no dairy, vegetarian…',
  'enrol.dietary.reason': 'Reason',
  'enrol.dietary.reason.placeholder': 'Choose',
  'enrol.dietary.excluded': 'Foods that must never be served',
  'enrol.dietary.excluded.help': 'Add one at a time. This is the list the kitchen checks.',
  'enrol.dietary.notes': 'Anything else the kitchen should know',
  'enrol.dietary.row': 'Requirement {n}',
  'dietary.reason.allergy': 'Allergy',
  'dietary.reason.medical': 'Medical',
  'dietary.reason.religious': 'Religious',
  'dietary.reason.cultural': 'Cultural',
  'dietary.reason.preference': 'Family preference',

  // previous school
  'enrol.school.none': 'This is their first setting',
  'enrol.school.add': 'Add a setting',
  'enrol.school.empty': 'No previous settings recorded yet.',
  'enrol.school.name': 'Name of the setting',
  'enrol.school.country': 'Country',
  'enrol.school.city': 'Town or city',
  'enrol.school.from': 'From',
  'enrol.school.to': 'Until',
  'enrol.school.notes': 'Anything worth passing on',
  'enrol.school.notes.help': 'Why they moved, how the settling went, a teacher who knew them well.',
  'enrol.school.row': 'Setting {n}',

  // contacts & pickup
  'enrol.contacts.body':
    'Who we call, and in what order. The first person on the list is the first we ring.',
  'enrol.contacts.add': 'Add a person',
  'enrol.contacts.empty': 'No contacts yet — add at least one.',
  'enrol.contacts.name': 'Full name',
  'enrol.contacts.relationship': 'Relationship to the child',
  'enrol.contacts.relationship.placeholder': 'Choose',
  'enrol.contacts.phone': 'Phone number',
  'enrol.contacts.email': 'Email address',
  'enrol.contacts.canCollect': 'May collect the child',
  'enrol.contacts.canCollect.help':
    'Tick only for people you authorise to take your child home unaccompanied.',
  'enrol.contacts.note': 'Note for staff',
  'enrol.contacts.note.placeholder': 'Wednesdays only, arrives by car, calls ahead…',
  'enrol.contacts.row': 'Contact {n}',
  'enrol.contacts.callOrder': 'Call {n}',

  // consents
  'enrol.consents.body':
    'Each of these is a separate answer. Anything you leave unticked is recorded as a refusal, and the school works accordingly.',
  'consent.photography': 'Photographs inside the school',
  'consent.photography.desc':
    'Photos of your child in the room, used in your own updates and in their learning record.',
  'consent.media': 'Public use of photographs',
  'consent.media.desc':
    'Newsletters, the school website, social media. Separate from the answer above, on purpose.',
  'consent.outings': 'Trips and outings',
  'consent.outings.desc': 'Walks, the park, and organised trips away from the building.',
  'consent.emergency_medical': 'Emergency medical treatment',
  'consent.emergency_medical.desc':
    'Staff may seek urgent medical help if you cannot be reached in time.',
  'consent.sunscreen': 'Sun cream and basic first aid',
  'consent.sunscreen.desc': 'Applying sun cream, plasters and cold compresses as needed.',
  'consent.data_processing': 'Keeping your child’s record',
  'consent.data_processing.desc':
    'Holding the information on this form for as long as your child is enrolled.',
  'enrol.consents.sign': 'Type your full name to sign',
  'enrol.consents.sign.help': 'Your name here stands as your signature on this application.',

  // review & submit
  'enrol.review.body':
    'Read it through. Once you submit, the form becomes the school’s record and you can no longer edit it — the office can, and will talk to you first.',
  'enrol.review.section.child': 'Child',
  'enrol.review.section.about': 'About your child',
  'enrol.review.section.medical': 'Medical & allergies',
  'enrol.review.section.dietary': 'Dietary',
  'enrol.review.section.school': 'Previous school',
  'enrol.review.section.contacts': 'Contacts & pickup',
  'enrol.review.section.consents': 'Consents',
  'enrol.review.edit': 'Edit',
  'enrol.review.empty': 'Nothing entered.',
  'enrol.review.submit': 'Submit application',
  'enrol.review.submitting': 'Submitting…',
  'enrol.review.lockNote': 'After submitting, this application is read-only for you.',
  'enrol.review.done.title': 'Your application is with the school',
  'enrol.review.done.body':
    'The office has everything on this form. They will be in touch about a place, and you can still read the whole application from your dashboard.',
  'enrol.review.done.dashboard': 'Back to your dashboard',
  'enrol.review.error.incomplete':
    'Some steps still need attention. Open the ones marked below and finish them first.',
  'enrol.review.demoNote':
    'Demo mode — this summary is built from what you typed in this session, and submitting is switched off.',
  'enrol.review.firstSetting': 'This is their first setting.',

  // step errors (phase 3)
  'enrol.error.temperament': 'Choose a point on the line.',
  'enrol.error.allergies.allergen': 'Name the allergen, or clear the row.',
  'enrol.error.allergies.severity': 'Choose how severe this allergy is.',
  'enrol.error.requirements.label': 'Name the requirement, or clear the row.',
  'enrol.error.requirements.reason': 'Choose a reason.',
  'enrol.error.schools.name': 'Name the setting, or clear the row.',
  'enrol.error.schools.attendedFrom': 'That date is not a real date.',
  'enrol.error.schools.attendedTo': 'The end date must not be before the start date.',
  'enrol.error.contacts': 'Add at least one person we can call.',
  'enrol.error.contacts.fullName': 'Enter this person’s name.',
  'enrol.error.contacts.relationship': 'Choose how they are related to your child.',
  'enrol.error.contacts.phone': 'Enter a phone number we can reach.',
  'enrol.error.contacts.email': 'Enter a valid email address.',
  'enrol.error.signedName': 'Type your full name to sign the application.',
  'enrol.error.submit': 'We could not submit that. Please try again.',
  'enrol.error.tooMany': 'That is more rows than we can keep. Please remove a few.',

  // ── teacher · child insight (phase 3) ──────────────────────────────────
  'teacher.insight.open': 'What to know',
  'teacher.insight.title': 'About {name}',
  'teacher.insight.likes': 'Loves',
  'teacher.insight.dislikes': 'Would rather avoid',
  'teacher.insight.interests': 'Curious about',
  'teacher.insight.temperament': 'How they meet the world',
  'teacher.insight.notes': 'From the family',
  'teacher.insight.empty': 'The family has not filled this in yet.',
  'teacher.insight.privacy':
    'Written by the family for the people in this room. It is not visible at the group office.',

  // ── phase 4 · the teacher's roster ─────────────────────────────────────
  'nav.roster': 'Roster',

  'teacher.roster.title': 'Roster',
  'teacher.roster.subtitle':
    'The children in {room}. Everything the documents print comes from here.',
  'teacher.roster.count': 'Children: {count}',
  'teacher.roster.room': 'Room',
  'teacher.roster.noRoom.title': 'No room assigned yet',
  'teacher.roster.noRoom.body':
    'Ask the office to add you to a class group. Until then there is no roster to show — somebody else’s room would be worse than none.',
  'teacher.roster.empty.title': 'No children yet',
  'teacher.roster.empty.body':
    'Paste your class list below, or add children one at a time. Nothing is saved until you confirm.',
  'teacher.roster.demoBanner':
    'Demo roster — sample children, read-only. Connect a database to enter your own class.',

  'teacher.roster.paste.title': 'Paste your class list',
  'teacher.roster.paste.body':
    'One child per line. A date of birth is optional — “Amara Okonkwo”, “Amara Okonkwo, 2021-03-05” and “Amara Okonkwo, 05/03/2021” all work.',
  'teacher.roster.paste.placeholder': 'Amara Okonkwo, 2021-06-04\nZhang Wei\nSofía Marín, 27/03/2021',
  'teacher.roster.paste.read': 'Read the list',
  'teacher.roster.paste.clear': 'Clear',
  'teacher.roster.paste.dateOrder': 'Read dates as',
  'teacher.roster.paste.dmy': 'Day first — 05/03 is 5 March',
  'teacher.roster.paste.mdy': 'Month first — 05/03 is 3 May',

  'teacher.roster.preview.title': 'Check this before anything is saved',
  'teacher.roster.preview.body':
    'Lines read: {count}. Edit or remove any row — nothing is written until you confirm.',
  'teacher.roster.preview.attention': 'Needs a look: {count}',
  'teacher.roster.preview.name': 'Name',
  'teacher.roster.preview.dob': 'Date of birth',
  'teacher.roster.preview.age': 'Age',
  'teacher.roster.preview.line': 'Line {n}',
  'teacher.roster.preview.confirm': 'Add to the roster ({count})',
  'teacher.roster.preview.cancel': 'Start again',
  'teacher.roster.preview.remove': 'Remove',

  'teacher.roster.issue.no_name': 'No name on this line',
  'teacher.roster.issue.bad_date': 'Could not read the date “{text}”',
  'teacher.roster.issue.ambiguous_date': 'Read as {date} — check the day and month',
  'teacher.roster.issue.future_date': 'That date is in the future',
  'teacher.roster.issue.implausible_age': 'That would make them {years} years old',
  'teacher.roster.issue.duplicate_in_paste': 'Same name earlier in this list',

  'teacher.roster.imported': 'Added {count} to the roster.',
  'teacher.roster.importedSkipped': 'Added {count}. Skipped {skipped} already in this room.',
  'teacher.roster.importedNone': 'Everybody on that list is already in this room.',
  'teacher.roster.importing': 'Adding…',

  'teacher.roster.addChild': 'Add a child',
  'teacher.roster.addChild.save': 'Add child',

  'teacher.roster.open': 'Edit',
  'teacher.roster.close': 'Close',
  'teacher.roster.save': 'Save',
  'teacher.roster.saving': 'Saving…',
  'teacher.roster.saved': 'Saved',
  'teacher.roster.saveError': 'That did not save. Check the fields marked below and try again.',
  'teacher.roster.locked': 'Family record',
  'teacher.roster.locked.body':
    'A family has connected to this child, so their answers are the record now. Ask the office if something here needs to change.',
  'teacher.roster.dobUnknown': 'Not known',
  'teacher.roster.keyboardHint': 'Ctrl+Enter saves · Esc closes',

  'teacher.roster.field.preferredName': 'What the room calls them',
  'teacher.roster.field.legalName': 'Legal name',
  'teacher.roster.field.legalName.help': 'Leave blank to use the name above.',
  'teacher.roster.field.dateOfBirth': 'Date of birth',
  'teacher.roster.field.homeLanguage': 'Language at home',
  'teacher.roster.field.staffNote': 'Staff note',
  'teacher.roster.field.staffNote.help':
    'Your own line about this child. It prints on the class list, and it is never the family’s words.',

  'teacher.roster.allergies': 'Allergies',
  'teacher.roster.allergies.add': 'Add an allergy',
  'teacher.roster.allergies.none': 'No allergies recorded.',
  'teacher.roster.allergyRow': 'Allergy {n}',
  'teacher.roster.epipen': 'Carries an EpiPen',
  'teacher.roster.dietary': 'Meals',
  'teacher.roster.dietary.add': 'Add a requirement',
  'teacher.roster.dietary.none': 'No dietary requirements recorded.',
  'teacher.roster.dietaryRow': 'Requirement {n}',
  'teacher.roster.contacts': 'Contacts & pickup',
  'teacher.roster.contacts.add': 'Add a person',
  'teacher.roster.contacts.none': 'No contacts recorded.',
  'teacher.roster.contactRow': 'Contact {n}',
  'teacher.roster.nothingYet': 'Nothing recorded yet',
  'teacher.roster.error.preferredName': 'Enter the name the room uses for this child.',
  'teacher.roster.error.rows': 'Nothing to import — add at least one name.',

  // ── phase 5 · the document engine ──────────────────────────────────────
  'doc.emergencyContacts': 'Emergency contacts',
  'doc.emergencyContacts.desc': 'Every contact in call order, plus doctor and medical notes.',

  'teacher.documents.open': 'Open',
  'teacher.documents.print': 'Print',
  'teacher.documents.back': 'All documents',
  'teacher.documents.room': 'Room',
  'teacher.documents.goToRoster': 'Open Roster',
  'teacher.documents.needData': 'Add {what} in Roster first',
  'teacher.documents.need.children': 'children',
  'teacher.documents.need.allergies': 'allergies',
  'teacher.documents.need.dietary': 'dietary requirements',
  'teacher.documents.need.contacts': 'contacts',
  'teacher.documents.count.children': 'Children: {count}',
  'teacher.documents.count.allergies': 'Allergies: {count}',
  'teacher.documents.count.epipen': 'EpiPen: {count}',
  'teacher.documents.count.dietary': 'Meals: {count}',
  'teacher.documents.count.collectors': 'Collectors: {count}',
  'teacher.documents.count.contacts': 'Contacts: {count}',
  'teacher.documents.count.missingCollector': 'Nobody to collect: {count}',

  'doc.generatedBy': 'Generated by CMS',
  'doc.generatedOn': 'Generated {date}',
  'doc.printedBy': 'Printed by {name}',
  'doc.empty': 'Nothing to print yet.',
  'doc.none': '—',
  'doc.unknown': 'Not known',
  'doc.age': '{years}y {months}m',
  'doc.ageYears': '{years}y',

  'doc.col.name': 'Name',
  'doc.col.dob': 'Date of birth',
  'doc.col.age': 'Age',
  'doc.col.language': 'Home language',
  'doc.col.allergies': 'Allergies',
  'doc.col.dietary': 'Meals',
  'doc.col.note': 'Note',
  'doc.col.child': 'Child',
  'doc.col.collectors': 'May be collected by',
  'doc.col.phone': 'Phone',
  'doc.col.collectedBy': 'Collected by',
  'doc.col.time': 'Time',
  'doc.col.signature': 'Signature',
  'doc.col.excluded': 'Never serve',
  'doc.col.notes': 'Notes',
  'doc.col.contacts': 'Contacts, in call order',
  'doc.col.medical': 'Doctor & medical',

  'doc.pickup.noCollector': 'NOBODY AUTHORISED — check with the office',
  'doc.pickup.watch': 'Watch',

  'doc.dietary.group': '{label}',
  'doc.dietary.allergyOnly': 'Food allergy, no dietary row on file',
  'doc.dietary.allergyOnly.body':
    'These children have a food allergy but no dietary requirement recorded. The kitchen must still exclude the allergen.',

  'doc.allergyPoster.heading': 'ALLERGY ALERT',
  'doc.allergyPoster.epipen': 'EPIPEN',
  'doc.allergyPoster.reaction': 'Reaction',
  'doc.allergyPoster.plan': 'What to do',
  'doc.allergyPoster.medication': 'Medication kept at',
  'doc.allergyPoster.footer':
    'Severe allergies and children carrying adrenaline only. Every other allergy is on the class list.',

  'doc.emergency.doctor': 'Doctor',
  'doc.emergency.conditions': 'Conditions',
  'doc.emergency.medication': 'Medication on site',
  'doc.emergency.note': 'Emergency note',
  'doc.emergency.canCollect': 'may collect',
  'doc.emergency.restriction': 'MUST NOT COLLECT',
  'doc.emergency.allergy': 'Allergy',

  'doc.labels.cut': 'Cut along the lines',
  'doc.classList.epipen': 'EpiPen',
  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 7 — THE HANDSHAKE: the office, and the doorway into Montree
  // ══════════════════════════════════════════════════════════════════════════
  'layer.office': 'Office',
  'layer.office.role': 'What the school decides',
  'nav.enrollments': 'Enrolments',

  // ── office · the list ──────────────────────────────────────────────────
  'office.enrollments.title': 'Enrolments',
  'office.enrollments.subtitle':
    'Applications waiting on a decision, and the ones already decided.',
  'office.enrollments.waiting': 'Waiting on you',
  'office.enrollments.decided': 'Already decided',
  'office.enrollments.empty.title': 'No applications yet',
  'office.enrollments.empty.body':
    'When a family finishes the enrolment form and submits it, it appears here for the office to accept or decline.',
  'office.stat.waiting': 'Waiting on a decision',
  'office.stat.accepted': 'Accepted',
  'office.stat.connected': 'Connected to Montree',

  'office.status.submitted': 'Submitted',
  'office.status.in_review': 'In review',
  'office.status.accepted': 'Accepted',
  'office.status.declined': 'Declined',
  'office.status.waitlisted': 'Waiting list',
  'office.status.withdrawn': 'Withdrawn',

  'office.steps': '{done} of {total} sections filled in',
  'office.submittedOn': 'Submitted {date}',
  'office.decidedOn': 'Decided {date}',
  'office.startDate': 'Requested start: {date}',
  'office.room.none': 'No room requested',
  'office.family': 'Family',
  'office.family.none': 'No contacts on file',
  'office.review': 'Open',
  'office.dobUnknown': 'Birthday not known',

  // ── office · the Montree link panel (read-only, always) ────────────────
  'office.link.title': 'Montree connection',
  'office.link.connected': 'This school is connected to Montree.',
  'office.link.notConnected': 'This school is not connected to Montree yet.',
  'office.link.rooms': '{linked} of {total} rooms connected',
  'office.link.note':
    'Accepting a family only switches communication on for rooms that are connected. Connecting a school or a room is done for you by Montree — it is not a setting on this page, because it names records in another product that this office cannot see.',
  'office.link.roomBadge': 'Room connected',
  'office.link.roomMissing': 'Room not connected',
  'office.link.childBadge': 'Connected',
  'office.link.invitePending': 'Invite pending',

  // ── office · one application, read-only ────────────────────────────────
  'office.detail.back': 'All enrolments',
  'office.detail.subtitle': 'The application, exactly as the family filled it in.',
  'office.detail.readOnly':
    'Read-only. The office decides on an application; it never edits one — what the family wrote is the record.',
  'office.detail.notFound.title': 'No such application',
  'office.detail.notFound.body':
    'It may have been withdrawn, or it belongs to another school.',
  'office.section.child': 'The child',
  'office.section.about': 'About their child, in the family’s words',
  'office.section.medical': 'Medical',
  'office.section.dietary': 'Dietary',
  'office.section.contacts': 'Contacts and collection',
  'office.section.previous': 'Previous setting',
  'office.section.consents': 'Consents',
  'office.section.settling': 'Settling notes',
  'office.field.legalName': 'Legal name',
  'office.field.preferredName': 'Known as',
  'office.field.dob': 'Date of birth',
  'office.field.homeLanguage': 'Language at home',
  'office.field.room': 'Requested room',
  'office.field.startDate': 'Requested start',
  'office.field.likes': 'Likes',
  'office.field.dislikes': 'Dislikes',
  'office.field.interests': 'Interests',
  'office.field.parentNotes': 'What the teacher should know',
  'office.field.conditions': 'Conditions',
  'office.field.medications': 'Medication',
  'office.field.doctor': 'Doctor',
  'office.field.emergencyNote': 'Emergency note',
  'office.field.reason': 'Reason for leaving',
  'office.field.canCollect': 'May collect',
  'office.field.cannotCollect': 'Must not collect',
  'office.consent.granted': 'Given',
  'office.consent.refused': 'Not given',
  'office.empty': 'Nothing recorded',

  // ── office · the decision ──────────────────────────────────────────────
  'office.decision.title': 'The decision',
  'office.decision.body':
    'Accepting creates this child in Montree, in the connected room, and gives the family the code that opens their Montree parent account.',
  'office.decision.bodyUnlinked':
    'Accepting records the place. Communication cannot be switched on for this family until the school and the room are connected to Montree.',
  'office.decision.accept': 'Accept enrolment',
  'office.decision.decline': 'Decline',
  'office.decision.waitlist': 'Waiting list',
  'office.decision.declineTitle': 'Decline this application',
  'office.decision.noteLabel': 'Reason (optional — kept in the office, never shown to the family)',
  'office.decision.notePlaceholder': 'No space in the three-year-old room until January.',
  'office.decision.confirmDecline': 'Confirm decline',
  'office.decision.cancel': 'Keep it open',
  'office.decision.working': 'Working…',
  'office.decision.declinedNote': 'Office note',

  'office.result.accepted': 'Accepted. This family is now connected to Montree.',
  'office.result.alreadyAccepted': 'Already accepted — nothing changed.',
  'office.result.acceptedUnlinked':
    'Accepted. Communication activation unavailable — this school is not connected to Montree.',
  'office.result.acceptedRoomUnlinked':
    'Accepted. Communication activation unavailable — the requested room is not connected to a Montree classroom.',
  'office.result.invitePending':
    'Accepted, and the child was created in Montree — but the invite code could not be minted. Press Accept again to try for the code; nothing will be duplicated.',
  'office.result.activationFailed':
    'Accepted. Montree could not be reached to switch communication on — press Accept again later.',
  'office.result.declined': 'Declined.',
  'office.result.waitlisted':
    'Moved to the waiting list. Nothing was created in Montree — accepting later still runs the full connection.',
  'office.result.error': 'That did not go through. Nothing was changed.',
  'office.result.demo': 'Demo mode — nothing is written. Connect a database to make decisions real.',
  'office.result.retry': 'Try again',

  'office.code.label': 'Montree invite code',
  'office.code.help':
    'Give this to the family. It opens their Montree parent account — messages with the teacher, reports, photos and calls.',
  'office.code.link': 'Parent entry',

  // ── parent · the doorway into Montree ──────────────────────────────────
  'parent.doorway.messages.heading': 'Your school talks with you through Montree',
  'parent.doorway.messages.body':
    'Messages with your child’s teacher live in Montree, alongside their photos, reports and meetings — one place, not four. Your code below opens it.',
  'parent.doorway.updates.heading': 'Your child’s week is waiting in Montree',
  'parent.doorway.updates.body':
    'Photo films, weekly reports and what your child has been working on are published to your Montree parent account. Your code below opens it.',
  'parent.doorway.codeFor': '{name}’s code',
  'parent.doorway.codeHint': 'Keep it — the same code works every time you sign in.',
  'parent.doorway.cta': 'Open Montree',
  'parent.doorway.step1': 'Tap Open Montree. The link carries your code with it.',
  'parent.doorway.step2':
    'If Montree asks for a code, type the six characters above into the one box on the screen.',
  'parent.doorway.step3':
    'You land on your child’s page — messages, reports and photos are all in there.',
  'parent.doorway.whatYouFind': 'What is waiting for you there',
  'parent.doorway.feature.chat': 'Messages with the teacher',
  'parent.doorway.feature.chatBody':
    'A private thread with your child’s room, answered by the people who are with them all day.',
  'parent.doorway.feature.reports': 'Weekly reports',
  'parent.doorway.feature.reportsBody':
    'What your child chose, practised and mastered this week, written by their teacher.',
  'parent.doorway.feature.photos': 'Photos and films',
  'parent.doorway.feature.photosBody':
    'Photographs from the room and short montages of your child at work, shared only with you.',
  'parent.doorway.feature.calls': 'Meetings and calls',
  'parent.doorway.feature.callsBody':
    'Book a conversation with the teacher — and where your school has calls turned on, join it by video or voice from the same place.',
  'parent.doorway.notReady.title': 'Your school has not switched this on yet',
  'parent.doorway.notReady.body':
    'When the office accepts your enrolment and connects your child’s room, your invite code appears here and this page becomes the way in. Nothing is missing on your side.',
  'parent.doorway.pending.title': 'Almost there',
  'parent.doorway.pending.body':
    'Your place is accepted and your child’s room is connected — the office is finishing your invite code. It will appear here.',
  'parent.doorway.demo':
    'Demo mode — this is what a connected family sees. The code below is not a real one.',
} as const;

export default en;

/** The key set of record. Every dictionary must satisfy this exactly. */
export type Dictionary = Record<keyof typeof en, string>;
export type TranslationKey = keyof typeof en;
