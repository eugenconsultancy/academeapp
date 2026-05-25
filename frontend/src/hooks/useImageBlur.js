import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for monitoring image processing/blur status with polling.
 * Enhanced with error handling, timeouts, manual controls, and configurable options.
 * 
 * @param {string} itemId - The item ID to monitor
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Polling interval in ms (default: 3000)
 * @param {number} options.maxAttempts - Max polling attempts (default: 20)
 * @param {number} options.timeout - Total timeout in ms (default: 60000)
 * @param {string} options.queryKey - React Query key (default: ['found-item', itemId])
 * @param {Function} options.onStatusChange - Callback when status changes
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onTimeout - Callback on timeout
 * @returns {Object} Hook API
 */
export function useImageBlur(itemId, options = {}) {
    const {
        interval = 3000,
        maxAttempts = 20,
        timeout = 60000,
        queryKey = null,
        onStatusChange = null,
        onError = null,
        onTimeout = null,
    } = options;

    const queryClient = useQueryClient();
    const effectiveQueryKey = queryKey || ['found-item', itemId];

    // ── State ──────────────────────────────────────────────────
    const [status, setStatus] = useState('idle'); // idle, processing, active, error, timeout
    const [attempts, setAttempts] = useState(0);
    const [errorMessage, setErrorMessage] = useState(null);

    // ── Refs ───────────────────────────────────────────────────
    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const isMountedRef = useRef(true);
    const previousStatusRef = useRef(null);

    // ═══════════════════════════════════════════════════════════
    // STATUS CHECK
    // ═══════════════════════════════════════════════════════════

    /**
     * Check current status from React Query cache
     */
    const checkStatus = useCallback(() => {
        if (!itemId) return false;

        try {
            const data = queryClient.getQueryData(effectiveQueryKey);

            if (!data) {
                return false;
            }

            // Check multiple possible status fields
            const currentStatus = data?.status || data?.processing_status || data?.image_status;

            if (currentStatus === 'active' || currentStatus === 'completed' || currentStatus === 'ready') {
                if (previousStatusRef.current !== 'active') {
                    previousStatusRef.current = 'active';
                    setStatus('active');
                    if (onStatusChange) onStatusChange('active', data);
                }
                return true;
            }

            // Check for error status
            if (currentStatus === 'error' || currentStatus === 'failed') {
                setStatus('error');
                const errMsg = data?.error_message || 'Image processing failed';
                setErrorMessage(errMsg);
                if (onError) onError(errMsg);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking image status:', error);
            return false;
        }
    }, [itemId, queryClient, effectiveQueryKey, onStatusChange, onError]);

    // ═══════════════════════════════════════════════════════════
    // POLLING CONTROL
    // ═══════════════════════════════════════════════════════════

    /**
     * Start polling for status changes
     */
    const startPolling = useCallback(() => {
        // Clear any existing intervals
        stopPolling();

        setStatus('processing');
        setAttempts(0);
        setErrorMessage(null);
        previousStatusRef.current = 'processing';

        // Set overall timeout
        timeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                setStatus('timeout');
                setErrorMessage(`Image processing timed out after ${timeout / 1000} seconds`);
                if (onTimeout) onTimeout();
                stopPolling();
            }
        }, timeout);

        // Start interval polling
        intervalRef.current = setInterval(() => {
            if (!isMountedRef.current) return;

            setAttempts((prev) => {
                const newAttempts = prev + 1;

                // Check if max attempts reached
                if (newAttempts >= maxAttempts) {
                    setStatus('timeout');
                    setErrorMessage(`Max polling attempts (${maxAttempts}) reached`);
                    if (onTimeout) onTimeout();
                    stopPolling();
                    return newAttempts;
                }

                // Check status
                const isReady = checkStatus();
                if (isReady) {
                    stopPolling();
                }

                return newAttempts;
            });
        }, interval);
    }, [interval, maxAttempts, timeout, checkStatus, onTimeout]);

    /**
     * Stop polling
     */
    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    /**
     * Force refresh - invalidate cache and re-check
     */
    const refresh = useCallback(async () => {
        try {
            await queryClient.invalidateQueries({ queryKey: effectiveQueryKey });
            await queryClient.refetchQueries({ queryKey: effectiveQueryKey });
            startPolling();
        } catch (error) {
            console.error('Failed to refresh image status:', error);
            setErrorMessage('Failed to refresh status');
        }
    }, [queryClient, effectiveQueryKey, startPolling]);

    /**
     * Reset to initial state
     */
    const reset = useCallback(() => {
        stopPolling();
        setStatus('idle');
        setAttempts(0);
        setErrorMessage(null);
        previousStatusRef.current = null;
    }, [stopPolling]);

    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════

    useEffect(() => {
        isMountedRef.current = true;

        if (itemId) {
            // Check immediately first
            const isAlreadyReady = checkStatus();
            if (!isAlreadyReady) {
                startPolling();
            }
        }

        return () => {
            isMountedRef.current = false;
            stopPolling();
        };
    }, [itemId, checkStatus, startPolling, stopPolling]);

    // ═══════════════════════════════════════════════════════════
    // RETURN API
    // ═══════════════════════════════════════════════════════════

    return {
        status,
        isProcessing: status === 'processing',
        isActive: status === 'active',
        isError: status === 'error',
        isTimeout: status === 'timeout',
        isIdle: status === 'idle',
        attempts,
        errorMessage,
        startPolling,
        stopPolling,
        refresh,
        reset,
        checkStatus,
    };
}

export default useImageBlur;