import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Theme Context - Comprehensive theming system
 * 
 * Features:
 * - Light/Dark/System theme modes
 * - Color scheme presets (Ocean, Forest, Sunset, Rose, Monochrome)
 * - Accessibility: High contrast, reduced motion, color blindness filters
 * - Reading mode with optimized typography
 * - Spacing density control
 * - Smooth theme transitions
 * - CSS custom property injection
 */

const ThemeContext = createContext(null);

// ═══════════════════════════════════════════════════════════════
// COLOR SCHEME PRESETS
// ═══════════════════════════════════════════════════════════════

export const COLOR_SCHEMES = {
    default: {
        label: 'Default Indigo',
        description: 'Clean professional blue',
        light: {
            primary: '#4F46E5',
            primaryLight: '#818CF8',
            primaryDark: '#3730A3',
            secondary: '#10B981',
            accent: '#F59E0B',
            background: '#F8FAFC',
            surface: '#FFFFFF',
            text: '#1E293B',
            textSecondary: '#64748B',
            border: '#E2E8F0',
        },
        dark: {
            primary: '#818CF8',
            primaryLight: '#A5B4FC',
            primaryDark: '#4F46E5',
            secondary: '#34D399',
            accent: '#FBBF24',
            background: '#0F172A',
            surface: '#1E293B',
            text: '#F1F5F9',
            textSecondary: '#94A3B8',
            border: '#334155',
        },
    },
    ocean: {
        label: 'Ocean',
        description: 'Calm blue-teal palette',
        light: {
            primary: '#0EA5E9',
            primaryLight: '#38BDF8',
            primaryDark: '#0284C7',
            secondary: '#14B8A6',
            accent: '#06B6D4',
            background: '#F0F9FF',
            surface: '#FFFFFF',
            text: '#0C4A6E',
            textSecondary: '#64748B',
            border: '#E0F2FE',
        },
        dark: {
            primary: '#38BDF8',
            primaryLight: '#7DD3FC',
            primaryDark: '#0EA5E9',
            secondary: '#2DD4BF',
            accent: '#22D3EE',
            background: '#082F49',
            surface: '#0C4A6E',
            text: '#F0F9FF',
            textSecondary: '#94A3B8',
            border: '#164E63',
        },
    },
    forest: {
        label: 'Forest',
        description: 'Natural green tones',
        light: {
            primary: '#16A34A',
            primaryLight: '#4ADE80',
            primaryDark: '#15803D',
            secondary: '#059669',
            accent: '#84CC16',
            background: '#F0FDF4',
            surface: '#FFFFFF',
            text: '#14532D',
            textSecondary: '#64748B',
            border: '#DCFCE7',
        },
        dark: {
            primary: '#4ADE80',
            primaryLight: '#86EFAC',
            primaryDark: '#16A34A',
            secondary: '#34D399',
            accent: '#A3E635',
            background: '#052E16',
            surface: '#14532D',
            text: '#F0FDF4',
            textSecondary: '#94A3B8',
            border: '#166534',
        },
    },
    sunset: {
        label: 'Sunset',
        description: 'Warm orange-red tones',
        light: {
            primary: '#EA580C',
            primaryLight: '#FB923C',
            primaryDark: '#C2410C',
            secondary: '#DC2626',
            accent: '#F59E0B',
            background: '#FFF7ED',
            surface: '#FFFFFF',
            text: '#431407',
            textSecondary: '#64748B',
            border: '#FFEDD5',
        },
        dark: {
            primary: '#FB923C',
            primaryLight: '#FDBA74',
            primaryDark: '#EA580C',
            secondary: '#F87171',
            accent: '#FBBF24',
            background: '#431407',
            surface: '#7C2D12',
            text: '#FFF7ED',
            textSecondary: '#94A3B8',
            border: '#9A3412',
        },
    },
    rose: {
        label: 'Rose',
        description: 'Elegant pink-purple tones',
        light: {
            primary: '#E11D48',
            primaryLight: '#FB7185',
            primaryDark: '#BE123C',
            secondary: '#7C3AED',
            accent: '#EC4899',
            background: '#FFF1F2',
            surface: '#FFFFFF',
            text: '#4C0519',
            textSecondary: '#64748B',
            border: '#FFE4E6',
        },
        dark: {
            primary: '#FB7185',
            primaryLight: '#FDA4AF',
            primaryDark: '#E11D48',
            secondary: '#A78BFA',
            accent: '#F472B6',
            background: '#4C0519',
            surface: '#881337',
            text: '#FFF1F2',
            textSecondary: '#94A3B8',
            border: '#9F1239',
        },
    },
    monochrome: {
        label: 'Monochrome',
        description: 'Clean grayscale',
        light: {
            primary: '#374151',
            primaryLight: '#6B7280',
            primaryDark: '#1F2937',
            secondary: '#4B5563',
            accent: '#9CA3AF',
            background: '#F9FAFB',
            surface: '#FFFFFF',
            text: '#111827',
            textSecondary: '#6B7280',
            border: '#D1D5DB',
        },
        dark: {
            primary: '#9CA3AF',
            primaryLight: '#D1D5DB',
            primaryDark: '#6B7280',
            secondary: '#6B7280',
            accent: '#9CA3AF',
            background: '#111827',
            surface: '#1F2937',
            text: '#F9FAFB',
            textSecondary: '#9CA3AF',
            border: '#374151',
        },
    },
};

// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY FILTERS
// ═══════════════════════════════════════════════════════════════

export const COLOR_BLIND_MODES = {
    none: { label: 'None', filter: '' },
    deuteranopia: { label: 'Deuteranopia (Red-Green)', filter: 'url(#deuteranopia)' },
    protanopia: { label: 'Protanopia (Red-Green)', filter: 'url(#protanopia)' },
    tritanopia: { label: 'Tritanopia (Blue-Yellow)', filter: 'url(#tritanopia)' },
    achromatopsia: { label: 'Achromatopsia (Grayscale)', filter: 'grayscale(100%)' },
};

// ═══════════════════════════════════════════════════════════════
// SPACING DENSITY
// ═══════════════════════════════════════════════════════════════

export const SPACING_DENSITY = {
    compact: { label: 'Compact', padding: '0.5rem', gap: '0.5rem', radius: '0.25rem' },
    comfortable: { label: 'Comfortable', padding: '1rem', gap: '1rem', radius: '0.5rem' },
    spacious: { label: 'Spacious', padding: '1.5rem', gap: '1.5rem', radius: '0.75rem' },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getSystemPreference() {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme) {
    return theme === 'system' ? getSystemPreference() : theme;
}

/**
 * Inject CSS custom properties from color scheme
 */
function applyColorScheme(scheme, resolved) {
    const colors = COLOR_SCHEMES[scheme]?.[resolved] || COLOR_SCHEMES.default[resolved];
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
    });

    // Also set shorthand properties
    root.style.setProperty('--color-bg', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text', colors.text);
}

/**
 * Apply theme class and data attributes
 */
function applyThemeMode(resolved) {
    const root = document.documentElement;

    // Add transition class for smooth theme switch
    root.classList.add('theme-transitioning');

    if (resolved === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
    } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
    }

    // Remove transition class after animation completes
    setTimeout(() => {
        root.classList.remove('theme-transitioning');
    }, 400);
}

/**
 * Apply accessibility filters
 */
function applyColorBlindFilter(filter) {
    const root = document.documentElement;
    if (filter) {
        root.style.filter = filter;
    } else {
        root.style.filter = '';
    }
}

/**
 * Apply high contrast mode
 */
