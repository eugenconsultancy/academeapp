// frontend/src/contexts/FontContext.jsx
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
        category: 'sans-serif',
    },
    inter: {
        label: 'Inter',
        family: "'Inter', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Clean & readable',
        category: 'sans-serif',
    },
    poppins: {
        label: 'Poppins',
        family: "'Poppins', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Friendly & rounded',
        category: 'sans-serif',
    },
    dmSans: {
        label: 'DM Sans',
        family: "'DM Sans', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Low contrast & clear',
        category: 'sans-serif',
    },
    plusJakarta: {
        label: 'Plus Jakarta',
        family: "'Plus Jakarta Sans', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Editorial & sharp',
        category: 'sans-serif',
    },
    spaceGrotesk: {
        label: 'Space Grotesk',
        family: "'Space Grotesk', sans-serif",
        google: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
        preview: 'Aa',
        description: 'Technical & bold',
        category: 'sans-serif',
    },
    system: {
        label: 'System Default',
        family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        google: null,
        preview: 'Aa',
        description: 'Your device default font',
        category: 'system',
    },
    // OpenDyslexic is NOT on Google Fonts — mark it as local
    openDyslexic: {
        label: 'OpenDyslexic',
        family: "'OpenDyslexic', sans-serif",
        google: null,
        isLocal: true,
        preview: 'Aa',
        description: 'Dyslexia-friendly',
        category: 'accessibility',
    },
};

/**
 * Font size presets
 */
export const FONT_SIZE_PRESETS = {
    small: { label: 'Small', scale: 0.875, description: 'Compact text' },
    normal: { label: 'Normal', scale: 1, description: 'Default size' },
    large: { label: 'Large', scale: 1.125, description: 'Easier to read' },
    xlarge: { label: 'Extra Large', scale: 1.25, description: 'Maximum readability' },
};

/**
 * Line height presets
 */
export const LINE_HEIGHT_PRESETS = {
    compact: { label: 'Compact', value: 1.4 },
    normal: { label: 'Normal', value: 1.6 },
    comfortable: { label: 'Comfortable', value: 1.8 },
};

// ── Font Loading State ───────────────────────────────────────────────
const loadedFonts = new Set();
const loadingFonts = new Set();

function injectFont(key) {
    if (loadedFonts.has(key) || loadingFonts.has(key)) return;

    const entry = FONT_REGISTRY[key];
    if (!entry || !entry.google) {
        // Local font — already available via @font-face in CSS
        loadedFonts.add(key);
        return;
    }

    loadingFonts.add(key);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = entry.google;
    link.dataset.academeFont = key;

    link.onload = () => {
        loadedFonts.add(key);
        loadingFonts.delete(key);
        window.dispatchEvent(new CustomEvent('font_loaded', { detail: { font: key } }));
    };

    link.onerror = () => {
        loadingFonts.delete(key);
        console.warn(`Failed to load font: ${key}`);
        window.dispatchEvent(new CustomEvent('font_load_error', { detail: { font: key } }));
    };

    document.head.appendChild(link);
}

function applyFont(key) {
    injectFont(key);
    const entry = FONT_REGISTRY[key];
    const family = entry?.family ?? FONT_REGISTRY.sora.family;

    // Use data attribute instead of direct style manipulation
    document.documentElement.dataset.font = key;
    document.documentElement.style.setProperty('--font-body', family);
    document.documentElement.style.setProperty('--font-heading', family);
    document.documentElement.style.setProperty('--font-mono', "'JetBrains Mono', 'Fira Code', monospace");
    document.body.style.fontFamily = family;
}

function applyFontSize(preset) {
    const scale = FONT_SIZE_PRESETS[preset]?.scale ?? 1;
    document.documentElement.style.setProperty('--font-size-scale', scale);
    document.documentElement.style.fontSize = `${scale * 100}%`;
}

function applyLineHeight(preset) {
    const value = LINE_HEIGHT_PRESETS[preset]?.value ?? 1.6;
    document.documentElement.style.setProperty('--line-height', value);
    document.body.style.lineHeight = value;
}

function applyBoldText(enabled) {
    if (enabled) {
        document.body.classList.add('font-bold-mode');
    } else {
        document.body.classList.remove('font-bold-mode');
    }
}

