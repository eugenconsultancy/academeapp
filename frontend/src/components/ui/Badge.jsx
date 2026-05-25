import { FiX } from 'react-icons/fi';

const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    outline: 'bg-transparent border border-current',
};

const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
};

const dotColors = {
    default: 'bg-gray-400',
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
};

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    icon: Icon = null,
    dot = false,
    dotColor = null,
    dismissible = false,
    onDismiss = null,
    pill = false,
    pulse = false,
    count = null,
}) {
    // Counter badge
    if (count !== null && count !== undefined) {
        return (
            <span
                className={`
                    inline-flex items-center justify-center
                    min-w-[20px] h-5 px-1.5
                    rounded-full text-[11px] font-bold leading-none
                    bg-red-500 text-white
                    ${pulse ? 'animate-pulse' : ''}
                    ${className}
                `}
            >
                {count > 99 ? '99+' : count}
            </span>
        );
    }

    return (
        <span
            className={`
                inline-flex items-center font-medium whitespace-nowrap
                ${pill ? 'rounded-full' : 'rounded-md'}
                ${variants[variant] || variants.default}
                ${sizes[size] || sizes.md}
                ${pulse ? 'animate-pulse' : ''}
                ${dismissible ? 'pr-1.5' : ''}
                ${className}
            `}
        >
            {/* Dot indicator */}
            {dot && (
                <span
                    className={`w-1.5 h-1.5 rounded-full ${dotColor || dotColors[variant] || dotColors.default}`}
                    aria-hidden="true"
                />
            )}

            {/* Icon */}
            {Icon && <Icon size={size === 'xs' ? 10 : size === 'sm' ? 12 : 14} className="shrink-0" />}

            {/* Content */}
            {children}

            {/* Dismiss button */}
            {dismissible && onDismiss && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="Remove"
                >
                    <FiX size={size === 'xs' ? 10 : 12} />
                </button>
            )}
        </span>
    );
}