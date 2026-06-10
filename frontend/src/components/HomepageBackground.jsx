// src/components/HomepageBackground.jsx - Simple background component
import React from 'react';

export default function HomepageBackground({ isDark = true }) {
  const bgColor = isDark ? '#060810' : '#F8F7FF';
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: bgColor, transition: 'background 0.3s ease' }} />
  );
}
