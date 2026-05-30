// src/components/three/AttendanceRing3D.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   ACADEMIC THEME TOKENS
═══════════════════════════════════════════════════════════════ */
const ACADEME_THEME = {
    dark: {
        bg: '#071226',
        surface: '#0B1D3A',
        primary: '#4F6BFF',
        secondary: '#7DA8FF',
        tertiary: '#1E3A8A',
        text: '#F8FAFC',
        glow: 'rgba(125,168,255,0.35)',
        ringTrack: '#172554',
        accent: 'rgba(79,107,255,0.15)',
    },
    light: {
        bg: '#FAFBFD',
        surface: '#F1F5F9',
        primary: '#2F4ED8',
        secondary: '#4F6BFF',
        tertiary: '#EEF2FF',
        text: '#0F172A',
        glow: 'rgba(47,78,216,0.18)',
        ringTrack: '#DCE6FF',
        accent: 'rgba(47,78,216,0.08)',
    },
};

/* ═══════════════════════════════════════════════════════════════
   TORUS ARC – RESEARCH RING
═══════════════════════════════════════════════════════════════ */
function TorusArc({ progress, isDark }) {
    const ringRef = useRef();
    const glowRef = useRef();
    const trackRef = useRef();
    const animProgress = useRef(0);
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    // Pre‑build static geometries to avoid re‑creation on each render
    const trackGeo = useMemo(() => new THREE.TorusGeometry(0.9, 0.12, 12, 64, 0, Math.PI * 2), []);
    const arcBaseGeo = useMemo(() => new THREE.TorusGeometry(0.9, 0.12, 12, 64), []);
    const glowBaseGeo = useMemo(() => new THREE.TorusGeometry(0.92, 0.18, 12, 64), []);

    useFrame((_, delta) => {
        animProgress.current = THREE.MathUtils.lerp(animProgress.current, progress, delta * 2.2);
        const p = animProgress.current;

        // Update ring geometry dynamically only when progress changes significantly
        if (ringRef.current && ringRef.current.geometry) {
            const newSegments = Math.max(3, Math.floor(64 * p));
            const newGeo = new THREE.TorusGeometry(0.9, 0.12, 12, newSegments, 0, p * Math.PI * 2);
            ringRef.current.geometry.dispose();
            ringRef.current.geometry = newGeo;
        }

        if (glowRef.current && glowRef.current.geometry) {
            const newSegments = Math.max(3, Math.floor(64 * p));
            const newGeo = new THREE.TorusGeometry(0.92, 0.18, 12, newSegments, 0, p * Math.PI * 2);
            glowRef.current.geometry.dispose();
            glowRef.current.geometry = newGeo;
        }

        // Gentle rotation of the entire ring group
        if (ringRef.current?.parent) {
            ringRef.current.parent.rotation.z += delta * 0.12;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 2]}>
            {/* Track ring – always full circle */}
            <mesh ref={trackRef} geometry={trackGeo}>
                <meshStandardMaterial
                    color={isDark ? theme.ringTrack : theme.ringTrack}
                    transparent
                    opacity={isDark ? 0.6 : 0.75}
                    roughness={0.75}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Glow arc – behind the main ring */}
            <mesh ref={glowRef} geometry={glowBaseGeo}>
                <meshStandardMaterial
                    color={theme.secondary}
                    transparent
                    opacity={isDark ? 0.22 : 0.28}
                    roughness={0}
                    metalness={0.4}
                    emissive={theme.secondary}
                    emissiveIntensity={isDark ? 0.5 : 0.25}
                    side={THREE.DoubleSide}
                    blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
                />
            </mesh>

            {/* Main progress arc */}
            <mesh ref={ringRef} geometry={arcBaseGeo}>
                <meshStandardMaterial
                    color={theme.primary}
                    roughness={0.15}
                    metalness={0.55}
                    emissive={theme.primary}
                    emissiveIntensity={isDark ? 0.45 : 0.2}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════
   KNOWLEDGE CRYSTAL – ICOSAHEDRON CENTRE ORB
═══════════════════════════════════════════════════════════════ */
function KnowledgeCrystal({ allDone, isDark }) {
    const ref = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        ref.current.rotation.x += 0.0008;
        ref.current.rotation.y += 0.0012;
        ref.current.material.emissiveIntensity = allDone
            ? (isDark ? 0.6 : 0.35) + Math.sin(t * 1.8) * 0.25
            : (isDark ? 0.25 : 0.12) + Math.sin(t * 1) * 0.12;
        ref.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.025);
    });

    return (
        <mesh ref={ref}>
            <icosahedronGeometry args={[0.52, 2]} />
            <meshStandardMaterial
                color={allDone ? theme.secondary : theme.tertiary}
                emissive={allDone ? theme.secondary : theme.primary}
                emissiveIntensity={allDone ? 0.5 : 0.25}
                roughness={0.25}
                metalness={0.75}
                transparent
                opacity={isDark ? 0.88 : 0.8}
            />
        </mesh>
    );
}

