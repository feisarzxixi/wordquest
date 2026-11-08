/**
 * WordQuest 视觉主题 Tokens（蓝紫极简冷色调，护眼专为 iPad 横屏打造）
 */

export const THEME = {
  colors: {
    primary: {
      DEFAULT: '#6366F1', // Indigo 500
      hover: '#4F46E5',   // Indigo 600
      light: '#EEF2FF',   // Indigo 50
      dark: '#3730A3',    // Indigo 800
    },
    accent: {
      DEFAULT: '#8B5CF6', // Purple 500
      light: '#F5F3FF',   // Purple 50
    },
    success: {
      DEFAULT: '#10B981', // Emerald 500
      light: '#ECFDF5',   // Emerald 50
      border: '#A7F3D0',
    },
    error: {
      DEFAULT: '#EF4444', // Red 500
      light: '#FEF2F2',   // Red 50
      border: '#FECACA',
    },
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    text: {
      primary: '#0F172A',  // Slate 900
      secondary: '#475569',// Slate 600
      muted: '#94A3B8',    // Slate 400
    },
    border: '#E2E8F0',     // Slate 200
  },
  radius: {
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
  },
  shadow: {
    card: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
    cardHover: '0 10px 25px -3px rgba(99, 102, 241, 0.1), 0 4px 8px -2px rgba(99, 102, 241, 0.04)',
    elevated: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
  },
} as const;
