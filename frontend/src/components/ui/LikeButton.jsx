import { useState, useCallback, useEffect } from 'react';
import { FiThumbsUp, FiThumbsDown, FiHeart, FiStar } from 'react-icons/fi';

const REACTION_ICONS = {
    like: FiThumbsUp,
    dislike: FiThumbsDown,
    heart: FiHeart,
    star: FiStar,
};

const REACTION_COLORS = {
    like: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    dislike: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400', hover: 'hover:bg-red-50 dark:hover:bg-red-900/20' },
    heart: { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-400', hover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20' },
    star: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20' },
};

const sizes = {
    sm: 'px-2 py-1 text-xs gap-1 rounded-lg',
    md: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
    lg: 'px-4 py-2 text-sm gap-2 rounded-xl',
};

export default function LikeButton({
    type = 'like',
    active = false,
    count = 0,
    onToggle,
    disabled = false,
    loading = false,
    size = 'md',
    label = '',
    tooltip = '',
    className = '',
}) {
    const [animating, setAnimating] = useState(false);
    const [optimisticCount, setOptimisticCount] = useState(count);
    const [optimisticActive, setOptimisticActive] = useState(active);

    useEffect(() => {
        setOptimisticCount(count);
        setOptimisticActive(active);
    }, [count, active]);

    const Icon = REACTION_ICONS[type] || FiThumbsUp;
    const colors = REACTION_COLORS[type] || REACTION_COLORS.like;
    const displayCount = optimisticCount;
    const isActive = optimisticActive;

    const handleClick = useCallback(async () => {
        if (disabled || loading) return;

        setAnimating(true);
        const newActive = !isActive;
        setOptimisticActive(newActive);
        setOptimisticCount((prev) => (newActive ? prev + 1 : Math.max(0, prev - 1)));

        try {
            if (onToggle) {
                await onToggle(!isActive);
            }
        } catch (error) {
            // Rollback on failure
            setOptimisticActive(isActive);
            setOptimisticCount(count);
        } finally {
            setTimeout(() => setAnimating(false), 300);
        }
    }, [disabled, loading, isActive, count, onToggle]);

    // Build the visual label: always show the text label + count if >0
    const displayLabel = label
        ? displayCount > 0
            ? `${displayCount} ${label}`
            : label
        : displayCount > 0
            ? displayCount
            : '';

    const actionWord = type.charAt(0).toUpperCase() + type.slice(1); // "Like" / "Dislike"
    const title = tooltip || `${isActive ? 'Unlike' : actionWord}${label ? ` ${label}` : ''}`;

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            title={title}
            aria-label={`${isActive ? 'Unlike' : actionWord}${label ? ` ${label}` : ''}. ${displayLabel}`}
            aria-pressed={isActive}
            className={`
        inline-flex items-center font-medium transition-all duration-200
        ${isActive ? `${colors.bg} ${colors.text}` : `text-gray-500 dark:text-gray-400 ${colors.hover}`}
        ${animating ? 'scale-110' : 'scale-100'} 
        ${loading ? 'opacity-70' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size] || sizes.md}
        ${className}
      `.trim()}
        >
            {loading ? (
                <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'fill-current' : ''}`} />
            )}
            <span>{displayLabel}</span>
        </button>
    );
}