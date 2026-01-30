"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
interface AudioData {
  bass: number;
  mid: number;
  high: number;
}

interface AudioContextType {
  isReady: boolean;
  isPlaying: boolean;
  startAudio: () => Promise<void>;
  stopAudio: () => void;
  getFrequencyData: () => AudioData;
  toggleAudio: () => void;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════
const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

// ═══════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════
export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for Audio API objects to persist across renders without causing re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Mic Input Refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Ambient Refs
  const masterGainRef = useRef<GainNode | null>(null);
  const ambientNodesRef = useRef<AudioNode[]>([]);

  // Initialize Audio Context (Singleton)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return audioContextRef.current;

    const win = window as unknown as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || win.webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  // ─── AMBIENT SOUND SETUP ───
  const setupAmbientLayer = useCallback((ctx: AudioContext) => {
    // Clear existing nodes if any
    ambientNodesRef.current.forEach(node => {
      try { node.disconnect(); } catch (e) { /* ignore */ }
    });
    ambientNodesRef.current = [];

    // Master Gain for Ambient
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0; // Start silent
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // Layer 1: Deep Drone (Binaural Beat)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 220.0; // A3

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 220.5; // 0.5Hz beat

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.08;

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(masterGain);
    
    osc1.start();
    osc2.start();
    ambientNodesRef.current.push(osc1, osc2, droneGain);

    // Layer 2: Brown Noise (Filtered)
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.2;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseSource.start();
    ambientNodesRef.current.push(noiseSource, noiseFilter, noiseGain);

    return masterGain;
  }, []);

  // ─── MIC INPUT SETUP ───
  const setupMicInput = useCallback(async (ctx: AudioContext) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      setIsReady(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      // Even if mic fails, we might still want ambient sound?
      // For now, we consider 'isReady' to mean mic is ready.
    }
  }, []);

  const startAudio = useCallback(async () => {
    const ctx = initAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Setup if not already done
    if (!masterGainRef.current) setupAmbientLayer(ctx);
    if (!analyserRef.current) await setupMicInput(ctx);

    // Fade In Ambient
    if (masterGainRef.current) {
      const t = ctx.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(t);
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, t);
      masterGainRef.current.gain.linearRampToValueAtTime(0.4, t + 2);
    }

    setIsPlaying(true);
  }, [initAudioContext, setupAmbientLayer, setupMicInput]);

  const stopAudio = useCallback(() => {
    if (audioContextRef.current && masterGainRef.current) {
      const t = audioContextRef.current.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(t);
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, t);
      masterGainRef.current.gain.linearRampToValueAtTime(0, t + 1.5);
      
      setTimeout(() => {
        setIsPlaying(false);
        // We don't necessarily close the context or stop streams here
        // so we can quickly resume. Full cleanup happens on unmount.
      }, 1500);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (isPlaying) stopAudio();
    else startAudio();
  }, [isPlaying, startAudio, stopAudio]);

  const getFrequencyData = useCallback((): AudioData => {
    if (!analyserRef.current || !dataArrayRef.current) return { bass: 0, mid: 0, high: 0 };

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    const data = dataArrayRef.current;
    const bufferLength = data.length;
    const third = Math.floor(bufferLength / 3);

    if (third === 0) return { bass: 0, mid: 0, high: 0 };

    let bassSum = 0, midSum = 0, highSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = data[i] / 255.0;
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

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      sourceRef.current?.disconnect();
      ambientNodesRef.current.forEach(node => {
         try { node.disconnect(); } catch (e) { /* ignore */ }
      });
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <AudioContext.Provider value={{ isReady, isPlaying, startAudio, stopAudio, getFrequencyData, toggleAudio }}>
      {children}
    </AudioContext.Provider>
  );
};
