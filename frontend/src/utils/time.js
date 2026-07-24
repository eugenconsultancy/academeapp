// frontend/src/utils/time.js
/**
 * Time & date utilities powered by date-fns for safety and consistency.
 * All attendance‑window calculations are now UTC‑safe.
 */
import {
    format,
    formatDistanceToNow,
    formatDistanceToNowStrict,
    isToday as fnsIsToday,
    isThisWeek as fnsIsThisWeek,
    isThisMonth as fnsIsThisMonth,
    isPast,
    parseISO,
    getDay,
    getMonth,
    getYear,
    addDays,
    subDays,
    startOfWeek,
    differenceInSeconds,
    differenceInMinutes,
    differenceInHours,
    differenceInDays,
    differenceInWeeks,
    differenceInMonths,
    differenceInYears,
    addMinutes,
    isValid,
} from 'date-fns';

// ── Constants ────────────────────────────────────────────────────────────

const SCHOOL_HOLIDAYS_KE = [
    '01-01', // New Year's Day
    '04-07', // Good Friday (approximate)
    '04-10', // Easter Monday (approximate)
    '05-01', // Labour Day
    '06-01', // Madaraka Day
    '08-08', // General Election (every 5 years)
    '10-10', // Utamaduni Day
    '10-20', // Mashujaa Day
    '12-12', // Jamhuri Day
    '12-25', // Christmas Day
    '12-26', // Boxing Day
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Server Time Synchronization ──────────────────────────────────────────

let timeOffset = 0;

export function setTimeOffset(serverDateString) {
    const serverTime = parseISO(serverDateString);
    if (!isValid(serverTime)) return;
    timeOffset = serverTime.getTime() - Date.now();
}

/**
 * Returns a Date object adjusted by the server time offset.
 * All other functions should use this instead of new Date() for "now".
 */
export function getSyncedDate() {
    return new Date(Date.now() + timeOffset);
}

// ── Safe Date Parsing ────────────────────────────────────────────────────

function toDate(input) {
    if (!input) return null;
    const d = typeof input === 'string' ? parseISO(input) : new Date(input);
    return isValid(d) ? d : null;
}

// ── NEW: Convert HH:mm class time to UTC Date ──────────────────────────
/**
 * Converts a time string (e.g. "09:00") into a UTC Date object for the given day.
 * Always uses UTC so that comparisons are independent of local timezone.
 */
export function classTimeToUTCDate(timeStr, referenceDate = getSyncedDate()) {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Use referenceDate's year/month/day, but force UTC time
    const d = new Date(Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
        hours,
        minutes,
        0,
        0
    ));
    return d;
}

// ── Formatting ───────────────────────────────────────────────────────────

export function formatTime(time) {
    const d = toDate(time);
    return d ? format(d, 'HH:mm') : '';
}

export function formatTime24(time) {
    return formatTime(time);
}

export function formatDate(date) {
    const d = toDate(date);
    return d ? format(d, 'EEEE, MMMM do, yyyy') : '';
}

export function formatDateShort(date) {
    const d = toDate(date);
    return d ? format(d, 'dd/MM/yyyy') : '';
}

export function formatISODate(date) {
    const d = toDate(date);
    return d ? format(d, 'yyyy-MM-dd') : '';
}

export function formatISO(date) {
    const d = toDate(date);
    return d ? d.toISOString() : '';
}

// ── Validation ───────────────────────────────────────────────────────────

