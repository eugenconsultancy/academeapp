// src/components/three/HomepageScene.jsx
import React, {
    useRef,
    useMemo,
    useEffect,
    useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   COLOUR PALETTES per zone (light / dark)
═══════════════════════════════════════════════════════════════ */
const DARK_ZONES = [
    { bg: '#0B1120', accent: '#6366f1', secondary: '#7c3aed' },
    { bg: '#0f1629', accent: '#06b6d4', secondary: '#8b5cf6' },
    { bg: '#0a1f1a', accent: '#10b981', secondary: '#f59e0b' },
    { bg: '#0B1120', accent: '#6366f1', secondary: '#a5b4fc' },
];

const LIGHT_ZONES = [
    { bg: '#f4f5f9', accent: '#4f46e5', secondary: '#7c3aed' },
    { bg: '#f0f4ff', accent: '#0891b2', secondary: '#7c3aed' },
    { bg: '#ecfdf5', accent: '#059669', secondary: '#d97706' },
    { bg: '#f4f5f9', accent: '#4f46e5', secondary: '#a5b4fc' },
];

/* ═══════════════════════════════════════════════════════════════
   PARTICLE FIELD
═══════════════════════════════════════════════════════════════ */
function ParticleField({ count = 1800, scrollProgress, isDark }) {
    const ref = useRef();
    const mouse = useRef([0, 0]);

    const [positions, sizes] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const sz = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 24;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
            sz[i] = Math.random() * 1.5 + 0.3;
        }
        return [pos, sz];
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
        ref.current.rotation.y = Math.sin(t * 0.05) * 0.08 + mouse.current[0] * 0.04;
        ref.current.rotation.x = Math.sin(t * 0.04) * 0.04 + mouse.current[1] * 0.03;
        ref.current.position.y = scrollProgress * -3;
        const breathe = 1 + Math.sin(t * 0.3) * 0.012;
        ref.current.scale.setScalar(breathe);
    });

    return (
        <Points ref={ref} positions={positions} sizes={sizes} stride={3}>
            <PointMaterial
                transparent
                color={isDark ? '#6366f1' : '#4f46e5'}
                size={isDark ? 0.035 : 0.045}
                sizeAttenuation
                depthWrite={false}
                opacity={isDark ? 0.55 : 0.35}
                blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
        </Points>
    );
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING ORBS
═══════════════════════════════════════════════════════════════ */
function FloatingOrb({ position, baseColor, size = 1.4, speed = 0.4, scrollProgress, phaseOffset = 0, isDark }) {
    const ref = useRef();
    const colorRef = useRef(new THREE.Color(baseColor));

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime() * speed + phaseOffset;
        ref.current.position.y = position[1] + Math.sin(t) * 0.4;
        ref.current.position.x = position[0] + Math.cos(t * 0.7) * 0.25;

        const hueShift = scrollProgress * 0.15;
        colorRef.current.setHSL(
            (new THREE.Color(baseColor).getHSL({}).h + hueShift) % 1,
            0.7,
            isDark ? 0.35 : 0.55,
        );
        ref.current.material.color = colorRef.current;
        ref.current.material.opacity = isDark ? 0.13 - scrollProgress * 0.04 : 0.18 - scrollProgress * 0.04;
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[size, 24, 24]} />
            <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={isDark ? 0.13 : 0.18}
                roughness={0.2}
                metalness={0.1}
                depthWrite={false}
                blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
        </mesh>
    );
}

/* ═══════════════════════════════════════════════════════════════
   GRID PLANE
═══════════════════════════════════════════════════════════════ */
function GridPlane({ scrollProgress, isDark }) {
    const ref = useRef();
    useFrame(() => {
        if (!ref.current) return;
        ref.current.material.opacity = Math.max(0, (isDark ? 0.08 : 0.15) - scrollProgress * 0.1);
    });
    return (
        <gridHelper ref={ref} args={[40, 40, isDark ? '#6366f1' : '#4f46e5', isDark ? '#312e81' : '#c7d2fe']} position={[0, -4, 0]}>
            <meshBasicMaterial transparent opacity={isDark ? 0.08 : 0.15} />
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
            mouse.current[0] * 1.2,
            -mouse.current[1] * 0.8 - scrollProgress * 3,
            6,
        );
        camera.position.lerp(target.current, 0.04);
        camera.lookAt(0, -scrollProgress * 1.5, 0);
    });

    return null;
}