// ═══════════════════════════════════════════════════════════════
// FONT PROVIDER
// ═══════════════════════════════════════════════════════════════

const FontContext = createContext(null);

export function FontProvider({ children }) {
    const [currentFont, setCurrentFont] = useState(() => {
        try { return localStorage.getItem('academe-font') || 'sora'; } catch { return 'sora'; }
    });
    const [currentFontSize, setCurrentFontSize] = useState(() => {
        try { return localStorage.getItem('academe-font-size') || 'normal'; } catch { return 'normal'; }
    });
    const [currentLineHeight, setCurrentLineHeight] = useState(() => {
        try { return localStorage.getItem('academe-line-height') || 'normal'; } catch { return 'normal'; }
    });
    const [boldText, setBoldText] = useState(() => {
        try { return localStorage.getItem('academe-bold-text') === 'true'; } catch { return false; }
    });
    const [isFontLoading, setIsFontLoading] = useState(false);

    useEffect(() => {
        applyFont(currentFont);
        try { localStorage.setItem('academe-font', currentFont); } catch { /* ignore */ }
    }, [currentFont]);

    useEffect(() => {
        applyFontSize(currentFontSize);
        try { localStorage.setItem('academe-font-size', currentFontSize); } catch { /* ignore */ }
    }, [currentFontSize]);

    useEffect(() => {
        applyLineHeight(currentLineHeight);
        try { localStorage.setItem('academe-line-height', currentLineHeight); } catch { /* ignore */ }
    }, [currentLineHeight]);

    useEffect(() => {
        applyBoldText(boldText);
        try { localStorage.setItem('academe-bold-text', String(boldText)); } catch { /* ignore */ }
    }, [boldText]);

    useEffect(() => {
        injectFont('inter');
        injectFont('sora');
        injectFont('system');
    }, []);

    useEffect(() => {
        const handleFontLoad = () => setIsFontLoading(false);
        const handleFontError = () => setIsFontLoading(false);
        window.addEventListener('font_loaded', handleFontLoad);
        window.addEventListener('font_load_error', handleFontError);
        return () => {
            window.removeEventListener('font_loaded', handleFontLoad);
            window.removeEventListener('font_load_error', handleFontError);
        };
    }, []);

    const changeFont = useCallback((key) => {
        if (FONT_REGISTRY[key]) { setIsFontLoading(true); setCurrentFont(key); }
    }, []);

    const changeFontSize = useCallback((preset) => {
        if (FONT_SIZE_PRESETS[preset]) setCurrentFontSize(preset);
    }, []);

    const changeLineHeight = useCallback((preset) => {
        if (LINE_HEIGHT_PRESETS[preset]) setCurrentLineHeight(preset);
    }, []);

    const toggleBoldText = useCallback(() => setBoldText(prev => !prev), []);
    const resetToDefaults = useCallback(() => {
        setCurrentFont('sora');
        setCurrentFontSize('normal');
        setCurrentLineHeight('normal');
        setBoldText(false);
    }, []);

    return (
        <FontContext.Provider
            value={{
                currentFont,
                currentFontData: FONT_REGISTRY[currentFont],
                currentFontSize,
                currentFontSizeData: FONT_SIZE_PRESETS[currentFontSize],
                currentLineHeight,
                currentLineHeightData: LINE_HEIGHT_PRESETS[currentLineHeight],
                boldText,
                isFontLoading,
                fontKeys: Object.keys(FONT_REGISTRY),
                fontRegistry: FONT_REGISTRY,
                fontSizeKeys: Object.keys(FONT_SIZE_PRESETS),
                fontSizeRegistry: FONT_SIZE_PRESETS,
                lineHeightKeys: Object.keys(LINE_HEIGHT_PRESETS),
                lineHeightRegistry: LINE_HEIGHT_PRESETS,
                changeFont,
                changeFontSize,
                changeLineHeight,
                toggleBoldText,
                resetToDefaults,
            }}
        >
            {children}
        </FontContext.Provider>
    );
}

export function useFont() {
    const ctx = useContext(FontContext);
    if (!ctx) throw new Error('useFont must be used within <FontProvider>');
    return ctx;
}

export default FontContext;