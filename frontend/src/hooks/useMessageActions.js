// frontend/src/hooks/useMessageActions.js
import { useState } from 'react';

/**
 * Centralized modal state for chat message actions.
 * Use in ChatDetail to control which modal is shown.
 *
 * @returns {{ type, data, open, close }}
 */
export const useMessageActions = () => {
    const [action, setAction] = useState({ type: null, data: null });

    const open = (type, data) => setAction({ type, data });
    const close = () => setAction({ type: null, data: null });

    return { type: action.type, data: action.data, open, close };
};