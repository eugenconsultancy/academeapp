import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Font registry — each entry has a Google Fonts URL + CSS family string.
 * We inject <link> tags into <head> on first use so fonts are loaded on demand.
 */
export const FONT_REGISTRY = {
    sora: {
        label: 'Sora',
        family: "'Sora', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap',
        preview: 'Aa',
        description: 'Modern & geometric',
    },
    inter: {
        label: 'Inter',
        family: "'Inter', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Clean & readable',
    },
    poppins: {
        label: 'Poppins',
        family: "'Poppins', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Friendly & rounded',
    },
    dmSans: {
        label: 'DM Sans',
        family: "'DM Sans', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Low contrast & clear',
    },
    plusJakarta: {
        label: 'Plus Jakarta',
        family: "'Plus Jakarta Sans', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Editorial & sharp',
    },
    spaceGrotesk: {
        label: 'Space Grotesk',
        family: "'Space Grotesk', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Technical & bold',
    },
};

const loadedFonts = new Set();

function injectFont(key) {
    if (loadedFonts.has(key)) return;
    const entry = FONT_REGISTRY[key];
    if (!entry) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = entry.google;
    link.dataset.academeFont = key;
    document.head.appendChild(link);
    loadedFonts.add(key);
}

function applyFont(key) {
    injectFont(key);
    const family = FONT_REGISTRY[key]?.family ?? FONT_REGISTRY.sora.family;
    document.documentElement.style.setProperty('--font-body', family);
    // also write to body directly so non-CSS-var consumers pick it up
    document.body.style.fontFamily = family;
}

const FontContext = createContext(null);

export function FontProvider({ children }) {
    const [currentFont, setCurrentFont] = useState(() => {
        try { return localStorage.getItem('academe-font') || 'sora'; }
        catch { return 'sora'; }
    });

    /* apply on mount + whenever font changes */
    useEffect(() => {
        applyFont(currentFont);
        try { localStorage.setItem('academe-font', currentFont); } catch { /* noop */ }
    }, [currentFont]);

    /* preload Inter on mount so switching is instant */
    useEffect(() => {
        injectFont('inter');
        injectFont('sora');
    }, []);

    const changeFont = useCallback((key) => {
        if (FONT_REGISTRY[key]) setCurrentFont(key);
    }, []);

    return (
        <FontContext.Provider value={{
            currentFont,
            currentFontData: FONT_REGISTRY[currentFont],
            fontKeys: Object.keys(FONT_REGISTRY),
            fontRegistry: FONT_REGISTRY,
            changeFont,
        }}>
            {children}
        </FontContext.Provider>
    );
}

export function useFont() {
    const ctx = useContext(FontContext);
    if (!ctx) throw new Error('useFont must be used within <FontProvider>');
    return ctx;
}