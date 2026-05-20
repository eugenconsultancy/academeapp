import { forwardRef } from 'react';

const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40',
    secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25',
    outline: 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
    'ghost-danger': 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600',
};

const sizes = {
    xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    sm: 'px-3.5 py-2 text-sm rounded-xl gap-2',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
    xl: 'px-8 py-4 text-lg rounded-2xl gap-3',
};

const Button = forwardRef(({
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    icon: Icon = null,
    iconRight: IconRight = null,
    fullWidth = false,
    children,
    ...props
}, ref) => {
    return (
        <button
            ref={ref}
            className={`
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        inline-flex items-center justify-center
        font-semibold tracking-tight
        transition-all duration-200 ease-out
        hover:-translate-y-0.5
        active:translate-y-0 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {Icon && <Icon size={size === 'xs' ? 14 : size === 'sm' ? 15 : 16} className="shrink-0" />}
                    {children}
                    {IconRight && <IconRight size={size === 'xs' ? 14 : size === 'sm' ? 15 : 16} className="shrink-0" />}
                </>
            )}
        </button>
    );
});

Button.displayName = 'Button';
export default Button;