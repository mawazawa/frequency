import { useRef, useState, useCallback, useEffect } from 'react';

// Subtitle cues synced to the trailer audio
export interface SubtitleCue {
  start: number; // seconds
  end: number;
  text: string;
  style?: 'distant' | 'present' | 'powerful';
}

export const TRAILER_SUBTITLES: SubtitleCue[] = [
  // Act 1: Rock Bottom (starts at ~2s after static intro)
  { start: 2.0, end: 4.0, text: 'I almost died.', style: 'distant' },
  { start: 4.5, end: 8.5, text: 'I went to five rehabs. Thousands of AA meetings.\nHundreds of therapy sessions.', style: 'distant' },
  { start: 9.0, end: 10.5, text: 'And it got worse.', style: 'distant' },
  { start: 11.0, end: 13.5, text: 'I was drinking myself to death\nin one room in Venice Beach.', style: 'distant' },
  // Act 2: The Download (starts ~15s)
  { start: 15.5, end: 18.0, text: 'And then... the mother showed up.', style: 'present' },
  { start: 19.0, end: 23.5, text: 'She said: that ten years\nof what you thought was hell\nwas necessary for what you\nare going to do now.', style: 'present' },
  { start: 24.0, end: 26.5, text: 'People will listen —\nbecause of your truth.', style: 'present' },
  // Act 3: The Truth (starts ~28.5s)
  { start: 28.5, end: 31.5, text: 'Spirituality is simply\nunexplained science.', style: 'powerful' },
  // Climax
  { start: 33.0, end: 35.0, text: 'GOD IS FREQUENCY.', style: 'powerful' },
];

export const useTrailerAudio = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleCue | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Create audio element on mount
  useEffect(() => {
    const audio = new Audio('/audio/frequency_trailer_v1.mp3');
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioElementRef.current = audio;

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setIsEnded(true);
    });

    audio.addEventListener('canplaythrough', () => {
      // Audio is loaded and ready
    });

    return () => {
      audio.pause();
      audio.src = '';
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Subtitle sync loop
  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      const audio = audioElementRef.current;
      if (!audio) return;
      
      const t = audio.currentTime;
      setCurrentTime(t);

      const active = TRAILER_SUBTITLES.find(s => t >= s.start && t <= s.end) || null;
      setCurrentSubtitle(active);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const startTrailer = useCallback(async () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    try {
      const win = window as unknown as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextClass = window.AudioContext || win.webkitAudioContext;
      
      if (!audioContextRef.current) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination); // So we can hear it too
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      audio.currentTime = 0;
      await audio.play();
      setIsPlaying(true);
      setIsReady(true);
      setIsEnded(false);
    } catch (err) {
      console.error('Error starting trailer audio:', err);
    }
  }, []);

  const skipTrailer = useCallback(() => {
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setIsEnded(true);
    setCurrentSubtitle(null);
  }, []);

  const getFrequencyData = useCallback(() => {
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
      high: highSum / (bufferLength - 2 * third),
    };
  }, []);

  return {
    isPlaying,
    isReady, // true once audio context + analyser are wired
    isEnded,
    currentTime,
    currentSubtitle,
    startTrailer,
    skipTrailer,
    getFrequencyData,
  };
};
