import { useRef, useCallback, useEffect } from 'react';

export const useAmbientSound = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const nodesRef = useRef<AudioNode[]>([]);
    const isPlayingRef = useRef(false);

    // Initialize Audio Engine
    const initAudio = useCallback(() => {
        if (audioContextRef.current) return;

        const win = window as unknown as Window & { webkitAudioContext?: typeof AudioContext };
        const ctx = new (window.AudioContext || win.webkitAudioContext)();
        audioContextRef.current = ctx;

        // Master Gain (Volume Control)
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0; // Start silent for fade-in
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        // --- Layer 1: Deep Drone (The Womb) ---
        // Oscillator 1 (Base Tone)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 220.0; // A3 (audible on laptop speakers)

        // Oscillator 2 (Detuned for Binaural Beat/Phasing)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 220.5; // 0.5Hz beat frequency

        // Drone Gain
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.08; // Subtle base level

        osc1.connect(droneGain);
        osc2.connect(droneGain);
        droneGain.connect(masterGain);
        
        osc1.start();
        osc2.start();
        nodesRef.current.push(osc1, osc2, droneGain);

        // --- Layer 2: Brown Noise (Rumble/Fluid Texture) ---
        const bufferSize = 2 * ctx.sampleRate; // 2 seconds of noise
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate Pink/Brown-ish Noise (1/f)
        // Simple White Noise integration
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Compensate for gain loss
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        // Filter to make it "Deep/Underwater"
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 800; // Warm rumble, audible on laptop
        noiseFilter.Q.value = 1;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.2;

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSource.start();
        nodesRef.current.push(noiseSource, noiseFilter, noiseGain);
    }, []);

    const startAmbient = useCallback(async () => {
        if (!audioContextRef.current) initAudio();

        const ctx = audioContextRef.current;
        if (ctx?.state === 'suspended') {
            await ctx.resume();
        }

        if (!isPlayingRef.current && masterGainRef.current && ctx) {
            // Fade In
            const t = ctx.currentTime;
            masterGainRef.current.gain.cancelScheduledValues(t);
            masterGainRef.current.gain.setValueAtTime(0, t);
            masterGainRef.current.gain.linearRampToValueAtTime(0.4, t + 2); // 2s fade in to 40%
            isPlayingRef.current = true;
        }
    }, [initAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            nodesRef.current.forEach(node => node.disconnect());
            audioContextRef.current?.close();
        };
    }, []);

    return { startAmbient };
};
