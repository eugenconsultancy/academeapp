import { useState, useRef, useEffect } from 'react';
import { FiType, FiCheck, FiChevronDown } from 'react-icons/fi';
import { useFont, FONT_REGISTRY } from '../../contexts/FontContext';

export default function FontSelector() {
  const { currentFont, fontKeys, changeFont } = useFont();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const currentData = FONT_REGISTRY[currentFont];

  return (
    <>
      <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');

                .fs-wrap { position: relative; }

                .fs-trigger {
                    display: flex; align-items: center; gap: 6px;
                    height: 38px; padding: 0 10px;
                    border-radius: 10px; border: none;
                    background: transparent; cursor: pointer;
                    color: #6b7280;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.78rem; font-weight: 500;
                    transition: background .15s, transform .12s;
                    white-space: nowrap;
                }
                .fs-trigger:hover {
                    background: rgba(99,102,241,0.08);
                    color: #6366f1;
                    transform: scale(1.04);
                }
                .dark .fs-trigger { color: #9ca3af; }
                .dark .fs-trigger:hover { background: rgba(139,92,246,0.12); color: #a78bfa; }

                .fs-trigger-icon { flex-shrink: 0; }
                .fs-trigger-label { max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
                @media (max-width: 600px) { .fs-trigger-label { display: none; } }

                .fs-chevron {
                    transition: transform .2s;
                    flex-shrink: 0;
                }
                .fs-chevron.open { transform: rotate(180deg); }

                /* ── dropdown panel ── */
                .fs-panel {
                    position: absolute; top: calc(100% + 10px); right: 0;
                    width: 240px;
                    background: rgba(255,255,255,0.97);
                    backdrop-filter: blur(24px) saturate(180%);
                    border: 1px solid rgba(0,0,0,0.08);
                    border-radius: 16px;
                    box-shadow: 0 16px 40px rgba(0,0,0,0.12);
                    overflow: hidden;
                    z-index: 200;
                    animation: fs-drop .16s cubic-bezier(.34,1.2,.64,1);
                    font-family: 'Sora', sans-serif;
                }
                .dark .fs-panel {
                    background: rgba(15,15,28,0.97);
                    border-color: rgba(255,255,255,0.08);
                    box-shadow: 0 16px 40px rgba(0,0,0,0.5);
                }
                @keyframes fs-drop {
                    from { opacity: 0; transform: translateY(-8px) scale(.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }

                .fs-panel-header {
                    padding: 12px 14px 8px;
                    border-bottom: 1px solid rgba(0,0,0,0.06);
                    display: flex; align-items: center; gap: 7px;
                }
                .dark .fs-panel-header { border-bottom-color: rgba(255,255,255,0.06); }
                .fs-panel-title {
                    font-size: 0.72rem; font-weight: 700;
                    letter-spacing: .08em; text-transform: uppercase;
                    color: #9ca3af; margin: 0;
                }

                .fs-list { padding: 6px; }

                .fs-item {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 9px 10px; border-radius: 10px;
                    cursor: pointer; transition: background .12s;
                    border: none; background: transparent; width: 100%;
                    text-align: left;
                }
                .fs-item:hover { background: rgba(99,102,241,0.07); }
                .dark .fs-item:hover { background: rgba(139,92,246,0.1); }
                .fs-item.active {
                    background: rgba(99,102,241,0.1);
                }
                .dark .fs-item.active { background: rgba(139,92,246,0.14); }

                .fs-item-left { display: flex; align-items: center; gap: 10px; }

                .fs-preview-box {
                    width: 36px; height: 36px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(99,102,241,0.08);
                    font-size: 1rem; font-weight: 700; color: #6366f1;
                    flex-shrink: 0; line-height: 1;
                    border: 1px solid rgba(99,102,241,0.1);
                }
                .dark .fs-preview-box {
                    background: rgba(139,92,246,0.1);
                    color: #a78bfa;
                    border-color: rgba(139,92,246,0.15);
                }
                .fs-item.active .fs-preview-box {
                    background: rgba(99,102,241,0.15);
                    border-color: rgba(99,102,241,0.25);
                }

                .fs-item-name {
                    font-size: 0.83rem; font-weight: 600; color: #1f2937;
                    margin-bottom: 1px;
                }
                .dark .fs-item-name { color: #f3f4f6; }
                .fs-item.active .fs-item-name { color: #6366f1; }
                .dark .fs-item.active .fs-item-name { color: #a78bfa; }

                .fs-item-desc {
                    font-size: 0.68rem; color: #9ca3af;
                    font-family: 'DM Sans', sans-serif;
                }

                .fs-check {
                    color: #6366f1; flex-shrink: 0;
                }
                .dark .fs-check { color: #a78bfa; }
            `}</style>

      <div className="fs-wrap" ref={ref}>
        <button
          className="fs-trigger"
          onClick={() => setOpen(v => !v)}
          aria-label="Select font"
          aria-expanded={open}
        >
          <FiType size={15} className="fs-trigger-icon" />
          <span className="fs-trigger-label">{currentData?.label}</span>
          <FiChevronDown size={13} className={`fs-chevron${open ? ' open' : ''}`} />
        </button>

        {open && (
          <div className="fs-panel" role="listbox" aria-label="Font options">
            <div className="fs-panel-header">
              <FiType size={13} style={{ color: '#9ca3af' }} />
              <p className="fs-panel-title">Typography</p>
            </div>

            <div className="fs-list">
              {fontKeys.map(key => {
                const data = FONT_REGISTRY[key];
                const isActive = currentFont === key;
                return (
                  <button
                    key={key}
                    className={`fs-item${isActive ? ' active' : ''}`}
                    onClick={() => { changeFont(key); setOpen(false); }}
                    role="option"
                    aria-selected={isActive}
                  >
                    <div className="fs-item-left">
                      <div
                        className="fs-preview-box"
                        style={{ fontFamily: data.family }}
                      >
                        {data.preview}
                      </div>
                      <div>
                        <p className="fs-item-name">{data.label}</p>
                        <p className="fs-item-desc">{data.description}</p>
                      </div>
                    </div>
                    {isActive && <FiCheck size={15} className="fs-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}