export function isValidTime(timeStr) {
    if (!timeStr) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

export function isValidDate(dateStr) {
    return !!toDate(dateStr);
}

export function isValidTimeRange(startTime, endTime) {
    return isValidTime(startTime) && isValidTime(endTime) && startTime < endTime;
}

// ── Relative Time ────────────────────────────────────────────────────────

export function getRelativeTime(date) {
    const d = toDate(date);
    if (!d) return '';
    const seconds = differenceInSeconds(getSyncedDate(), d);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDateShort(d);
}

export function getRelativeTimeDetailed(date) {
    const d = toDate(date);
    if (!d) return '';
    return formatDistanceToNowStrict(d, { addSuffix: true });
}

// ── Calendar Checks ─────────────────────────────────────────────────────

export function getDayName(dayOfWeek) {
    return DAY_NAMES[dayOfWeek] || '';
}

export function getDayNameShort(dayOfWeek) {
    return DAY_NAMES_SHORT[dayOfWeek] || '';
}

export function isToday(date) {
    const d = toDate(date);
    return d ? fnsIsToday(d) : false;
}

export function isThisWeek(date) {
    const d = toDate(date);
    return d ? fnsIsThisWeek(d, { weekStartsOn: 1 }) : false;
}

export function isThisMonth(date) {
    const d = toDate(date);
    return d ? fnsIsThisMonth(d) : false;
}

export function isOverdue(date) {
    const d = toDate(date);
    return d ? isPast(d) : false;
}

// ── Week Number ─────────────────────────────────────────────────────────

export function getWeekNumber(date = getSyncedDate()) {
    const d = toDate(date) || getSyncedDate();
    return format(d, 'w');
}

// ── Academic Helpers ────────────────────────────────────────────────────

export function getAcademicYear(date = getSyncedDate()) {
    const d = toDate(date) || getSyncedDate();
    const year = d.getFullYear();
    return `${year}-${year + 1}`;
}

export function getCurrentTerm(date = getSyncedDate()) {
    const d = toDate(date) || getSyncedDate();
    const month = d.getMonth() + 1; // local month – acceptable for academic term
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
    const d = toDate(date) || getSyncedDate();
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    const dateStr = format(d, 'MM-dd');
    if (SCHOOL_HOLIDAYS_KE.includes(dateStr)) return false;
    return isSchoolTerm(d);
}

export function getNextSchoolDay(date = getSyncedDate()) {
    const d = toDate(date) || getSyncedDate();
    let next = addDays(d, 1);
    let attempts = 0;
    while (!isSchoolDay(next) && attempts < 30) {
        next = addDays(next, 1);
        attempts++;
    }
    return attempts < 30 ? next : null;
}

export function getPreviousSchoolDay(date = getSyncedDate()) {
    const d = toDate(date) || getSyncedDate();
    let prev = subDays(d, 1);
    let attempts = 0;
    while (!isSchoolDay(prev) && attempts < 30) {
        prev = subDays(prev, 1);
        attempts++;
    }
    return attempts < 30 ? prev : null;
}

// ── Duration Formatting ─────────────────────────────────────────────────

export function formatDuration(minutes) {
    if (minutes == null) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h}h ${m}m`;
}

export function formatDurationLong(minutes) {
    if (minutes == null) return '0 minutes';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const parts = [];
    if (h) parts.push(`${h} hour${h > 1 ? 's' : ''}`);
    if (m) parts.push(`${m} minute${m > 1 ? 's' : ''}`);
    return parts.join(' ') || '0 minutes';
}

// ── Attendance Window (now UTC‑safe) ─────────────────────────────────────

/**
 * Check if the current UTC time falls within the given class time window.
 * Both `startTime` and `endTime` are strings like "08:00" (assumed UTC).
 * A 10‑minute buffer is allowed on each side.
 */
export function isWithinAttendanceWindow(startTime, endTime) {
    if (!startTime || !endTime) return false;
    const now = getSyncedDate();
    const start = classTimeToUTCDate(startTime, now);
    const end = classTimeToUTCDate(endTime, now);
    if (!start || !end) return false;
    // Add buffer
    start.setUTCMinutes(start.getUTCMinutes() - 10);
    end.setUTCMinutes(end.getUTCMinutes() + 10);
    return now >= start && now <= end;
}

export function getRemainingTime(endTime) {
    if (!endTime) return 0;
    const now = getSyncedDate();
    const end = classTimeToUTCDate(endTime, now);
    if (!end) return 0;
    end.setUTCMinutes(end.getUTCMinutes() + 10);
    return Math.max(0, differenceInMinutes(end, now));
}

// ── Time Slot Generation ────────────────────────────────────────────────
// (unchanged, but now relies on SyncedDate which may be offset)

export function generateTimeSlots(startTime = '08:00', endTime = '17:00', intervalMinutes = 40) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) return [];
    const slots = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let current = new Date(getSyncedDate());
    current.setHours(startH, startM, 0, 0);
    const end = new Date(getSyncedDate());
    end.setHours(endH, endM, 0, 0);

    let periodNumber = 1;
    while (current < end) {
        const slotStart = format(current, 'HH:mm');
        current = addMinutes(current, intervalMinutes);
        const slotEnd = format(current, 'HH:mm');
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
    const currentTime = format(time, 'HH:mm');
    for (const period of schedule) {
        if (currentTime >= period.start && currentTime < period.end) return period;
    }
    return null;
}

export function getNextPeriod(schedule, time = getSyncedDate()) {
    if (!schedule?.length) return null;
    const currentTime = format(time, 'HH:mm');
    for (const period of schedule) {
        if (period.start > currentTime) return period;
    }
    return null;
}

// ── Date Range Formatting ───────────────────────────────────────────────

export function formatDateRange(startDate, endDate) {
    const s = toDate(startDate);
    const e = toDate(endDate);
    if (!s || !e) return '';
    if (format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) return formatDate(s);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
        return `${s.getDate()} - ${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
    if (s.getFullYear() === e.getFullYear())
        return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} - ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${s.getFullYear()}`;
    return `${formatDateShort(s)} - ${formatDateShort(e)}`;
}

// ── Countdown ───────────────────────────────────────────────────────────

export function getCountdown(targetDate) {
    const target = toDate(targetDate);
    if (!target) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const now = getSyncedDate();
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

// ── Age Calculation ────────────────────────────────────────────────────

export function calculateAge(dob) {
    const birth = toDate(dob);
    if (!birth) return null;
    const today = getSyncedDate();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// ── Timestamp Utilities ────────────────────────────────────────────────

export function toTimestamp(date) {
    const d = toDate(date);
    return d ? Math.floor(d.getTime() / 1000) : null;
}

export function fromTimestamp(timestamp) {
    return timestamp ? new Date(timestamp * 1000) : null;
}

// ── Timezone Utilities ─────────────────────────────────────────────────

export function toLocalTime(utcDate, timezone = 'Africa/Nairobi') {
    const d = toDate(utcDate);
    return d ? d.toLocaleString('en-US', { timeZone: timezone }) : '';
}

export function toUTC(localDate) {
    const d = toDate(localDate);
    return d ? d.toISOString() : '';
}