/* ═══════════════════════════════════════════════════════════════
   COUNT‑UP ANIMATION HOOK
═══════════════════════════════════════════════════════════════ */
function useCountUp(target, duration = 800) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        let start;
        const step = (ts) => {
            if (!start) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            setValue(Math.round(progress * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        const id = requestAnimationFrame(step);
        return () => cancelAnimationFrame(id);
    }, [target, duration]);
    return value;
}

/* ═══════════════════════════════════════════════════════════════
   SVG FALLBACK – ACADEMIC THEMED (for mobile & reduced motion)
═══════════════════════════════════════════════════════════════ */
function SVGRingFallback({ attended, total, size, isDark }) {
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;
    const radius = (size - 8) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = total > 0 ? attended / total : 0;
    const count = useCountUp(attended);

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <defs>
                    <linearGradient id="academeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={theme.secondary} />
                        <stop offset="100%" stopColor={theme.primary} />
                    </linearGradient>
                    <filter id="ringGlow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={theme.ringTrack}
                    strokeWidth={6}
                    opacity={isDark ? 0.6 : 0.75}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#academeRingGrad)"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${circ * pct} ${circ}`}
                    filter="url(#ringGlow)"
                    style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
            </svg>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    pointerEvents: 'none',
                }}
            >
                <span
                    style={{
                        fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
                        fontSize: size * 0.22,
                        fontWeight: 700,
                        color: theme.text,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        textShadow: isDark ? `0 0 8px ${theme.glow}` : 'none',
                    }}
                >
                    {count}/{total}
                </span>
                <span
                    style={{
                        fontSize: size * 0.095,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)',
                        marginTop: 2,
                    }}
                >
                    Classes
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT – ATTENDANCE RING 3D
═══════════════════════════════════════════════════════════════ */
export default function AttendanceRing3D({
    attended = 0,
    total = 0,
    size = 96,
    isDark = true,
}) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const progress = total > 0 ? attended / total : 0;
    const allDone = total > 0 && attended >= total;
    const count = useCountUp(attended);

    // On mobile or reduced motion, use SVG fallback – no WebGL crashes
    if (prefersReduced || isMobile) {
        return (
            <SVGRingFallback
                attended={attended}
                total={total}
                size={size}
                isDark={isDark}
            />
        );
    }

    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <Canvas
                camera={{ position: [0, 0, 2.8], fov: 45 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
                style={{ width: '100%', height: '100%' }}
            >
                <ambientLight intensity={isDark ? 0.5 : 0.7} color={theme.tertiary} />
                <pointLight position={[2, 2, 2.5]} intensity={isDark ? 1.6 : 1.2} color={theme.secondary} />
                <pointLight position={[-2, -1, 1.5]} intensity={isDark ? 0.6 : 0.4} color={theme.primary} />
                <pointLight position={[0, 0, 2]} intensity={isDark ? 0.4 : 0.2} color={theme.tertiary} />
                <TorusArc progress={progress} isDark={isDark} />
                <KnowledgeCrystal allDone={allDone} isDark={isDark} />
            </Canvas>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    gap: 2,
                }}
            >
                <span
                    style={{
                        fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
                        fontSize: size * 0.21,
                        fontWeight: 700,
                        color: theme.text,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        textShadow: isDark ? `0 0 10px ${theme.glow}` : 'none',
                    }}
                >
                    {count}/{total}
                </span>
                <span
                    style={{
                        fontSize: size * 0.095,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)',
                        marginTop: 2,
                    }}
                >
                    Classes
                </span>
            </div>
        </div>
    );
}