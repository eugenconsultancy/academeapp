export function formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function getDayName(dayOfWeek) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayOfWeek] || '';
}

export function getRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
}

export function isWithinAttendanceWindow(startTime, endTime) {
    const now = new Date();
    const [startHour, startMinute] = startTime.split(':');
    const [endHour, endMinute] = endTime.split(':');

    const start = new Date(now);
    start.setHours(startHour, startMinute - 10, 0);

    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0);

    return now >= start && now <= end;
}

export function getRemainingTime(endTime) {
    const now = new Date();
    const [endHour, endMinute] = endTime.split(':');
    const end = new Date(now);
    end.setHours(endHour, endMinute + 10, 0);

    const diff = end - now;
    return Math.max(0, Math.floor(diff / 60000));
}