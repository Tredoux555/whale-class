// Onboarding configuration for all user types
// Defines step-by-step tutorial flows for each role

export interface OnboardingStep {
  key: string; // Unique identifier: 'click_add_student'
  title: string; // Modal heading: "Add Your First Student"
  description: string; // Modal body text
  targetSelector: string; // CSS selector for arrow positioning: '[data-tutorial="add-student-button"]'
  position: 'top' | 'bottom' | 'left' | 'right'; // Arrow direction
  action?: 'click' | 'hover' | 'none'; // Expected user action
  nextTrigger?: 'manual' | 'automatic'; // Advance on click or button press
}

export interface FeatureModule {
  id: string; // 'student_management'
  name: string; // "Student Management"
  icon: string; // 👨‍🎓
  steps: OnboardingStep[];
  prerequisite?: string; // Another module ID that must complete first
}

export interface OnboardingConfig {
  role: 'teacher' | 'principal' | 'parent' | 'homeschool_parent';
  modules: FeatureModule[];
}

// Teacher onboarding: 5 modules, 15-20 total steps
export const TEACHER_ONBOARDING: OnboardingConfig = {
  role: 'teacher',
  modules: [
    {
      id: 'student_management',
      name: 'Student Management',
      icon: '👨‍🎓',
      steps: [
        {
          key: 'intro_dashboard',
          title: 'Welcome to Your Dashboard',
          description: 'This is your classroom hub. Let\'s add your first student.',
          targetSelector: '[data-tutorial="student-grid"]',
          position: 'bottom',
          action: 'none',
          nextTrigger: 'manual',
        },
        {
          key: 'click_add_student',
          title: 'Add a Student',
          description: 'Click here to add your first student to the class.',
          targetSelector: '[data-tutorial="add-student-button"]',
          position: 'left',
          action: 'click',
          nextTrigger: 'automatic',
        },
        {
          key: 'fill_student_form',
          title: 'Student Details',
          description: 'Enter your student\'s name and age, then click Save.',
          targetSelector: '[data-tutorial="student-form"]',
          position: 'right',
          action: 'none',
          nextTrigger: 'manual',
        },
      ],
    },
    {
      id: 'week_view',
      name: 'Child Week View',
      icon: '📅',
      prerequisite: 'student_management', // Must add student first
      steps: [
        {
          key: 'open_child_week',
          title: 'Track Daily Progress',
          description: 'Click a student to see their weekly focus works.',
          targetSelector: '[data-tutorial="student-card"]:first-child',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
        {
          key: 'view_focus_works',
          title: 'Focus Works',
          description: 'These are the works your student is currently practicing.',
          targetSelector: '[data-tutorial="focus-section"]',
          position: 'bottom',
          action: 'none',
          nextTrigger: 'manual',
        },
      ],
    },
    {
      id: 'curriculum',
      name: 'Curriculum Browser',
      icon: '📚',
      steps: [
        {
          key: 'open_curriculum',
          title: 'Explore the Curriculum',
          description: 'Browse works across 5 Montessori areas.',
          targetSelector: '[data-tutorial="curriculum-link"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
    {
      id: 'photo_capture',
      name: 'Photo Capture',
      icon: '📷',
      steps: [
        {
          key: 'open_capture',
          title: 'Capture Moments',
          description: 'Take photos and videos of your students at work.',
          targetSelector: '[data-tutorial="capture-link"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
    {
      id: 'guru',
      name: 'AI Teacher Advisor',
      icon: '🧠',
      steps: [
        {
          key: 'open_guru',
          title: 'Ask the Guru',
          description: 'Get child development advice from our AI advisor.',
          targetSelector: '[data-tutorial="guru-link"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
  ],
};

// Principal onboarding: 3 modules, 8-10 steps
export const PRINCIPAL_ONBOARDING: OnboardingConfig = {
  role: 'principal',
  modules: [
    {
      id: 'classroom_setup',
      name: 'Classroom Management',
      icon: '🏫',
      steps: [
        {
          key: 'create_classroom',
          title: 'Create a Classroom',
          description: 'Set up your first classroom to get started.',
          targetSelector: '[data-tutorial="create-classroom-button"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
    {
      id: 'teacher_management',
      name: 'Teacher Setup',
      icon: '👩‍🏫',
      steps: [
        {
          key: 'add_teacher',
          title: 'Add Teachers',
          description: 'Generate login codes for your teachers.',
          targetSelector: '[data-tutorial="add-teacher-button"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
    {
      id: 'school_overview',
      name: 'School Dashboard',
      icon: '📊',
      steps: [
        {
          key: 'view_overview',
          title: 'School Overview',
          description: 'See all classrooms and teachers at a glance.',
          targetSelector: '[data-tutorial="overview-section"]',
          position: 'bottom',
          action: 'none',
          nextTrigger: 'manual',
        },
      ],
    },
  ],
};

// Homeschool parent: Same as teacher, with label overrides
export const HOMESCHOOL_PARENT_ONBOARDING: OnboardingConfig = {
  role: 'homeschool_parent',
  modules: TEACHER_ONBOARDING.modules.map(m => ({
    ...m,
    steps: m.steps.map(s => ({
      ...s,
      title: s.title
        .replace('Student', 'Child')
        .replace('student', 'child')
        .replace('Classroom', 'Home')
        .replace('classroom', 'home'),
      description: s.description
        .replace('students', 'children')
        .replace('student', 'child')
        .replace('classroom', 'home'),
    })),
  })),
};

// Parent (view-only): 2 modules, 4-6 steps
export const PARENT_ONBOARDING: OnboardingConfig = {
  role: 'parent',
  modules: [
    {
      id: 'dashboard_overview',
      name: 'Your Child\'s Progress',
      icon: '👶',
      steps: [
        {
          key: 'view_dashboard',
          title: 'Welcome!',
          description: 'See your child\'s current focus works and progress.',
          targetSelector: '[data-tutorial="parent-dashboard"]',
          position: 'bottom',
          action: 'none',
          nextTrigger: 'manual',
        },
      ],
    },
    {
      id: 'reports_photos',
      name: 'Reports & Photos',
      icon: '📸',
      steps: [
        {
          key: 'view_photos',
          title: 'Photo Gallery',
          description: 'Browse photos of your child at work.',
          targetSelector: '[data-tutorial="photos-link"]',
          position: 'bottom',
          action: 'click',
          nextTrigger: 'automatic',
        },
      ],
    },
  ],
};

export function getOnboardingConfig(role: string): OnboardingConfig {
  switch (role) {
    case 'teacher':
      return TEACHER_ONBOARDING;
    case 'principal':
      return PRINCIPAL_ONBOARDING;
    case 'homeschool_parent':
      return HOMESCHOOL_PARENT_ONBOARDING;
    case 'parent':
      return PARENT_ONBOARDING;
    default:
      // Safe fallback — don't crash the app for unknown roles
      console.warn(`[ONBOARDING] Unknown role: ${role}, returning empty config`);
      return { role: 'teacher', modules: [] };
  }
}
