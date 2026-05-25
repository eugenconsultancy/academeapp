/** @type {import('tailwindcss').Config} */
import tailwindForms from '@tailwindcss/forms';
import tailwindTypography from '@tailwindcss/typography';
import tailwindAspectRatio from '@tailwindcss/aspect-ratio';
import tailwindContainerQueries from '@tailwindcss/container-queries';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,jsx,ts,tsx}',      // ✅ Explicit pages inclusion
    './src/components/**/*.{js,jsx,ts,tsx}',  // ✅ Explicit components inclusion
    './src/layouts/**/*.{js,jsx,ts,tsx}',     // ✅ Explicit layouts inclusion
    './src/contexts/**/*.{js,jsx,ts,tsx}',    // ✅ Explicit contexts inclusion
  ],

  // ═══════════════════════════════════════════════════════
  // SAFELIST - Complete coverage for dynamic classes
  // ═══════════════════════════════════════════════════════
  safelist: [
    // ── Explicit color classes (prevents purging) ──
    'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-300',
    'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600', 'bg-indigo-700',
    'bg-indigo-800', 'bg-indigo-900',

    'bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400',
    'bg-red-500', 'bg-red-600', 'bg-red-700', 'bg-red-800', 'bg-red-900',

    'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300',
    'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700',
    'bg-emerald-800', 'bg-emerald-900',

    'bg-amber-50', 'bg-amber-100', 'bg-amber-200', 'bg-amber-300',
    'bg-amber-400', 'bg-amber-500', 'bg-amber-600', 'bg-amber-700',
    'bg-amber-800', 'bg-amber-900',

    'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400',
    'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900',

    'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400',
    'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900',

    // ── Text colors ──
    'text-indigo-500', 'text-indigo-600', 'text-indigo-700',
    'text-red-500', 'text-red-600', 'text-red-700',
    'text-emerald-500', 'text-emerald-600', 'text-emerald-700',
    'text-amber-500', 'text-amber-600', 'text-amber-700',
    'text-blue-500', 'text-blue-600', 'text-blue-700',
    'text-gray-300', 'text-gray-400', 'text-gray-500', 'text-gray-600',
    'text-gray-700', 'text-gray-800',

    // ── Border colors ──
    'border-indigo-200', 'border-indigo-300', 'border-indigo-500',
    'border-red-200', 'border-red-300', 'border-red-500',
    'border-emerald-200', 'border-emerald-300', 'border-emerald-500',
    'border-amber-200', 'border-amber-300', 'border-amber-500',
    'border-blue-200', 'border-blue-300', 'border-blue-500',
    'border-gray-200', 'border-gray-300', 'border-gray-500',

    // ── Dynamic patterns (complete coverage) ──
    { pattern: /bg-(indigo|red|emerald|amber|blue|gray|slate)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(indigo|red|emerald|amber|blue|gray|slate)-(300|400|500|600|700|800)/ },
    { pattern: /border-(indigo|red|emerald|amber|blue|gray|slate)-(200|300|500|800)/ },

    // ── Status component classes ──
    'status--teal', 'status--amber', 'status--blue', 'status--rose',
    'status--neutral', 'status--indigo',
    'badge--amber', 'badge--teal', 'badge--blue', 'badge--rose', 'badge--neutral',
    'marker--blue', 'marker--amber', 'marker--teal',
    'dot--amber', 'dot--teal', 'dot--blue', 'dot--rose', 'dot--neutral',
    'trend--up', 'trend--down',

    // ── Glass and effect classes ──
    'glass-card', 'glass-panel', 'glass-dropdown',

    // ── Animation delays ──
    'animation-delay-2000', 'animation-delay-4000',

    // ── Form classes (strategy: 'base' now covers these automatically) ──
    'form-input', 'form-select', 'form-checkbox', 'form-radio', 'form-textarea',

    // ── Blog specific classes ──
    'blog-content', 'prose', 'prose-lg', 'prose-invert', 'prose-academe',

    // ── Layout and spacing ──
    'container', 'mx-auto', 'px-4', 'px-6', 'py-4', 'py-8',

    // ── Flex and grid ──
    'flex', 'grid', 'items-center', 'justify-center', 'justify-between',
    'gap-2', 'gap-4', 'gap-6', 'gap-8',

    // ── Typography sizes ──
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
    'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',

    // ── Common utilities ──
    'rounded', 'rounded-lg', 'rounded-xl', 'rounded-full',
    'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl',
    'transition', 'duration-200', 'duration-300', 'ease-in-out',
    'hover:scale-105', 'hover:shadow-lg', 'hover:-translate-y-1',

    // ── Dark mode variants ──
    'dark:bg-gray-800', 'dark:bg-gray-900', 'dark:text-gray-100',
    'dark:text-gray-300', 'dark:border-gray-700',
  ],

  // ═══════════════════════════════════════════════════════
  // DARK MODE
  // ═══════════════════════════════════════════════════════
  darkMode: 'class',

  // ═══════════════════════════════════════════════════════
  // THEME CONFIGURATION
  // ═══════════════════════════════════════════════════════
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        navy: {
          50: '#f0f4fd',
          100: '#e0e8f9',
          200: '#b9ccf2',
          300: '#8aa9e7',
          400: '#5a82d9',
          500: '#3a62c7',
          600: '#2a4ba9',
          700: '#233d89',
          800: '#1e336e',
          900: '#1a2c5c',
          950: '#0f1a3a',
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.82)',
          dark: 'rgba(15, 14, 26, 0.85)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'DM Sans', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
        body: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
      },

      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
      },

      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'full': '9999px',
      },

      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.08), 0 10px 10px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-lg': '0 20px 60px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'inner-glow': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
        'button': '0 4px 14px rgba(99, 102, 241, 0.25)',
        'button-hover': '0 8px 22px rgba(99, 102, 241, 0.40)',
      },

      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'dropdown': '100',
        'sticky': '200',
        'modal-backdrop': '300',
        'modal': '400',
        'tooltip': '500',
        'toast': '600',
        'max': '9999',
      },

      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'glass': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-25%)' },
        },
        'bounce-sm': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10%)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'progress-indeterminate': {
          '0%': { width: '0%', marginLeft: '0' },
          '50%': { width: '70%', marginLeft: '15%' },
          '100%': { width: '0%', marginLeft: '100%' },
        },
        'accent-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out both',
        'fade-in-up': 'fadeInUp 0.4s ease-out both',
        'fade-in-down': 'fadeInDown 0.3s ease-out both',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-down': 'slideDown 0.3s ease-out both',
        'slide-in-left': 'slideInLeft 0.3s ease-out both',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
        'scale-in': 'scaleIn 0.3s ease-out both',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'bounce': 'bounce 1s infinite',
        'bounce-sm': 'bounce-sm 1s infinite',
        'spin': 'spin 1s linear infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'progress': 'progress-indeterminate 1.8s ease-in-out infinite',
        'accent': 'accent-shift 4s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'shake': 'shake 0.3s ease-in-out',
      },

      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
        '4000': '4000ms',
      },

      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-out': 'cubic-bezier(0.5, -0.5, 0.5, 1.5)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },

      opacity: {
        '15': '0.15',
        '35': '0.35',
        '45': '0.45',
        '55': '0.55',
        '65': '0.65',
        '85': '0.85',
      },
    },
  },

  // ═══════════════════════════════════════════════════════
  // PLUGINS - FIXED: Changed strategy to 'base' for automatic styling
  // ═══════════════════════════════════════════════════════
  plugins: [
    tailwindForms({ strategy: 'base' }), // ✅ Changed from 'class' to 'base' for automatic form styling
    tailwindTypography,
    tailwindAspectRatio,
    tailwindContainerQueries,
  ],
};