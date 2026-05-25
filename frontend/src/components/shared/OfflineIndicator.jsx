import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '../../utils/storage';
import {
    FiWifi, FiWifiOff, FiRefreshCw, FiX,
    FiAlertTriangle, FiCheckCircle, FiClock,
    FiActivity,
} from 'react-icons/fi';

const API_PING_URL = '/api/health/';
const PING_INTERVAL_ONLINE = 20000;
const PING_INTERVAL_SLOW = 30000;
const PING_INTERVAL_OFFLINE = 60000;
const SLOW_THRESHOLD = 3000;
const MAX_RETRY_ATTEMPTS = 5;
const MAX_PING_INTERVAL = 120000;

const CONNECTION_STATUS = {
    ONLINE: 'online',
    SLOW: 'slow',
    OFFLINE: 'offline',
    CHECKING: 'checking',
};

export default function OfflineIndicator({
    position = 'top',
    showSyncButton = true,
    dismissible = true,
    onSync = null,
    apiPingUrl = API_PING_URL,
}) {
    const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CHECKING);
    const [isDismissed, setIsDismissed] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [offlineSince, setOfflineSince] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [showReconnected, setShowReconnected] = useState(false);
    const [lastPingTime, setLastPingTime] = useState(null);
    const [retryAttempts, setRetryAttempts] = useState(0);
    const [currentPingInterval, setCurrentPingInterval] = useState(PING_INTERVAL_ONLINE);

    const pingIntervalRef = useRef(null);
    const previousStatusRef = useRef(null);
    const isMountedRef = useRef(true);
    const syncLockRef = useRef(false);
    const offlineRetryCountRef = useRef(0);

    const calculatePingInterval = useCallback((status, attempts) => {
        switch (status) {
            case CONNECTION_STATUS.ONLINE:
                return PING_INTERVAL_ONLINE;
            case CONNECTION_STATUS.SLOW:
                return PING_INTERVAL_SLOW;
            case CONNECTION_STATUS.OFFLINE:
                const backoffInterval = Math.min(
                    PING_INTERVAL_OFFLINE + (attempts * 15000),
                    MAX_PING_INTERVAL
                );
                return backoffInterval;
            case CONNECTION_STATUS.CHECKING:
            default:
                return PING_INTERVAL_ONLINE;
        }
    }, []);

    const checkConnectivity = useCallback(async () => {
        const startTime = Date.now();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(apiPingUrl, {
                method: 'HEAD',
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;
            setLastPingTime(responseTime);

            if (response.ok) {
                offlineRetryCountRef.current = 0;

                if (responseTime > SLOW_THRESHOLD) {
                    setConnectionStatus(CONNECTION_STATUS.SLOW);
                } else {
                    setConnectionStatus(CONNECTION_STATUS.ONLINE);
                }
                setRetryAttempts(0);
            } else {
                offlineRetryCountRef.current = Math.min(
                    offlineRetryCountRef.current + 1,
                    MAX_RETRY_ATTEMPTS
                );
                setConnectionStatus(CONNECTION_STATUS.OFFLINE);
            }
        } catch (error) {
            offlineRetryCountRef.current = Math.min(
                offlineRetryCountRef.current + 1,
                MAX_RETRY_ATTEMPTS
            );
            setConnectionStatus(CONNECTION_STATUS.OFFLINE);
            setRetryAttempts((prev) => Math.min(prev + 1, MAX_RETRY_ATTEMPTS));
        }
    }, [apiPingUrl]);

    useEffect(() => {
        const newInterval = calculatePingInterval(
            connectionStatus,
            offlineRetryCountRef.current
        );

        setCurrentPingInterval(newInterval);

        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }

        if (!isMountedRef.current) return;

        pingIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                checkConnectivity();
                updatePendingCount();
            }
        }, newInterval);

        if (process.env.NODE_ENV === 'development') {
            console.debug(
                `[OfflineIndicator] Ping interval set to ${newInterval / 1000}s ` +
                `(status: ${connectionStatus}, retries: ${offlineRetryCountRef.current})`
            );
        }

        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [connectionStatus, calculatePingInterval, checkConnectivity]);

    // ═════════════════════════════════════════════════════════
    // PENDING SYNC COUNT (FIXED – NaN guard)
    // ═════════════════════════════════════════════════════════

    const updatePendingCount = useCallback(async () => {
        try {
            const rawCount = await offlineStorage.getPendingSyncCount();
            // Defensive parsing: ensure state never receives NaN
            const parsedCount = parseInt(rawCount, 10);
            const safeCount = isNaN(parsedCount) ? 0 : parsedCount;

            if (isMountedRef.current) {
                setPendingSyncCount(safeCount);
            }
        } catch (error) {
            console.error('[OfflineIndicator] Failed to fetch pending sync count:', error);
            if (isMountedRef.current) {
                setPendingSyncCount(0);
            }
        }
    }, []);

    const handleSync = useCallback(async () => {
        if (connectionStatus === CONNECTION_STATUS.OFFLINE) {
            console.warn('[OfflineIndicator] Cannot sync while offline');
            return;
        }

        if (syncLockRef.current) {
            console.warn('[OfflineIndicator] Sync already in progress, skipping');
            return;
        }

        if (syncing) {
            console.warn('[OfflineIndicator] Sync button already processing');
            return;
        }

        syncLockRef.current = true;
        setSyncing(true);

        try {
            if (onSync) {
                await onSync();
            } else {
                const success = await offlineStorage.processSyncQueueAtomic();

                if (!success && isMountedRef.current) {
                    console.error('[OfflineIndicator] Sync queue processing failed');
                }
            }

            await updatePendingCount();
        } catch (error) {
            console.error('[OfflineIndicator] Sync failed:', error);
        } finally {
            syncLockRef.current = false;

            if (isMountedRef.current) {
                setSyncing(false);
            }
        }
    }, [connectionStatus, syncing, onSync, updatePendingCount]);

    useEffect(() => {
        isMountedRef.current = true;

        checkConnectivity();
        updatePendingCount();

        const handleOnline = () => {
            offlineRetryCountRef.current = 0;
            checkConnectivity();
            setShowReconnected(true);
            setTimeout(() => {
                if (isMountedRef.current) {
                    setShowReconnected(false);
                }
            }, 4000);
        };

        const handleOffline = () => {
            setConnectionStatus(CONNECTION_STATUS.OFFLINE);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            isMountedRef.current = false;

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (connectionStatus === CONNECTION_STATUS.OFFLINE && !offlineSince) {
            setOfflineSince(Date.now());
        } else if (
            connectionStatus === CONNECTION_STATUS.ONLINE ||
            connectionStatus === CONNECTION_STATUS.SLOW
        ) {
            setOfflineSince(null);
        }
    }, [connectionStatus, offlineSince]);

    useEffect(() => {
        const prev = previousStatusRef.current;
        previousStatusRef.current = connectionStatus;

        if (
            prev === CONNECTION_STATUS.OFFLINE &&
            (connectionStatus === CONNECTION_STATUS.ONLINE ||
                connectionStatus === CONNECTION_STATUS.SLOW)
        ) {
            setShowReconnected(true);
            setTimeout(() => {
                if (isMountedRef.current) {
                    setShowReconnected(false);
                }
            }, 4000);

            if (pendingSyncCount > 0 && !syncLockRef.current) {
                handleSync();
            }
        }
    }, [connectionStatus, pendingSyncCount, handleSync]);

    useEffect(() => {
        if (connectionStatus === CONNECTION_STATUS.OFFLINE) {
            setIsDismissed(false);
        }
    }, [connectionStatus]);

    const getOfflineDuration = () => {
        if (!offlineSince) return '';
        const minutes = Math.floor((Date.now() - offlineSince) / 60000);
        if (minutes < 1) return 'just now';
        if (minutes === 1) return '1 minute';
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    };

    const getStatusConfig = () => {
        switch (connectionStatus) {
            case CONNECTION_STATUS.ONLINE:
                return {
                    icon: FiWifi,
                    bgClass: 'bg-emerald-500 dark:bg-emerald-600',
                    textClass: 'text-white',
                    message: 'Connected',
                };
            case CONNECTION_STATUS.SLOW:
                return {
                    icon: FiActivity,
                    bgClass: 'bg-amber-500 dark:bg-amber-600',
                    textClass: 'text-white',
                    message: `Slow connection${lastPingTime ? ` (${lastPingTime}ms)` : ''}`,
                };
            case CONNECTION_STATUS.OFFLINE:
                return {
                    icon: FiWifiOff,
                    bgClass: 'bg-red-500 dark:bg-red-600',
                    textClass: 'text-white',
                    message: 'You are offline',
                };
            case CONNECTION_STATUS.CHECKING:
            default:
                return {
                    icon: FiRefreshCw,
                    bgClass: 'bg-gray-400 dark:bg-gray-600',
                    textClass: 'text-white',
                    message: 'Checking connection...',
                };
        }
    };

    const config = getStatusConfig();
    const StatusIcon = config.icon;
    const isOffline = connectionStatus === CONNECTION_STATUS.OFFLINE;
    const isSlow = connectionStatus === CONNECTION_STATUS.SLOW;
    const showBanner = (isOffline || isSlow || pendingSyncCount > 0) && !isDismissed;

    return (
        <>
            <div
                className={`
                    fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0
                    z-[9999] transition-all duration-300 ease-in-out
                    ${showBanner
                        ? 'translate-y-0 opacity-100'
                        : position === 'top'
                            ? '-translate-y-full opacity-0 pointer-events-none'
                            : 'translate-y-full opacity-0 pointer-events-none'
                    }
                `}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >
                <div className={`${config.bgClass} ${config.textClass}`}>
                    <div className="max-w-7xl mx-auto px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                                {connectionStatus === CONNECTION_STATUS.CHECKING ? (
                                    <FiRefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                                ) : (
                                    <StatusIcon className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">
                                    {config.message}
                                    {isOffline && offlineSince && (
                                        <span className="ml-2 opacity-80">
                                            • {getOfflineDuration()}
                                        </span>
                                    )}
                                </span>
                                {retryAttempts > 1 && isOffline && (
                                    <span className="text-xs opacity-70">
                                        (retry {retryAttempts}/{MAX_RETRY_ATTEMPTS})
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Pending sync count – FIXED with NaN guard */}
                                {pendingSyncCount > 0 && !isNaN(pendingSyncCount) && (
                                    <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-semibold">
                                        {String(pendingSyncCount)} pending
                                    </span>
                                )}

                                {showSyncButton && pendingSyncCount > 0 && !isOffline && (
                                    <button
                                        onClick={handleSync}
                                        disabled={syncing || syncLockRef.current}
                                        className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={syncing ? 'Syncing data...' : `Sync ${pendingSyncCount} pending items`}
                                    >
                                        <FiRefreshCw
                                            className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`}
                                        />
                                        {syncing ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                )}

                                {isOffline && (
                                    <button
                                        onClick={() => {
                                            offlineRetryCountRef.current = 0;
                                            setRetryAttempts(0);
                                            checkConnectivity();
                                        }}
                                        className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 transition-colors"
                                        aria-label="Retry connection check"
                                    >
                                        <FiRefreshCw className="w-3 h-3" />
                                        Retry
                                    </button>
                                )}

                                {dismissible && (
                                    <button
                                        onClick={() => setIsDismissed(true)}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                        aria-label="Dismiss notification"
                                    >
                                        <FiX className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`
                    fixed top-4 right-4 z-[9998] transition-all duration-500 ease-in-out
                    ${showReconnected ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                `}
                role="status"
                aria-live="polite"
            >
                <div className="bg-emerald-500 dark:bg-emerald-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <FiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">Back Online!</p>
                        <p className="text-xs opacity-80">Your connection has been restored.</p>
                    </div>
                    <button
                        onClick={() => setShowReconnected(false)}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
                        aria-label="Dismiss"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="sr-only" aria-live="polite" aria-atomic="true">
                {isOffline
                    ? `You are currently offline. Some features may be limited. ${offlineSince ? `Offline for ${getOfflineDuration()}.` : ''}`
                    : isSlow
                        ? 'Your connection is slow. Pages may load slower than usual.'
                        : 'You are back online.'}
            </div>
        </>
    );
}

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export { CONNECTION_STATUS };