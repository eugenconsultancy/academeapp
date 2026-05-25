// ── Constants ────────────────────────────────────────────────────────────

const SCHOOL_HOLIDAYS_KE = [
    '01-01', // New Year's Day
    '04-07', // Good Friday (approximate)
    '04-10', // Easter Monday (approximate)
    '05-01', // Labour Day
    '06-01', // Madaraka Day
    '08-08', // General Election (every 5 years)
    '10-10', // Utamaduni Day (Moi Day)
    '10-20', // Mashujaa Day
    '12-12', // Jamhuri Day
    '12-25', // Christmas Day
    '12-26', // Boxing Day
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Time Formatting ───────────────────────────────────────────────────────

/**
 * Format time as HH:MM
 * @param {string|Date} time - Time string or Date object
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted time
 */
export function formatTime(time, locale = 'en-US') {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format time in 24-hour format
 */
export function formatTime24(time) {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

/**
 * Format date as full readable string
 * @param {string|Date} date - Date string or Date object
 * @param {string} locale - Locale for formatting
 * @returns {string} Formatted date
 */
export function formatDate(date, locale = 'en-US') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format date in short format (DD/MM/YYYY)
 */
export function formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * Aligned with backend Django DateField format
 */
export function formatISODate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

/**
 * Format datetime as ISO string
 * Aligned with backend Django DateTimeField format
 */
export function formatISO(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

// ── Date & Time Validation ────────────────────────────────────────────────

/**
 * Check if string is a valid time (HH:MM)
 */
export function isValidTime(timeStr) {
    if (!timeStr) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

/**
 * Check if value is a valid date
 */
export function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if time range is valid (start < end)
 */
export function isValidTimeRange(startTime, endTime) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
    return startTime < endTime;
}

// ── Relative Time ─────────────────────────────────────────────────────────

/**
 * Get relative time string (e.g., "5m ago", "2h ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDateShort(date);
}

/**
 * Get detailed relative time (includes weeks, months, years)
 */
export function getRelativeTimeDetailed(date) {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (years === 1) return '1 year ago';
    return `${years} years ago`;
}

// ── Day & Date Utilities ──────────────────────────────────────────────────

/**
 * Get day name from day index (0-6, where 0 = Monday)
 */
export function getDayName(dayOfWeek) {
    return DAY_NAMES[dayOfWeek] || '';
}

/**
 * Get short day name
 */
export function getDayNameShort(dayOfWeek) {
    return DAY_NAMES_SHORT[dayOfWeek] || '';
}

/**
 * Check if date is today
 */
export function isToday(date) {
    if (!date) return false;
    const now = new Date();
    const d = new Date(date);
    return d.toDateString() === now.toDateString();
}

/**
 * Check if date is this week
 */
export function isThisWeek(date) {
    if (!date) return false;
    const now = new Date();
    const d = new Date(date);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
}

/**
 * Check if date is this month
 */
export function isThisMonth(date) {
    if (!date) return false;
    const now = new Date();
    const d = new Date(date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/**
 * Check if date is overdue (in the past)
 */
export function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < new Date();
}

/**
 * Get week number (1-52)
 */
export function getWeekNumber(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ── Academic Helpers ──────────────────────────────────────────────────────

/**
 * Get academic year string (e.g., "2025-2026")
 * Kenya academic year: January to December
 * Backend: apps/academics/models.py - Term model
 */
export function getAcademicYear(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    return `${year}-${year + 1}`;
}

/**
 * Get current term number based on date
 * Kenya school terms:
 *   Term 1: January - March
 *   Term 2: May - July  
 *   Term 3: September - November
 * Backend: apps/academics/models.py - Term.name (TERM1, TERM2, TERM3)
 */
export function getCurrentTerm(date = new Date()) {
    const d = new Date(date);
    const month = d.getMonth() + 1; // 1-12

    if (month >= 1 && month <= 3) return 1;
    if (month >= 5 && month <= 7) return 2;
    if (month >= 9 && month <= 11) return 3;
    return null; // Holiday period (April, August, December)
}

/**
 * Get term name from term number
 * Backend: apps/academics/models.py - Term.get_name_display()
 */
export function getTermName(termNumber) {
    const names = { 1: 'Term 1', 2: 'Term 2', 3: 'Term 3' };
    return names[termNumber] || 'Holiday';
}

/**
 * Check if date falls within a school term
 */
export function isSchoolTerm(date = new Date()) {
    return getCurrentTerm(date) !== null;
}

/**
 * Check if date is a school day (not weekend or holiday)
 * Backend: Used for attendance validation
 */
export function isSchoolDay(date = new Date()) {
    const d = new Date(date);

    // Weekend check (Sunday = 0, Saturday = 6)
    if (d.getDay() === 0 || d.getDay() === 6) return false;

    // Holiday check
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (SCHOOL_HOLIDAYS_KE.includes(dateStr)) return false;

    // Check if in school term
    if (!isSchoolTerm(date)) return false;

    return true;
}

/**
 * Get next school day from a given date
 */
export function getNextSchoolDay(date = new Date()) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);

    let attempts = 0;
    while (!isSchoolDay(next) && attempts < 30) {
        next.setDate(next.getDate() + 1);
        attempts++;
    }

    return attempts < 30 ? next : null;
}

/**
 * Get previous school day from a given date
 */
export function getPreviousSchoolDay(date = new Date()) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);

    let attempts = 0;
    while (!isSchoolDay(prev) && attempts < 30) {
        prev.setDate(prev.getDate() - 1);
        attempts++;
    }

    return attempts < 30 ? prev : null;
}

// ── Duration Helpers ──────────────────────────────────────────────────────

/**
 * Format duration in minutes to readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m")
 */
export function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
}

/**
 * Format duration in long form
 */
export function formatDurationLong(minutes) {
    if (!minutes && minutes !== 0) return '0 minutes';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const parts = [];
    if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    return parts.join(' ') || '0 minutes';
}

// ── Attendance Window Helpers ────────────────────────────────────────────

/**
 * Check if current time is within attendance marking window
 * Backend: apps/academics/views.py - AttendanceViewSet
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {boolean} Whether within window
 */
export function isWithinAttendanceWindow(startTime, endTime) {
    if (!startTime || !endTime) return false;

    const now = new Date();
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Window starts 10 minutes before and ends 10 minutes after
    const start = new Date(now);
    start.setHours(startHour, startMinute - 10, 0, 0);

    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);

    return now >= start && now <= end;
}

