// src/components/three/HomepageScene.jsx
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Text } from '@react-three/drei';
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
   KNOWLEDGE CONSTELLATION NODES (unused now, kept for reference)
═══════════════════════════════════════════════════════════════ */
function KnowledgeNode({ position, size = 0.08, delay = 0, isDark }) {
    const ref = useRef();
    const connectionRef = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        const pulse = 1 + Math.sin(t * 1.2 + delay) * 0.12;
        ref.current.scale.setScalar(pulse);
        ref.current.material.opacity = (isDark ? 0.7 : 0.6) + Math.sin(t * 0.8 + delay) * 0.15;
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[size, 16, 16]} />
            <meshStandardMaterial
                color={theme.secondary}
                emissive={theme.secondary}
                emissiveIntensity={isDark ? 0.4 : 0.2}
                transparent
                opacity={0.7}
                roughness={0.2}
                metalness={0.6}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}

function ConstellationConnection({ start, end, isDark }) {
    const ref = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;
    const geometry = useMemo(() => {
        const points = new THREE.BufferGeometry();
        points.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...start, ...end]), 3));
        return points;
    }, [start, end]);

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        ref.current.material.opacity = (isDark ? 0.12 : 0.08) + Math.sin(t * 0.6) * 0.04;
    });

    return (
        <line ref={ref} geometry={geometry}>
            <lineBasicMaterial
                color={theme.secondary}
                transparent
                opacity={0.12}
                linewidth={1}
            />
        </line>
    );
}

function KnowledgeConstellation({ scrollProgress, isDark }) {
    const nodePositions = useMemo(() => [
        [-3.5, 1.5, -2],
        [4, -1, -3],
        [1.5, 3, -4],
        [-2, -2.5, -1.5],
        [2.5, 0.5, -2.5],
        [-1.2, 2.2, -3],
    ], []);

    const connections = useMemo(() => [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [0, 4],
        [1, 4],
        [2, 5],
        [4, 5],
    ], []);

    return (
        <group>
            {nodePositions.map((pos, i) => (
                <KnowledgeNode
                    key={`node-${i}`}
                    position={pos}
                    size={0.06 + Math.random() * 0.04}
                    delay={i * 0.3}
                    isDark={isDark}
                />
            ))}
            {connections.map((conn, i) => (
                <ConstellationConnection
                    key={`conn-${i}`}
                    start={nodePositions[conn[0]]}
                    end={nodePositions[conn[1]]}
                    isDark={isDark}
                />
            ))}
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════
   LAYERED PARTICLE FIELD (unused, kept for reference)
═══════════════════════════════════════════════════════════════ */
function AcademicStarfield({ count = 2500, scrollProgress, isDark }) {
    const ref = useRef();
    const mouse = useRef([0, 0]);
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 28;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
        }
        return pos;
    }, [count]);

    useEffect(() => {
        const handleMouse = (e) => {
            mouse.current = [
                (e.clientX / window.innerWidth - 0.5) * 2,
                (e.clientY / window.innerHeight - 0.5) * -2,
            ];
        };
        window.addEventListener('mousemove', handleMouse, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        ref.current.rotation.y = Math.sin(t * 0.03) * 0.06 + mouse.current[0] * 0.03;
        ref.current.rotation.x = Math.sin(t * 0.025) * 0.03 + mouse.current[1] * 0.02;
        ref.current.position.y = scrollProgress * -2.5;
        const breathe = 1 + Math.sin(t * 0.2) * 0.008;
        ref.current.scale.setScalar(breathe);
    });

    return (
        <Points ref={ref} positions={positions} stride={3}>
            <PointMaterial
                transparent
                color={theme.secondary}
                size={isDark ? 0.025 : 0.035}
                sizeAttenuation
                depthWrite={false}
                opacity={isDark ? 0.4 : 0.25}
                blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
        </Points>
    );
}

function ResearchParticles({ count = 300, scrollProgress, isDark }) {
    const ref = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 15 + 3;
            pos[i * 3] = Math.cos(angle) * distance;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
            pos[i * 3 + 2] = Math.sin(angle) * distance - 4;
        }
        return pos;
    }, [count]);

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime();
        ref.current.rotation.z = t * 0.02;
        ref.current.position.y = scrollProgress * -2.5;
    });

    return (
        <Points ref={ref} positions={positions} stride={3}>
            <PointMaterial
                transparent
                color={theme.primary}
                size={isDark ? 0.04 : 0.05}
                sizeAttenuation
                depthWrite={false}
                opacity={isDark ? 0.25 : 0.15}
                blending={THREE.NormalBlending}
            />
        </Points>
    );
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATED ACADEME WORDMARK (unused)
═══════════════════════════════════════════════════════════════ */
function AnimatedAcademe({ scrollProgress, isDark }) {
    const groupRef = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.position.y = -scrollProgress * 2;
        groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.012;
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <mesh position={[0, 0, -0.1]}>
                <planeGeometry args={[8, 1.2]} />
                <meshStandardMaterial
                    color={theme.bg}
                    transparent
                    opacity={0.85}
                    depthWrite={true}
                />
            </mesh>

            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[4.5, 0.35, 0.05]} />
                <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, -0.55, 0.05]}>
                <planeGeometry args={[3.2, 0.02]} />
                <meshStandardMaterial
                    color={theme.secondary}
                    emissive={theme.secondary}
                    emissiveIntensity={isDark ? 0.6 : 0.3}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
}