function applyHighContrast(enabled) {
    const root = document.documentElement;
    if (enabled) {
        root.classList.add('high-contrast');
        root.setAttribute('data-high-contrast', 'true');
    } else {
        root.classList.remove('high-contrast');
        root.setAttribute('data-high-contrast', 'false');
    }
}

/**
 * Apply reduced motion
 */
function applyReducedMotion(enabled) {
    const root = document.documentElement;
    if (enabled) {
        root.classList.add('reduce-motion');
        root.setAttribute('data-reduce-motion', 'true');
    } else {
        root.classList.remove('reduce-motion');
        root.setAttribute('data-reduce-motion', 'false');
    }
}

/**
 * Apply reduced transparency
 */
function applyReducedTransparency(enabled) {
    const root = document.documentElement;
    if (enabled) {
        root.classList.add('reduce-transparency');
        root.setAttribute('data-reduce-transparency', 'true');
    } else {
        root.classList.remove('reduce-transparency');
        root.setAttribute('data-reduce-transparency', 'false');
    }
}

/**
 * Apply spacing density
 */
function applySpacingDensity(density) {
    const spacing = SPACING_DENSITY[density] || SPACING_DENSITY.comfortable;
    const root = document.documentElement;

    root.style.setProperty('--spacing-padding', spacing.padding);
    root.style.setProperty('--spacing-gap', spacing.gap);
    root.style.setProperty('--spacing-radius', spacing.radius);
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function ThemeProvider({ children }) {
    // ── Theme mode: 'light' | 'dark' | 'system' ──────────────
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('academe-theme') || 'system';
        } catch {
            return 'system';
        }
    });

    // ── Color scheme preset ──────────────────────────────────
    const [colorScheme, setColorScheme] = useState(() => {
        try {
            return localStorage.getItem('academe-color-scheme') || 'default';
        } catch {
            return 'default';
        }
    });

    // ── Reading mode ─────────────────────────────────────────
    const [readingMode, setReadingMode] = useState(() => {
        try {
            return localStorage.getItem('academe-reading') === 'true';
        } catch {
            return false;
        }
    });

    // ── High contrast mode ───────────────────────────────────
    const [highContrast, setHighContrast] = useState(() => {
        try {
            return localStorage.getItem('academe-high-contrast') === 'true';
        } catch {
            return false;
        }
    });

    // ── Reduced motion ───────────────────────────────────────
    const [reducedMotion, setReducedMotion] = useState(() => {
        try {
            const saved = localStorage.getItem('academe-reduce-motion');
            if (saved !== null) return saved === 'true';
            // Respect system preference
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            return false;
        }
    });

    // ── Reduced transparency ─────────────────────────────────
    const [reducedTransparency, setReducedTransparency] = useState(() => {
        try {
            return localStorage.getItem('academe-reduce-transparency') === 'true';
        } catch {
            return false;
        }
    });

    // ── Color blind mode ─────────────────────────────────────
    const [colorBlindMode, setColorBlindMode] = useState(() => {
        try {
            return localStorage.getItem('academe-color-blind') || 'none';
        } catch {
            return 'none';
        }
    });

    // ── Spacing density ──────────────────────────────────────
    const [spacingDensity, setSpacingDensity] = useState(() => {
        try {
            return localStorage.getItem('academe-spacing') || 'comfortable';
        } catch {
            return 'comfortable';
        }
    });

    // ── Monochrome mode ──────────────────────────────────────
    const [monochrome, setMonochrome] = useState(() => {
        try {
            return localStorage.getItem('academe-monochrome') === 'true';
        } catch {
            return false;
        }
    });

    // ── Sepia mode ───────────────────────────────────────────
    const [sepia, setSepia] = useState(() => {
        try {
            return localStorage.getItem('academe-sepia') === 'true';
        } catch {
            return false;
        }
    });

    // Resolved theme (always 'light' or 'dark')
    const resolved = resolveTheme(theme);

    // ═════════════════════════════════════════════════════════
    // EFFECTS
    // ═════════════════════════════════════════════════════════

    // Apply theme mode
    useEffect(() => {
        applyThemeMode(resolved);
        try {
            localStorage.setItem('academe-theme', theme);
        } catch {
            // Ignore
        }

        // Listen for system preference changes when in system mode
        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = () => applyThemeMode(getSystemPreference());
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
    }, [theme, resolved]);

    // Apply color scheme
    useEffect(() => {
        applyColorScheme(colorScheme, resolved);
        try {
            localStorage.setItem('academe-color-scheme', colorScheme);
        } catch {
            // Ignore
        }
    }, [colorScheme, resolved]);

    // Apply reading mode
    useEffect(() => {
        document.documentElement.setAttribute('data-reading-mode', String(readingMode));
        try {
            localStorage.setItem('academe-reading', String(readingMode));
        } catch {
            // Ignore
        }
    }, [readingMode]);

    // Apply high contrast
    useEffect(() => {
        applyHighContrast(highContrast);
        try {
            localStorage.setItem('academe-high-contrast', String(highContrast));
        } catch {
            // Ignore
        }
    }, [highContrast]);

    // Apply reduced motion
    useEffect(() => {
        applyReducedMotion(reducedMotion);
        try {
            localStorage.setItem('academe-reduce-motion', String(reducedMotion));
        } catch {
            // Ignore
        }
    }, [reducedMotion]);

    // Apply reduced transparency
    useEffect(() => {
        applyReducedTransparency(reducedTransparency);
        try {
            localStorage.setItem('academe-reduce-transparency', String(reducedTransparency));
        } catch {
            // Ignore
        }
    }, [reducedTransparency]);

    // Apply color blind filter
    useEffect(() => {
        const mode = COLOR_BLIND_MODES[colorBlindMode];
        applyColorBlindFilter(mode?.filter || '');
        try {
            localStorage.setItem('academe-color-blind', colorBlindMode);
        } catch {
            // Ignore
        }
    }, [colorBlindMode]);

    // Apply spacing density
    useEffect(() => {
        applySpacingDensity(spacingDensity);
        try {
            localStorage.setItem('academe-spacing', spacingDensity);
        } catch {
            // Ignore
        }
    }, [spacingDensity]);

    // Apply monochrome
    useEffect(() => {
        if (monochrome) {
            document.documentElement.classList.add('monochrome');
        } else {
            document.documentElement.classList.remove('monochrome');
        }
        try {
            localStorage.setItem('academe-monochrome', String(monochrome));
        } catch {
            // Ignore
        }
    }, [monochrome]);

    // Apply sepia
    useEffect(() => {
        if (sepia) {
            document.documentElement.classList.add('sepia');
        } else {
            document.documentElement.classList.remove('sepia');
        }
        try {
            localStorage.setItem('academe-sepia', String(sepia));
        } catch {
            // Ignore
        }
    }, [sepia]);

    // ═════════════════════════════════════════════════════════
    // ACTIONS
    // ═════════════════════════════════════════════════════════

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
    }, []);

    const setExplicitTheme = useCallback((t) => {
        if (['light', 'dark', 'system'].includes(t)) setTheme(t);
    }, []);

    const changeColorScheme = useCallback((scheme) => {
        if (COLOR_SCHEMES[scheme]) setColorScheme(scheme);
    }, []);

    const toggleReadingMode = useCallback(() => {
        setReadingMode((prev) => !prev);
    }, []);

    const toggleHighContrast = useCallback(() => {
        setHighContrast((prev) => !prev);
    }, []);

    const toggleReducedMotion = useCallback(() => {
        setReducedMotion((prev) => !prev);
    }, []);

    const toggleReducedTransparency = useCallback(() => {
        setReducedTransparency((prev) => !prev);
    }, []);

    const changeColorBlindMode = useCallback((mode) => {
        if (COLOR_BLIND_MODES[mode]) setColorBlindMode(mode);
    }, []);

    const changeSpacingDensity = useCallback((density) => {
        if (SPACING_DENSITY[density]) setSpacingDensity(density);
    }, []);

    const toggleMonochrome = useCallback(() => {
        setMonochrome((prev) => !prev);
    }, []);

    const toggleSepia = useCallback(() => {
        setSepia((prev) => !prev);
    }, []);

    const resetToDefaults = useCallback(() => {
        setTheme('system');
        setColorScheme('default');
        setReadingMode(false);
        setHighContrast(false);
        setReducedMotion(false);
        setReducedTransparency(false);
        setColorBlindMode('none');
        setSpacingDensity('comfortable');
        setMonochrome(false);
        setSepia(false);
    }, []);

    // ═════════════════════════════════════════════════════════
    // CONTEXT VALUE
    // ═════════════════════════════════════════════════════════

    const value = useMemo(
        () => ({
            // Theme mode
            theme,
            resolvedTheme: resolved,
            isDark: resolved === 'dark',
            isLight: resolved === 'light',
            isSystem: theme === 'system',

            // Color scheme
            colorScheme,
            colorSchemeData: COLOR_SCHEMES[colorScheme],
            availableColorSchemes: Object.keys(COLOR_SCHEMES),
            colorSchemeRegistry: COLOR_SCHEMES,

            // Accessibility
            readingMode,
            highContrast,
            reducedMotion,
            reducedTransparency,
            colorBlindMode,
            colorBlindModeData: COLOR_BLIND_MODES[colorBlindMode],
            availableColorBlindModes: Object.keys(COLOR_BLIND_MODES),
            colorBlindRegistry: COLOR_BLIND_MODES,

            // Display
            monochrome,
            sepia,

            // Layout
            spacingDensity,
            spacingDensityData: SPACING_DENSITY[spacingDensity],
            availableSpacingDensities: Object.keys(SPACING_DENSITY),
            spacingRegistry: SPACING_DENSITY,

            // Actions
            toggleTheme,
            setTheme: setExplicitTheme,
            changeColorScheme,
            toggleReadingMode,
            toggleHighContrast,
            toggleReducedMotion,
            toggleReducedTransparency,
            changeColorBlindMode,
            changeSpacingDensity,
            toggleMonochrome,
            toggleSepia,
            resetToDefaults,
        }),
        [
            theme, resolved, colorScheme, readingMode, highContrast,
            reducedMotion, reducedTransparency, colorBlindMode,
            spacingDensity, monochrome, sepia,
            toggleTheme, setExplicitTheme, changeColorScheme,
            toggleReadingMode, toggleHighContrast, toggleReducedMotion,
            toggleReducedTransparency, changeColorBlindMode,
            changeSpacingDensity, toggleMonochrome, toggleSepia,
            resetToDefaults,
        ]
    );

    return (
        <ThemeContext.Provider value={value}>
            {/* SVG Filters for Color Blindness */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', width: 0, height: 0 }}
                aria-hidden="true"
            >
                <filter id="deuteranopia">
                    <feColorMatrix
                        type="matrix"
                        values="0.625 0.375 0 0 0
                                0.7   0.3   0 0 0
                                0     0.3   0.7 0 0
                                0     0     0   1 0"
                    />
                </filter>
                <filter id="protanopia">
                    <feColorMatrix
                        type="matrix"
                        values="0.567 0.433 0 0 0
                                0.558 0.442 0 0 0
                                0     0.242 0.758 0 0
                                0     0     0     1 0"
                    />
                </filter>
                <filter id="tritanopia">
                    <feColorMatrix
                        type="matrix"
                        values="0.95  0.05  0     0 0
                                0     0.433 0.567 0 0
                                0     0.475 0.525 0 0
                                0     0     0     1 0"
                    />
                </filter>
            </svg>
            {children}
        </ThemeContext.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within <ThemeProvider>');
    return context;
}

export default ThemeContext;