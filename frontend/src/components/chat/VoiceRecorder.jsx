// frontend/src/components/chat/VoiceRecorder.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_DURATION = 120; // seconds

const VoiceRecorder = ({ onRecordingComplete }) => {
    const [status, setStatus] = useState('idle'); // 'idle' | 'recording' | 'preview'
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);
    const isMouseDownRef = useRef(false);
    const recordButtonRef = useRef(null);

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    // ── Start recording ─────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                // This runs when stop() is called – either by user or by max duration.
                // We'll decide what to do based on status at that moment.
                if (status === 'recording') {
                    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                    setStatus('preview');
                    setDuration(0); // duration is reset after stop
                }
                // If we're cancelling, onstop might have been overridden in cancel, so nothing happens.
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start();
            setStatus('recording');
            setAudioUrl(null);
            // Start duration timer
            let sec = 0;
            timerRef.current = setInterval(() => {
                sec++;
                setDuration(sec);
                if (sec >= MAX_DURATION) {
                    stopRecording();
                }
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied', err);
            setStatus('idle');
        }
    }, [status]); // status used to decide onstop behavior (not strictly needed, but fine)

    // ── Stop recording (send to preview) ─────────────────────────────────────
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
            clearInterval(timerRef.current);
            // The onstop handler will set status to 'preview'
        }
    }, [status]);

    // ── Cancel recording (no blob, discard) ──────────────────────────────────
    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && status === 'recording') {
            // Override onstop so it doesn't produce a blob
            mediaRecorderRef.current.onstop = () => { };
            mediaRecorderRef.current.stop();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            clearInterval(timerRef.current);
            setStatus('idle');
            setDuration(0);
        }
    }, [status]);

    // ── Send the recorded audio ──────────────────────────────────────────────
    const handleSend = useCallback(() => {
        if (audioUrl && status === 'preview') {
            // Convert blob URL to Blob (we still have the chunks? No, we only have URL.)
            // We need to fetch the blob from URL. Simpler: store the blob in a ref.
            // Instead, we'll keep the blob in a ref when recording stops.
            // We'll modify the stopRecording flow to store the blob.
            // Actually, we can just pass the blob via onRecordingComplete from the preview.
            // We'll fix: when user clicks send, we'll fetch the blob and call parent.
            fetch(audioUrl)
                .then((r) => r.blob())
                .then((blob) => {
                    onRecordingComplete?.(blob);
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setStatus('idle');
                });
        }
    }, [audioUrl, status, onRecordingComplete]);

    // ── Discard preview ──────────────────────────────────────────────────────
    const discardPreview = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setStatus('idle');
        }
    }, [audioUrl]);

    // ── Mouse / Touch handlers for hold‑to‑record ────────────────────────────
    const handlePointerDown = (e) => {
        e.preventDefault();
        isMouseDownRef.current = true;
        startRecording();
    };

    const handlePointerUp = (e) => {
        e.preventDefault();
        if (isMouseDownRef.current && status === 'recording') {
            stopRecording();
        }
        isMouseDownRef.current = false;
    };

    const handlePointerLeave = (e) => {
        // If mouse leaves the button while recording, cancel on release outside
        // We'll set a flag and cancel in pointerup if outside
        if (isMouseDownRef.current && status === 'recording') {
            // Record that user moved away; we cancel in pointerup if still away
            // For simplicity, cancel immediately if mouse leaves the button while held
            cancelRecording();
            isMouseDownRef.current = false;
        }
    };

    // ── Format duration ──────────────────────────────────────────────────────
    const formatDuration = (sec) => {
        const mins = Math.floor(sec / 60);
        const s = sec % 60;
        return `${mins}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative flex items-center">
            {/* Idle state */}
            {status === 'idle' && (
                <button
                    ref={recordButtonRef}
                    type="button"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 touch-none select-none"
                    title="Hold to record voice note"
                    aria-label="Record voice note"
                >
                    🎤
                </button>
            )}

            {/* Recording state */}
            {status === 'recording' && (
                <div className="flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                    <span className="animate-pulse text-red-600">🔴</span>
                    <span className="text-sm font-mono">{formatDuration(duration)}</span>
                    <button
                        onClick={stopRecording}
                        className="text-red-600 hover:text-red-800"
                        title="Stop recording"
                        aria-label="Stop recording"
                    >
                        ⏹️
                    </button>
                    <button
                        onClick={cancelRecording}
                        className="text-gray-600 hover:text-gray-800"
                        title="Cancel recording"
                        aria-label="Cancel recording"
                    >
                        ❌
                    </button>
                </div>
            )}

            {/* Preview state */}
            {status === 'preview' && audioUrl && (
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded">
                    <audio src={audioUrl} controls className="h-8 w-32" />
                    <button
                        onClick={handleSend}
                        className="text-green-600 hover:text-green-800"
                        title="Send voice note"
                        aria-label="Send voice note"
                    >
                        📤
                    </button>
                    <button
                        onClick={discardPreview}
                        className="text-red-600 hover:text-red-800"
                        title="Discard recording"
                        aria-label="Discard recording"
                    >
                        🗑️
                    </button>
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;