/* ═══════════════════════════════════════════════════════════════
   SCENE LIGHTS – adapt to theme
═══════════════════════════════════════════════════════════════ */
function SceneLights({ scrollProgress, isDark }) {
    const ambRef = useRef();
    const ptRef = useRef();
    const zones = isDark ? DARK_ZONES : LIGHT_ZONES;

    useFrame(() => {
        if (!ambRef.current || !ptRef.current) return;
        const zoneF = scrollProgress * 3;
        const zoneIdx = Math.min(Math.floor(zoneF), zones.length - 2);
        const t = zoneF - zoneIdx;
        const ca = new THREE.Color(zones[zoneIdx].accent);
        const cb = new THREE.Color(zones[zoneIdx + 1]?.accent ?? zones[zoneIdx].accent);
        const blended = ca.lerp(cb, t);
        ptRef.current.color.copy(blended);
    });

    return (
        <>
            <ambientLight ref={ambRef} intensity={isDark ? 0.4 : 0.7} color={isDark ? '#1e1b4b' : '#c7d2fe'} />
            <pointLight ref={ptRef} position={[4, 6, 3]} intensity={isDark ? 1.8 : 1.2} color={isDark ? '#6366f1' : '#4f46e5'} />
            <pointLight position={[-5, -3, 2]} intensity={isDark ? 0.6 : 0.8} color={isDark ? '#7c3aed' : '#7c3aed'} />
            <pointLight position={[0, 8, -4]} intensity={isDark ? 0.4 : 0.6} color={isDark ? '#06b6d4' : '#0891b2'} />
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
            const max = document.body.scrollHeight - window.innerHeight;
            setProgress(max > 0 ? window.scrollY / max : 0);
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
        return () => window.removeEventListener('scroll', update);
    }, []);
    return progress;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function HomepageScene({ isMobile = false, isDark = true }) {
    const scrollProgress = useScrollProgress();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return null;

    // Background gradient using CSS custom properties to adapt to theme
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                background: isDark
                    ? `
            radial-gradient(ellipse at 20% 20%, rgba(99,102,241,${0.18 - scrollProgress * 0.08}) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(139,92,246,${0.14 - scrollProgress * 0.06}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(6,182,212,${0.08 + scrollProgress * 0.04}) 0%, transparent 45%),
            linear-gradient(160deg, #0B1120 0%, #0f172a ${40 + scrollProgress * 20}%, #f8fafc ${80 + scrollProgress * 20}%)
          `
                    : `
            radial-gradient(ellipse at 20% 20%, rgba(99,102,241,${0.08 - scrollProgress * 0.04}) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(139,92,246,${0.05 - scrollProgress * 0.02}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(6,182,212,${0.04 + scrollProgress * 0.02}) 0%, transparent 45%),
            linear-gradient(160deg, #f4f5f9 0%, #eef2ff ${40 + scrollProgress * 20}%, #f8fafc ${80 + scrollProgress * 20}%)
          `,
                transition: 'background 0.6s ease',
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 6], fov: 55 }}
                gl={{ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' }}
                dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5)}
                style={{ width: '100%', height: '100%' }}
                frameloop="always"
            >
                <fog attach="fog" args={[isDark ? '#0B1120' : '#f4f5f9', 8, 28]} />
                <SceneLights scrollProgress={scrollProgress} isDark={isDark} />
                <CameraRig scrollProgress={scrollProgress} />

                {isMobile ? (
                    <ParticleField count={500} scrollProgress={scrollProgress} isDark={isDark} />
                ) : (
                    <>
                        <ParticleField count={1800} scrollProgress={scrollProgress} isDark={isDark} />
                        <FloatingOrb position={[-3.5, 1.5, -2]} baseColor={isDark ? '#6366f1' : '#4f46e5'} size={2.2} speed={0.28} scrollProgress={scrollProgress} phaseOffset={0} isDark={isDark} />
                        <FloatingOrb position={[4, -1, -3]} baseColor={isDark ? '#7c3aed' : '#7c3aed'} size={1.8} speed={0.35} scrollProgress={scrollProgress} phaseOffset={2.1} isDark={isDark} />
                        <FloatingOrb position={[1.5, 3, -4]} baseColor={isDark ? '#06b6d4' : '#0891b2'} size={1.2} speed={0.42} scrollProgress={scrollProgress} phaseOffset={4.5} isDark={isDark} />
                        <FloatingOrb position={[-2, -2.5, -1.5]} baseColor={isDark ? '#10b981' : '#059669'} size={0.9} speed={0.55} scrollProgress={scrollProgress} phaseOffset={1.3} isDark={isDark} />
                        <GridPlane scrollProgress={scrollProgress} isDark={isDark} />
                    </>
                )}
            </Canvas>
        </div>
    );
}