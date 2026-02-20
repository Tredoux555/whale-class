// lib/montree/home-theme.ts
// Centralized theme constants for the Montree Home (homeschool parent) experience.
// "Tender Cartography" — botanical specimen plate aesthetic.
// Teachers see NONE of this. Every usage is gated behind isHomeschoolParent().

export const HOME_COLORS = {
  darkTeal: '#0D3330',
  darkTealHover: '#164340',
  emerald: '#4ADE80',
  warmCream: '#FFF8E7',
  softCream: '#F5E6D3',
  nearWhite: '#FFFDF8',
  darkTealBorder: 'rgba(13, 51, 48, 0.2)',
  darkTealBorderStrong: 'rgba(13, 51, 48, 0.5)',
} as const;

// Tailwind class strings for conditional application
export const HOME_THEME = {
  // Header
  headerBg: 'bg-[#0D3330]',

  // Page backgrounds
  pageBg: 'bg-[#FFF8E7]',
  pageBgGradient: 'bg-gradient-to-br from-[#FFF8E7] via-[#F5E6D3]/30 to-[#FFF8E7]',

  // Cards & surfaces
  cardBg: 'bg-[#FFFDF8]',
  sectionBg: 'bg-[#F5E6D3]',
  sectionBgSubtle: 'bg-[#F5E6D3]/50',

  // Buttons
  primaryBtn: 'bg-[#0D3330] hover:bg-[#164340] text-white',
  primaryBtnShadow: 'shadow-lg shadow-[#0D3330]/20',
  secondaryBtn: 'bg-[#F5E6D3] hover:bg-[#EDD5C0] text-[#0D3330]',

  // Text
  headingText: 'text-[#0D3330]',
  subtleText: 'text-[#0D3330]/60',
  accentText: 'text-[#4ADE80]',
  labelText: 'text-[#0D3330]/70',

  // Inputs
  inputBg: 'bg-[#FFFDF8]',
  inputBorder: 'border-[#0D3330]/15',
  inputFocus: 'focus:border-[#0D3330]/40 focus:ring-1 focus:ring-[#0D3330]/20',

  // Borders
  border: 'border-[#0D3330]/10',
  borderStrong: 'border-[#0D3330]/20',

  // Hover states
  hoverBg: 'hover:bg-[#F5E6D3]/50',
  hoverBgStrong: 'hover:bg-[#F5E6D3]',

  // Icons
  guruIcon: '🌿',
  guruIconTeacher: '🔮',

  // Banner / trial
  bannerBg: 'bg-[#F5E6D3] border-[#0D3330]/15',
  bannerText: 'text-[#0D3330]',
} as const;
