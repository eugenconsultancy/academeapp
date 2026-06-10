// src/components/AttendanceRing.jsx - Simple, lightweight attendance ring component
import React from 'react';

export default function AttendanceRing({ attended = 0, total = 0, size = 88, isDark = true }) {
  const percentage = total > 0 ? (attended / total) * 100 : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const ringColor = isDark ? '#6366f1' : '#4f46e5';
  const trackColor = isDark ? 'rgba(99,102,241,0.2)' : 'rgba(79,70,229,0.15)';
  const textColor = isDark ? '#f1f5f9' : '#111827';
  
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor} strokeWidth={4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, pointerEvents: 'none' }}>
        <span style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", fontSize: size * 0.22, fontWeight: 700, color: textColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {attended}/{total}
        </span>
        <span style={{ fontSize: size * 0.095, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.6)', marginTop: 2 }}>
          Classes
        </span>
      </div>
    </div>
  );
}
