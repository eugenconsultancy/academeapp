// src/components/layout/AppLayout.jsx
import React from 'react';

export default function AppLayout({ children }) {
    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Background Watermark Layer */}
            <div className="watermark-overlay">
                <span className="watermark-text">ACADEME</span>
            </div>

            {/* Main Page Content */}
            <main style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </main>
        </div>
    );
}