/* ═══════════════════════════════════════════════════════════════
   RESEARCH BLUEPRINT GRID (unused)
═══════════════════════════════════════════════════════════════ */
function AcademicGrid({ scrollProgress, isDark }) {
    const ref = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    useFrame(() => {
        if (!ref.current) return;
        ref.current.material.opacity = Math.max(
            0,
            (isDark ? 0.06 : 0.04) - scrollProgress * 0.08
        );
    });

    return (
        <gridHelper
            ref={ref}
            args={[48, 48, theme.primary, theme.tertiary]}
            position={[0, -5, 0]}
            rotation={[-Math.PI / 2.4, 0, 0]}
        >
            <meshBasicMaterial
                transparent
                opacity={isDark ? 0.06 : 0.04}
                depthWrite={false}
            />
        </gridHelper>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CAMERA RIG (unused)
═══════════════════════════════════════════════════════════════ */
function CameraRig({ scrollProgress }) {
    const { camera } = useThree();
    const mouse = useRef([0, 0]);
    const target = useRef(new THREE.Vector3());

    useEffect(() => {
        const handleMouse = (e) => {
            mouse.current = [
                (e.clientX / window.innerWidth - 0.5),
                (e.clientY / window.innerHeight - 0.5),
            ];
        };
        window.addEventListener('mousemove', handleMouse, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouse);
    }, []);

    useFrame(() => {
        target.current.set(
            mouse.current[0] * 0.8,
            -mouse.current[1] * 0.5 - scrollProgress * 2.5,
            6.5,
        );
        camera.position.lerp(target.current, 0.035);
        camera.lookAt(0, -scrollProgress * 1.2, 0);
    });

    return null;
}

/* ═══════════════════════════════════════════════════════════════
   ACADEMIC LIGHTING (unused)
═══════════════════════════════════════════════════════════════ */
function AcademicLights({ scrollProgress, isDark }) {
    const ambRef = useRef();
    const ptRef = useRef();
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    useFrame(() => {
        if (!ptRef.current) return;
        const hue = scrollProgress * 0.08;
        ptRef.current.color.setHSL(0.6 + hue, 0.8, 0.55);
    });

    return (
        <>
            <ambientLight
                ref={ambRef}
                intensity={isDark ? 0.35 : 0.6}
                color={theme.tertiary}
            />
            <pointLight
                ref={ptRef}
                position={[4, 6, 3]}
                intensity={isDark ? 1.4 : 1}
                color={theme.secondary}
            />
            <pointLight
                position={[-5, -2, 2]}
                intensity={isDark ? 0.4 : 0.5}
                color={theme.primary}
            />
            <pointLight
                position={[0, 8, -4]}
                intensity={isDark ? 0.25 : 0.35}
                color={theme.secondary}
            />
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL PROGRESS HOOK (kept for potential future use)
═══════════════════════════════════════════════════════════════ */
function useScrollProgress() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const update = () => {
            const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
            setProgress(max > 0 ? window.scrollY / max : 0);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
        return () => window.removeEventListener('scroll', update);
    }, []);
    return progress;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT – NOW A STATIC PLACEHOLDER DIV
   (original 3D scene code left intact for future re-enablement)
═══════════════════════════════════════════════════════════════ */
export default function HomepageScene({ isMobile = false, isDark = true }) {
    // ── PLACEHOLDER: always returns a simple background div ──
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                background: isDark ? '#071226' : '#FAFBFD',
            }}
        />
    );

    /* ── ORIGINAL 3D SCENE (commented out) ──
    const scrollProgress = useScrollProgress();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;
    if (prefersReduced) return null;
    const isMobileDevice = isMobile || window.innerWidth < 640;
    const bgGradient = ...;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: bgGradient, transition: 'background 0.8s ease' }}>
            <Canvas ...>
                <fog ... />
                <AcademicLights ... />
                <CameraRig ... />
                {isMobileDevice ? (
                    <>
                        <AcademicStarfield count={1200} ... />
                        <AnimatedAcademe ... />
                    </>
                ) : (
                    <>
                        <AcademicStarfield count={2500} ... />
                        <ResearchParticles ... />
                        <KnowledgeConstellation ... />
                        <AnimatedAcademe ... />
                        <AcademicGrid ... />
                    </>
                )}
            </Canvas>
        </div>
    );
    ── END ORIGINAL 3D SCENE ── */
}