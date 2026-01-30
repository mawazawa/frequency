import { useRef, useState, useCallback, useEffect } from 'react';

export const useMicAudio = () => {
    const [isReady, setIsReady] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startAudio = useCallback(async () => {
        if (audioContextRef.current?.state === 'running') return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const win = window as unknown as Window & { webkitAudioContext?: typeof AudioContext };
            const AudioContextClass = window.AudioContext || win.webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256; // Trade-off between resolution and speed
            analyserRef.current = analyser;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;

            const bufferLength = analyser.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            setIsReady(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    }, []);

    const stopAudio = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        sourceRef.current?.disconnect();
        audioContextRef.current?.close();
        streamRef.current = null;
        sourceRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        dataArrayRef.current = null;
        setIsReady(false);
    }, []);

    const getFrequencyData = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) return { bass: 0, mid: 0, high: 0 };

        analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

        const data = dataArrayRef.current;
        const bufferLength = data.length;

        // Simple frequency banding
        // Bass: Lower 1/3
        // Mid: Middle 1/3
        // High: Upper 1/3 (mostly noise/voice)

        let bassSum = 0;
        let midSum = 0;
        let highSum = 0;

        const third = Math.floor(bufferLength / 3);

        if (third === 0) return { bass: 0, mid: 0, high: 0 };

        for (let i = 0; i < bufferLength; i++) {
            const val = data[i] / 255.0; // Normalize 0-1
            if (i < third) bassSum += val;
            else if (i < 2 * third) midSum += val;
            else highSum += val;
        }

        return {
            bass: bassSum / third,
            mid: midSum / third,
            high: highSum / (bufferLength - 2 * third)
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            sourceRef.current?.disconnect();
            audioContextRef.current?.close();
        };
    }, []);

    return { isReady, startAudio, stopAudio, getFrequencyData };
};
