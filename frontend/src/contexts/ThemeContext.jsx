import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Supported themes: 'light' | 'dark' | 'system'
 * Reading mode: reduces contrast, increases line-height for long-form reading
 */

const ThemeContext = createContext(null);

/* ── helpers ── */
function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme) {
    return theme === 'system' ? getSystemPreference() : theme;
}

function applyTheme(resolved) {
    const root = document.documentElement;
    if (resolved === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
    } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
    }
}

/* ── provider ── */
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('academe-theme') || 'system'; }
        catch { return 'system'; }
    });

    const [readingMode, setReadingMode] = useState(() => {
        try { return localStorage.getItem('academe-reading') === 'true'; }
        catch { return false; }
    });

    /* resolve & apply whenever theme changes or system pref changes */
    useEffect(() => {
        const apply = () => applyTheme(resolveTheme(theme));
        apply();
        try { localStorage.setItem('academe-theme', theme); } catch { /* noop */ }

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', apply);
            return () => mq.removeEventListener('change', apply);
        }
    }, [theme]);

    /* reading mode DOM attribute */
    useEffect(() => {
        document.documentElement.setAttribute('data-reading-mode', String(readingMode));
        try { localStorage.setItem('academe-reading', String(readingMode)); } catch { /* noop */ }
    }, [readingMode]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
    }, []);

    const setExplicitTheme = useCallback((t) => {
        if (['light', 'dark', 'system'].includes(t)) setTheme(t);
    }, []);

    const toggleReadingMode = useCallback(() => {
        setReadingMode(prev => !prev);
    }, []);

    const resolved = resolveTheme(theme);

    return (
        <ThemeContext.Provider value={{
            theme,              // 'light' | 'dark' | 'system'
            resolvedTheme: resolved, // always 'light' | 'dark'
            isDark: resolved === 'dark',
            isLight: resolved === 'light',
            isSystem: theme === 'system',
            readingMode,
            toggleTheme,
            setTheme: setExplicitTheme,
            toggleReadingMode,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within <ThemeProvider>');
    return context;
}