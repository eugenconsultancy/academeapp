import { useState } from 'react';
import { FiThumbsUp } from 'react-icons/fi';

export default function LikeButton({ liked = false, count = 0, onToggle, disabled = false }) {
    const [animating, setAnimating] = useState(false);

    const handleClick = () => {
        if (disabled) return;
        setAnimating(true);
        onToggle?.();
        setTimeout(() => setAnimating(false), 300);
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        transition-all duration-200
        ${liked
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }
        ${animating ? 'scale-125' : 'scale-100'}
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
        >
            <FiThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{count}</span>
        </button>
    );
}