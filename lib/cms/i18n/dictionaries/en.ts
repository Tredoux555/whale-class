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
  'parent.messages.subtitle': 'One thread per child, with the room staff and the office.',

  // ── parent · updates ───────────────────────────────────────────────────
  'parent.updates.title': 'Updates',
  'parent.updates.subtitle':
    'Photo montages, progress reports and end-of-term summaries, assembled by the engine.',

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
  'doc.classList.desc': 'Every child in the room with room, age and guardian.',
  'doc.pickupSheet': 'Pickup sheet',
  'doc.pickupSheet.desc': 'Who may collect whom today, with authorisation status.',
  'doc.labels': 'Name labels',
  'doc.labels.desc': 'Cubby, tray and coat-hook labels in one printable sheet.',
  'doc.dietarySheet': 'Dietary sheet',
  'doc.dietarySheet.desc': 'Kitchen-facing list of every requirement in the room.',
  'doc.allergyPoster': 'Allergy poster',
  'doc.allergyPoster.desc': 'Wall poster: photo, allergen, severity, response.',
  'doc.medicalSummary': 'Medical summary',
  'doc.medicalSummary.desc': 'Conditions, medication on site and review dates.',

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
} as const;

export default en;

/** The key set of record. Every dictionary must satisfy this exactly. */
export type Dictionary = Record<keyof typeof en, string>;
export type TranslationKey = keyof typeof en;
