// frontend/src/components/chat/EmojiPicker.jsx
import React, { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EmojiPicker = ({ onSelect, theme = 'light' }) => {
    const [show, setShow] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShow(false);
            }
        };
        if (show) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [show]);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="p-2 text-xl hover:bg-gray-200 rounded"
                aria-label="Open emoji picker"
            >
                😊
            </button>
            {show && (
                <div className="absolute bottom-12 left-0 z-50">
                    <Picker
                        data={data}
                        onEmojiSelect={(emoji) => {
                            onSelect(emoji);
                            setShow(false);
                        }}
                        theme={theme}
                    />
                </div>
            )}
        </div>
    );
};

export default EmojiPicker;