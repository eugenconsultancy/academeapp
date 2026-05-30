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
   KNOWLEDGE CONSTELLATION NODES
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
   LAYERED PARTICLE FIELD
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
   ANIMATED ACADEME WORDMARK (without external font)
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

            {/* Use a fallback geometry instead of external text to avoid font loading errors */}
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
   RESEARCH BLUEPRINT GRID
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
   CAMERA RIG
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
   ACADEMIC LIGHTING
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
   SCROLL PROGRESS HOOK
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
   MAIN EXPORT – with error boundary fallback
═══════════════════════════════════════════════════════════════ */
export default function HomepageScene({ isMobile = false, isDark = true }) {
    const scrollProgress = useScrollProgress();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const theme = isDark ? ACADEME_THEME.dark : ACADEME_THEME.light;

    // If the user prefers reduced motion, do not render the 3D scene at all
    if (prefersReduced) return null;

    // On small mobile devices, reduce complexity to avoid crashes
    const isMobileDevice = isMobile || window.innerWidth < 640;

    const bgGradient = isDark
        ? `
        radial-gradient(ellipse at 20% 20%, ${theme.accent} 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(30,58,138,0.08) 0%, transparent 45%),
        linear-gradient(160deg, ${theme.bg} 0%, ${theme.surface} ${40 + scrollProgress * 15}%, ${theme.tertiary} ${75 + scrollProgress * 15}%)
      `
        : `
        radial-gradient(ellipse at 20% 20%, ${theme.accent} 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(238,242,255,0.6) 0%, transparent 45%),
        linear-gradient(160deg, ${theme.bg} 0%, #EEF2FF ${40 + scrollProgress * 15}%, #F8FAFC ${75 + scrollProgress * 15}%)
      `;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                background: bgGradient,
                transition: 'background 0.8s ease',
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 6.5], fov: 50 }}
                gl={{
                    antialias: !isMobileDevice,
                    alpha: true,
                    powerPreference: 'high-performance',
                }}
                dpr={isMobileDevice ? 1 : Math.min(window.devicePixelRatio, 1.5)}
                style={{ width: '100%', height: '100%' }}
                frameloop="always"
            >
                <fog
                    attach="fog"
                    args={[isDark ? theme.surface : '#E8EEF8', 10, 32]}
                />

                <AcademicLights scrollProgress={scrollProgress} isDark={isDark} />
                <CameraRig scrollProgress={scrollProgress} />

                {isMobileDevice ? (
                    <>
                        <AcademicStarfield
                            count={1200}
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                        <AnimatedAcademe
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                    </>
                ) : (
                    <>
                        <AcademicStarfield
                            count={2500}
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                        <ResearchParticles
                            count={300}
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                        <KnowledgeConstellation
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                        <AnimatedAcademe
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                        <AcademicGrid
                            scrollProgress={scrollProgress}
                            isDark={isDark}
                        />
                    </>
                )}
            </Canvas>
        </div>
    );
}