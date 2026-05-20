import { useTheme } from '../../contexts/ThemeContext';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

const CYCLE = ['light', 'dark', 'system'];
const ICONS = {
    light: { Icon: FiSun, label: 'Light mode', color: '#f59e0b' },
    dark: { Icon: FiMoon, label: 'Dark mode', color: '#818cf8' },
    system: { Icon: FiMonitor, label: 'System mode', color: '#6b7280' },
};

export default function ThemeSwitcher() {
    const { theme, setTheme, isDark } = useTheme();
    const { Icon, label, color } = ICONS[theme] ?? ICONS.system;

    const handleClick = () => {
        const idx = CYCLE.indexOf(theme);
        setTheme(CYCLE[(idx + 1) % CYCLE.length]);
    };

    return (
        <>
            <style>{`
                .ts-btn {
                    position: relative;
                    display: flex; align-items: center; justify-content: center;
                    width: 38px; height: 38px;
                    border-radius: 10px; border: none;
                    background: transparent;
                    cursor: pointer;
                    color: #6b7280;
                    transition: background .15s, transform .12s;
                    overflow: hidden;
                }
                .ts-btn:hover {
                    background: rgba(99,102,241,0.08);
                    transform: scale(1.08);
                }
                .dark .ts-btn:hover { background: rgba(139,92,246,0.12); }

                /* pill indicator under icon */
                .ts-indicator {
                    position: absolute; bottom: 5px;
                    width: 4px; height: 4px; border-radius: 50%;
                    transition: background .3s;
                }

                /* icon swap animation */
                .ts-icon {
                    transition: opacity .2s, transform .2s;
                    animation: ts-pop .25s cubic-bezier(.34,1.56,.64,1);
                }
                @keyframes ts-pop {
                    from { opacity: 0; transform: scale(.6) rotate(-30deg); }
                    to   { opacity: 1; transform: scale(1) rotate(0deg); }
                }

                /* tooltip */
                .ts-tooltip {
                    position: absolute; bottom: calc(100% + 8px); left: 50%;
                    transform: translateX(-50%);
                    background: #1f2937;
                    color: #f9fafb;
                    font-size: 0.7rem; font-weight: 500;
                    padding: 4px 9px; border-radius: 7px;
                    white-space: nowrap; pointer-events: none;
                    opacity: 0; transition: opacity .15s;
                    font-family: 'Sora', sans-serif;
                    z-index: 100;
                }
                .dark .ts-tooltip { background: #374151; }
                .ts-btn:hover .ts-tooltip { opacity: 1; }
                .ts-tooltip::after {
                    content: '';
                    position: absolute; top: 100%; left: 50%;
                    transform: translateX(-50%);
                    border: 4px solid transparent;
                    border-top-color: #1f2937;
                }
                .dark .ts-tooltip::after { border-top-color: #374151; }
            `}</style>

            <button
                className="ts-btn"
                onClick={handleClick}
                aria-label={label}
                title={label}
                key={theme} /* remount triggers animation */
            >
                <span className="ts-tooltip">{label}</span>
                <Icon
                    className="ts-icon"
                    size={18}
                    style={{ color }}
                />
                <span
                    className="ts-indicator"
                    style={{ background: color }}
                />
            </button>
        </>
    );
}