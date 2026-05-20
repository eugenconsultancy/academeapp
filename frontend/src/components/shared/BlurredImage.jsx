import { useState } from 'react';

export default function BlurredImage({ src, alt, className = '' }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
                <span className="text-4xl">📄</span>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
            <img
                src={src}
                alt={alt}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{ filter: 'blur(20px)' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs">
                    Sensitive information blurred
                </span>
            </div>
        </div>
    );
}