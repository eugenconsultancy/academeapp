import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useImageBlur(itemId) {
    const [status, setStatus] = useState('processing');
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!itemId) return;

        const checkStatus = async () => {
            const data = queryClient.getQueryData(['found-item', itemId]);
            if (data?.status === 'active') {
                setStatus('active');
                return true;
            }
            return false;
        };

        // Poll every 3 seconds
        const interval = setInterval(async () => {
            const isReady = await checkStatus();
            if (isReady) {
                clearInterval(interval);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [itemId, queryClient]);

    return { status, isProcessing: status === 'processing' };
}