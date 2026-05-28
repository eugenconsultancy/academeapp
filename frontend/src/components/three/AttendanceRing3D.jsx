// src/components/three/AttendanceRing3D.jsx
import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   TORUS RING
═══════════════════════════════════════════════════════════════ */
function TorusArc({ progress, color, glowColor, isDark }) {
    const ringRef = useRef();
    const glowRef = useRef();
    const trackRef = useRef();
    const animProgress = useRef(0);

    useFrame((_, delta) => {
        animProgress.current = THREE.MathUtils.lerp(animProgress.current, progress, delta * 2.2);
        const p = animProgress.current;
        if (ringRef.current) {
            const newGeo = buildArcGeometry(p, 0.9, 0.12, 64);
            ringRef.current.geometry.dispose();
            ringRef.current.geometry = newGeo;
        }
        if (glowRef.current) {
            const newGeo = buildArcGeometry(p, 0.92, 0.18, 64);
            glowRef.current.geometry.dispose();
            glowRef.current.geometry = newGeo;
        }
        if (ringRef.current?.parent) {
            ringRef.current.parent.rotation.z += delta * 0.15;
        }
    });

    const trackColor = isDark ? '#1e1b4b' : '#e2e8f0';
    const trackOpacity = isDark ? 0.5 : 0.7;
    const glowOpacity = isDark ? 0.18 : 0.25;
    const emissiveIntensity = isDark ? (isDark ? 0.6 : 1.2) : 0.2;

    return (
        <group rotation={[0, 0, Math.PI / 2]}>
            {/* Track ring */}
            <mesh ref={trackRef} geometry={buildArcGeometry(1, 0.9, 0.12, 64)}>
                <meshStandardMaterial
                    color={trackColor}
                    transparent
                    opacity={trackOpacity}
                    roughness={0.8}
                    metalness={0}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Glow arc */}
            <mesh ref={glowRef} geometry={buildArcGeometry(progress, 0.92, 0.18, 64)}>
                <meshStandardMaterial
                    color={glowColor}
                    transparent
                    opacity={glowOpacity}
                    roughness={0}
                    metalness={0.5}
                    emissive={glowColor}
                    emissiveIntensity={emissiveIntensity}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
                />
            </mesh>

            {/* Main filled arc */}
            <mesh ref={ringRef} geometry={buildArcGeometry(progress, 0.9, 0.12, 64)}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.1}
                    metalness={0.6}
                    emissive={color}
                    emissiveIntensity={emissiveIntensity}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

function buildArcGeometry(progress, radius = 0.9, tubeRadius = 0.12, segments = 64) {
    const arcSegments = Math.max(3, Math.floor(segments * progress));
    return new THREE.TorusGeometry(radius, tubeRadius, 12, arcSegments, progress * Math.PI * 2);
}

/* ═══════════════════════════════════════════════════════════════
   CENTRE ORB
═══════════════════════════════════════════════════════════════ */
function CentreOrb({ allDone, isDark }) {
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        ref.current.material.emissiveIntensity = allDone
            ? (isDark ? 0.8 : 0.4) + Math.sin(t * 2) * 0.3
            : (isDark ? 0.3 : 0.15) + Math.sin(t * 1.2) * 0.15;
        ref.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.03);
    });
    return (
        <mesh ref={ref}>
            <sphereGeometry args={[0.55, 20, 20]} />
            <meshStandardMaterial
                color={allDone ? '#10b981' : (isDark ? '#1e1b4b' : '#c7d2fe')}
                emissive={allDone ? '#34d399' : (isDark ? '#4f46e5' : '#6366f1')}
                emissiveIntensity={0.4}
                roughness={0.3}
                metalness={0.7}
                transparent
                opacity={0.85}
            />
        </mesh>
    );
}

/* ═══════════════════════════════════════════════════════════════
   COUNT-UP HOOK
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
   SVG FALLBACK – theme‑aware
═══════════════════════════════════════════════════════════════ */
function SVGRingFallback({ attended, total, size, isDark }) {
    const radius = (size - 8) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = total > 0 ? attended / total : 0;
    const count = useCountUp(attended);

    const trackStroke = isDark ? 'rgba(30,27,75,0.5)' : 'rgba(226,232,240,0.8)';
    const fillStroke = isDark ? 'url(#svgRingGrad)' : '#059669';
    const textColor = isDark ? '#fff' : '#0f172a';
    const labelColor = isDark ? 'rgba(255,255,255,0.4)' : '#64748b';

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {isDark && (
                    <defs>
                        <linearGradient id="svgRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                    </defs>
                )}
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackStroke} strokeWidth={6} />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={fillStroke}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${circ * pct} ${circ}`}
                    style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 1,
            }}>
                <span style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: size * 0.22, fontWeight: 800,
                    color: textColor, lineHeight: 1,
                    textShadow: isDark ? '0 0 12px rgba(16,185,129,0.6)' : 'none',
                }}>
                    {count}/{total}
                </span>
                <span style={{
                    fontSize: size * 0.1, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    color: labelColor,
                }}>
                    Classes
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function AttendanceRing3D({ attended = 0, total = 0, size = 96, isDark = true }) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    const progress = total > 0 ? attended / total : 0;
    const allDone = total > 0 && attended >= total;
    const count = useCountUp(attended);

    if (prefersReduced || isMobile) {
        return <SVGRingFallback attended={attended} total={total} size={size} isDark={isDark} />;
    }

    const textColor = isDark ? '#fff' : '#0f172a';
    const labelColor = isDark ? 'rgba(255,255,255,0.4)' : '#64748b';

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <Canvas
                camera={{ position: [0, 0, 2.6], fov: 45 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                dpr={Math.min(window.devicePixelRatio, 1.5)}
                style={{ width: '100%', height: '100%' }}
            >
                <ambientLight intensity={isDark ? 0.6 : 0.8} color={isDark ? '#312e81' : '#c7d2fe'} />
                <pointLight position={[2, 2, 2]} intensity={isDark ? 2 : 1.4} color="#10b981" />
                <pointLight position={[-2, -1, 1]} intensity={isDark ? 0.8 : 0.6} color="#6366f1" />

                <TorusArc progress={progress} color="#10b981" glowColor="#34d399" isDark={isDark} />
                <CentreOrb allDone={allDone} isDark={isDark} />
            </Canvas>

            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', gap: 1,
            }}>
                <span style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: size * 0.21, fontWeight: 800,
                    color: textColor, lineHeight: 1,
                    textShadow: isDark ? '0 0 12px rgba(16,185,129,0.6)' : 'none',
                }}>
                    {count}/{total}
                </span>
                <span style={{
                    fontSize: size * 0.1, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    color: labelColor,
                }}>
                    Classes
                </span>
            </div>
        </div>
    );
}