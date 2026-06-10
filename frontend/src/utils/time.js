// ── Constants; ALSO I HAVE date-fns (`date-fns`) INSTALLED ────────────────────────────────────────────────────────────

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

// ── Server Time Synchronization ───────────────────────────────────────────

let timeOffset = 0;

export function setTimeOffset(serverDateString) {
    const serverTime = new Date(serverDateString).getTime();
    const clientTime = Date.now();
    timeOffset = serverTime - clientTime;
}

export function getSyncedDate() {
    return new Date(Date.now() + timeOffset);
}

// ── Time Formatting ───────────────────────────────────────────────────────

export function formatTime(time, locale = 'en-US') {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatTime24(time) {
    if (!time) return '';
    const date = new Date(time);
    if (isNaN(date.getTime())) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export function formatDate(date, locale = 'en-US') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

export function formatISODate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

export function formatISO(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

// ── Date & Time Validation ────────────────────────────────────────────────

export function isValidTime(timeStr) {
    if (!timeStr) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

export function isValidDate(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}

export function isValidTimeRange(startTime, endTime) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return false;
    return startTime < endTime;
}

// ── Relative Time ─────────────────────────────────────────────────────────

export function getRelativeTime(date) {
    if (!date) return '';
    const now = getSyncedDate();
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

export function getRelativeTimeDetailed(date) {
    if (!date) return '';
    const now = getSyncedDate();
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

export function getDayName(dayOfWeek) {
    return DAY_NAMES[dayOfWeek] || '';
}

export function getDayNameShort(dayOfWeek) {
    return DAY_NAMES_SHORT[dayOfWeek] || '';
}

export function isToday(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    return d.toDateString() === now.toDateString();
}

export function isThisWeek(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
}

export function isThisMonth(date) {
    if (!date) return false;
    const now = getSyncedDate();
    const d = new Date(date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < getSyncedDate();
}

export function getWeekNumber(date = getSyncedDate()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ── Academic Helpers ──────────────────────────────────────────────────────

export function getAcademicYear(date = getSyncedDate()) {
    const d = new Date(date);
    const year = d.getFullYear();
    return `${year}-${year + 1}`;
}

export function getCurrentTerm(date = getSyncedDate()) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    if (month >= 1 && month <= 3) return 1;
    if (month >= 5 && month <= 7) return 2;
    if (month >= 9 && month <= 11) return 3;
    return null;
}

export function getTermName(termNumber) {
    const names = { 1: 'Term 1', 2: 'Term 2', 3: 'Term 3' };
    return names[termNumber] || 'Holiday';
}

export function isSchoolTerm(date = getSyncedDate()) {
    return getCurrentTerm(date) !== null;
}

export function isSchoolDay(date = getSyncedDate()) {
    const d = new Date(date);
    if (d.getDay() === 0 || d.getDay() === 6) return false;
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (SCHOOL_HOLIDAYS_KE.includes(dateStr)) return false;
    if (!isSchoolTerm(date)) return false;
    return true;
}

export function getNextSchoolDay(date = getSyncedDate()) {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    let attempts = 0;
    while (!isSchoolDay(next) && attempts < 30) {
        next.setDate(next.getDate() + 1);
        attempts++;
    }
    return attempts < 30 ? next : null;
}

export function getPreviousSchoolDay(date = getSyncedDate()) {
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

export function formatDuration(minutes) {
    if (!minutes && minutes !== 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
}

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

export function isWithinAttendanceWindow(startTime, endTime) {
    if (!startTime || !endTime) return false;
    const now = getSyncedDate();
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = new Date(now);
    start.setHours(startHour, startMinute - 10, 0, 0);
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);

    return now >= start && now <= end;
}

export function getRemainingTime(endTime) {
    if (!endTime) return 0;
    const now = getSyncedDate();
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0, 0);
    const diff = end - now;
    return Math.max(0, Math.floor(diff / 60000));
}

// ── Time Slot Generation ─────────────────────────────────────────────────

export function generateTimeSlots(startTime = '08:00', endTime = '17:00', intervalMinutes = 40) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return [];
    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const current = getSyncedDate();
    current.setHours(startH, startM, 0, 0);
    const end = new Date(current);
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

export function getCurrentPeriod(schedule, time = getSyncedDate()) {
    if (!schedule?.length) return null;
    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    for (const period of schedule) {
        if (currentTime >= period.start && currentTime < period.end) return period;
    }
    return null;
}

export function getNextPeriod(schedule, time = getSyncedDate()) {
    if (!schedule?.length) return null;
    const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    for (const period of schedule) {
        if (period.start > currentTime) return period;
    }
    return null;
}

// ── Date Range Formatting ────────────────────────────────────────────────

export function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    if (start.toDateString() === end.toDateString()) return formatDate(start);
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
    }
    return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

// ── Countdown Timer ───────────────────────────────────────────────────────

export function getCountdown(targetDate) {
    if (!targetDate) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const now = getSyncedDate();
    const target = new Date(targetDate);
    const diff = target - now;
    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { expired: false, days, hours, minutes, seconds };
}

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

export function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = getSyncedDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

// ── Timestamp Utilities ───────────────────────────────────────────────────

export function toTimestamp(date) {
    if (!date) return null;
    return Math.floor(new Date(date).getTime() / 1000);
}

export function fromTimestamp(timestamp) {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
}

// ── Timezone Utilities ────────────────────────────────────────────────────

export function toLocalTime(utcDate, timezone = 'Africa/Nairobi') {
    if (!utcDate) return '';
    return new Date(utcDate).toLocaleString('en-US', { timeZone: timezone });
}

export function toUTC(localDate) {
    if (!localDate) return '';
    return new Date(localDate).toISOString();
}