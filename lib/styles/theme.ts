// lib/styles/theme.ts
// Shared styles matching admin dashboard

export const theme = {
  // Colors from admin dashboard
  colors: {
    primary: '#6366f1', // Indigo-500
    primaryHover: '#4f46e5', // Indigo-600
    secondary: '#8b5cf6', // Purple-500
    success: '#22c55e', // Green-500
    warning: '#f59e0b', // Amber-500
    danger: '#ef4444', // Red-500
    
    bgPrimary: '#f8fafc', // Slate-50
    bgCard: '#ffffff',
    bgDark: '#1e293b', // Slate-800
    
    textPrimary: '#1e293b', // Slate-800
    textSecondary: '#64748b', // Slate-500
    textLight: '#94a3b8', // Slate-400
  },
  
  // Font
  font: "'Comic Sans MS', 'Comic Sans', cursive",
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  
  // Border radius
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  }
};

// CSS class strings for common patterns
export const cardStyles = "bg-white rounded-xl shadow-md p-6 border border-slate-100";
export const buttonPrimary = "px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors";
export const buttonSecondary = "px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors";
export const inputStyles = "w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
export const labelStyles = "block text-sm font-medium text-slate-700 mb-1";
export const headingStyles = "text-2xl font-bold text-slate-800";
export const subheadingStyles = "text-lg font-semibold text-slate-700";

