import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMicAudio } from '../useMicAudio';

describe('useMicAudio', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn>; kind: string };
  let mockStream: { getTracks: ReturnType<typeof vi.fn> };
  let mockAnalyser: {
    fftSize: number;
    frequencyBinCount: number;
    getByteFrequencyData: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };
  let mockSource: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let mockClose: ReturnType<typeof vi.fn>;
  let mockAudioContext: {
    state: string;
    close: ReturnType<typeof vi.fn>;
    createAnalyser: ReturnType<typeof vi.fn>;
    createMediaStreamSource: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTrack = { stop: vi.fn(), kind: 'audio' };
    mockStream = { getTracks: vi.fn(() => [mockTrack]) };
    mockAnalyser = {
      fftSize: 256,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
    };
    mockSource = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    mockClose = vi.fn();
    mockAudioContext = {
      state: 'suspended',
      close: mockClose,
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => mockSource),
    };

    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext — must be a real class so `new` works
    class MockAudioContext {
      state = mockAudioContext.state;
      close = mockAudioContext.close;
      createAnalyser = mockAudioContext.createAnalyser;
      createMediaStreamSource = mockAudioContext.createMediaStreamSource;
    }
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops media tracks and closes AudioContext on unmount', async () => {
    const { result, unmount } = renderHook(() => useMicAudio());

    // Start audio to acquire resources
    await act(async () => {
      await result.current.startAudio();
    });

    expect(result.current.isReady).toBe(true);

    // Unmount the hook
    unmount();

    // Verify cleanup happened
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('exposes stopAudio to manually release resources', async () => {
    const { result } = renderHook(() => useMicAudio());

    await act(async () => {
      await result.current.startAudio();
    });

    expect(result.current.isReady).toBe(true);

    // Manually stop
    act(() => {
      result.current.stopAudio();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect(result.current.isReady).toBe(false);
  });
});