/**
 * Get remaining minutes until attendance window closes
 * @param {string} endTime - End time (HH:MM)
 * @returns {number} Minutes remaining
 */
export function getRemainingTime(endTime) {
    if (!endTime) return 0;

    const now = new Date();
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);

    const diff = end - now;
    return Math.max(0, Math.floor(diff / 60000));
}

// ── Time Slot Generation ─────────────────────────────────────────────────

/**
 * Generate time slots for timetable
 * Backend: apps/academics/models.py - Timetable model
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} intervalMinutes - Slot duration in minutes
 * @returns {Array} Array of time slots
 */
export function generateTimeSlots(startTime = '08:00', endTime = '17:00', intervalMinutes = 40) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return [];

    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const current = new Date();
    current.setHours(startH, startM, 0, 0);

    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    let periodNumber = 1;

    while (current < end) {
        const slotStart = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
        current.setMinutes(current.getMinutes() + intervalMinutes);
        const slotEnd = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;

        slots.push({
            period: periodNumber,
            start: slotStart,
            end: slotEnd,
            label: `Period ${periodNumber}`,
            timeLabel: `${slotStart} - ${slotEnd}`,
        });

        periodNumber++;
    }

    return slots;
}

/**
 * Get current period from schedule
 * @param {Array} schedule - Array of {start, end} objects
 * @param {Date} time - Current time (default: now)
 * @returns {Object|null} Current period or null
 */
export function getCurrentPeriod(schedule, time = new Date()) {
    if (!schedule?.length) return null;

    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

    for (const period of schedule) {
        if (currentTime >= period.start && currentTime < period.end) {
            return period;
        }
    }
    return null;
}

/**
 * Get next period from schedule
 * @param {Array} schedule - Array of {start, end} objects
 * @param {Date} time - Current time (default: now)
 * @returns {Object|null} Next period or null
 */
export function getNextPeriod(schedule, time = new Date()) {
    if (!schedule?.length) return null;

    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

    for (const period of schedule) {
        if (period.start > currentTime) {
            return period;
        }
    }
    return null;
}

// ── Date Range Formatting ────────────────────────────────────────────────

/**
 * Format date range for display
 */
export function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

    // Same day
    if (start.toDateString() === end.toDateString()) {
        return formatDate(start);
    }

    // Same month and year
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }

    // Same year
    if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
    }

    // Different years
    return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

// ── Countdown Timer ───────────────────────────────────────────────────────

/**
 * Get countdown to target date
 * @param {string|Date} targetDate - Target date
 * @returns {Object} Countdown object with days, hours, minutes, seconds
 */
export function getCountdown(targetDate) {
    if (!targetDate) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) {
        return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { expired: false, days, hours, minutes, seconds };
}

/**
 * Format countdown as string
 */
export function formatCountdown(countdown) {
    if (!countdown || countdown.expired) return 'Expired';
    const parts = [];
    if (countdown.days > 0) parts.push(`${countdown.days}d`);
    if (countdown.hours > 0) parts.push(`${countdown.hours}h`);
    if (countdown.minutes > 0) parts.push(`${countdown.minutes}m`);
    parts.push(`${countdown.seconds}s`);
    return parts.join(' ');
}

// ── Age Calculation ───────────────────────────────────────────────────────

/**
 * Calculate age from date of birth
 * Backend: apps/accounts/models.py - StudentProfile.date_of_birth
 */
export function calculateAge(dob) {
    if (!dob) return null;

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// ── Timestamp Utilities ───────────────────────────────────────────────────

/**
 * Convert date to Unix timestamp (seconds)
 */
export function toTimestamp(date) {
    if (!date) return null;
    return Math.floor(new Date(date).getTime() / 1000);
}

/**
 * Convert Unix timestamp to Date
 */
export function fromTimestamp(timestamp) {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
}

// ── Timezone Utilities ────────────────────────────────────────────────────

/**
 * Convert UTC date to local timezone
 * Backend: Django uses TIME_ZONE = 'Africa/Nairobi'
 */
export function toLocalTime(utcDate, timezone = 'Africa/Nairobi') {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleString('en-US', { timeZone: timezone });
}

/**
 * Convert local date to UTC ISO string
 */
export function toUTC(localDate) {
    if (!localDate) return '';
    return new Date(localDate).toISOString();
}

// ── Server Time Synchronization ───────────────────────────────────────────

/**
 * Global variable to store the drift between Server and Client time.
 * Initialize this by comparing the 'Date' header from API responses.
 */
let timeOffset = 0;

/**
 * Update the time offset based on the server's response header
 * @param {string} serverDateString - Date string returned from server
 */
export function setTimeOffset(serverDateString) {
    const serverTime = new Date(serverDateString).getTime();
    const clientTime = new Date().getTime();
    timeOffset = serverTime - clientTime;
}

/**
 * Get the current time adjusted by the server offset
 * Use this instead of 'new Date()' for all critical timestamps
 */
export function getSyncedDate() {
    return new Date(Date.now() + timeOffset);
}