// src/contexts/PlaybackContext.tsx
// ✅ COMPLETE: With skip support

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode, RefObject } from 'react';
import { Howl } from 'howler';
// ✅ FIXED: Removed static Tone import - will be dynamically loaded
import { Track } from '../types/track';
import { TimeStretchEngine, TimeStretchInfo } from '../types/audioEngine';
import { SoundTouchEngine } from '../utils/soundTouchEngine';
import { isIOS, isAutoplayBlocked, getAutoplayErrorMessage } from '../utils/browserDetection';

export type PlaybackMode = 'single' | 'dual';

interface PlaybackState {
  mode: PlaybackMode;
  track?: Track;
  mashup?: { track1: Track; track2: Track };
  isPlaying: boolean;
  engine: TimeStretchEngine;
  autoMixEnabled: boolean;
}

interface PlaybackContextValue {
  state: PlaybackState;
  
  playSingleTrack: (track: Track) => void;
  playMashup: (track1: Track, track2: Track) => void;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  
  volume: number;
  setVolume: (vol: number) => void;
  crossfade: number;
  setCrossfade: (value: number) => void;

  currentTime: number;
  duration: number;

  timeStretchEngine: TimeStretchEngine;
  setTimeStretchEngine: (engine: TimeStretchEngine) => void;
  
  timeStretchInfo: TimeStretchInfo | null;
  
  autoMixEnabled: boolean;
  setAutoMixEnabled: (enabled: boolean) => void;
  
  audio1Ref: RefObject<HTMLAudioElement>;
  audio2Ref: RefObject<HTMLAudioElement>;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlaybackState>({
    mode: 'single',
    isPlaying: false,
    engine: 'none',
    autoMixEnabled: true,
  });
  
  const [volume, setVolumeState] = useState(0.7);
  const [crossfade, setCrossfadeState] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeStretchEngine, setTimeStretchEngineState] = useState<TimeStretchEngine>('soundtouch');
  const [timeStretchInfo, setTimeStretchInfo] = useState<TimeStretchInfo | null>(null);
  
  const howlerRef = useRef<Howl | null>(null);
  const soundTouch1Ref = useRef<SoundTouchEngine | null>(null);
  const soundTouch2Ref = useRef<SoundTouchEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const tonePlayer1Ref = useRef<Tone.Player | null>(null);
  const tonePlayer2Ref = useRef<Tone.Player | null>(null);
  const toneCrossfaderRef = useRef<Tone.CrossFade | null>(null);
  const toneGainRef = useRef<Tone.Gain | null>(null);
  const toneStartTimeRef = useRef<number>(0);

  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);

  // Progress tracking
  useEffect(() => {
    if (!state.isPlaying) return;

    const interval = setInterval(() => {
      if (state.mode === 'single' && howlerRef.current) {
        const time = howlerRef.current.seek();
        if (typeof time === 'number') {
          setCurrentTime(time);
        }
      } 
      else if (state.mode === 'dual') {
        if (state.engine === 'none' && audio1Ref.current) {
          setCurrentTime(audio1Ref.current.currentTime);
        } 
        else if (state.engine === 'soundtouch' && soundTouch1Ref.current) {
          const time = soundTouch1Ref.current.getCurrentTime();
          setCurrentTime(time);
        }
        else if (state.engine === 'tone' && toneStartTimeRef.current > 0) {
          // ✅ FIXED: Dynamically load Tone for time calculations
          import('tone').then(Tone => {
            const elapsed = Tone.now() - toneStartTimeRef.current;
            setCurrentTime(Math.max(0, elapsed));
          }).catch(() => {
            // Tone.js not loaded, skip time update
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state.isPlaying, state.mode, state.engine]);

  // Volume changes
  useEffect(() => {
    if (howlerRef.current) {
      howlerRef.current.volume(volume);
    }
    
    if (state.mode === 'dual') {
      if (state.engine === 'none') {
        if (audio1Ref.current && audio2Ref.current) {
          audio1Ref.current.volume = volume * (1 - crossfade);
          audio2Ref.current.volume = volume * crossfade;
        }
      } else if (state.engine === 'soundtouch') {
        if (soundTouch1Ref.current && soundTouch2Ref.current) {
          soundTouch1Ref.current.setVolume(volume * (1 - crossfade));
          soundTouch2Ref.current.setVolume(volume * crossfade);
        }
      } else if (state.engine === 'tone' && toneGainRef.current) {
        try {
          toneGainRef.current.gain.value = volume;
        } catch (e) {
          console.warn('Tone volume update failed:', e);
        }
      }
    }
  }, [volume, crossfade, state.mode, state.engine]);

  // Crossfade changes
  useEffect(() => {
    if (state.mode !== 'dual') return;

    if (state.engine === 'none') {
      if (audio1Ref.current && audio2Ref.current) {
        audio1Ref.current.volume = volume * (1 - crossfade);
        audio2Ref.current.volume = volume * crossfade;
      }
    } else if (state.engine === 'soundtouch') {
      if (soundTouch1Ref.current && soundTouch2Ref.current) {
        soundTouch1Ref.current.setVolume(volume * (1 - crossfade));
        soundTouch2Ref.current.setVolume(volume * crossfade);
      }
    } else if (state.engine === 'tone' && toneCrossfaderRef.current) {
      toneCrossfaderRef.current.fade.value = crossfade;
    }
  }, [crossfade, volume, state.mode, state.engine]);

  useEffect(() => {
    return () => {
      cleanupAllEngines();
    };
  }, []);

  const cleanupAllEngines = useCallback(() => {
    if (howlerRef.current) {
      howlerRef.current.unload();
      howlerRef.current = null;
    }

    if (soundTouch1Ref.current) {
      soundTouch1Ref.current.dispose();
      soundTouch1Ref.current = null;
    }
    if (soundTouch2Ref.current) {
      soundTouch2Ref.current.dispose();
      soundTouch2Ref.current = null;
    }

    try {
      if (tonePlayer1Ref.current) {
        if (tonePlayer1Ref.current.state === 'started') {
          tonePlayer1Ref.current.stop();
        }
        tonePlayer1Ref.current.dispose();
        tonePlayer1Ref.current = null;
      }
      if (tonePlayer2Ref.current) {
        if (tonePlayer2Ref.current.state === 'started') {
          tonePlayer2Ref.current.stop();
        }
        tonePlayer2Ref.current.dispose();
        tonePlayer2Ref.current = null;
      }
      if (toneCrossfaderRef.current) {
        toneCrossfaderRef.current.dispose();
        toneCrossfaderRef.current = null;
      }
      if (toneGainRef.current) {
        toneGainRef.current.dispose();
        toneGainRef.current = null;
      }
    } catch (e) {
      console.warn('Tone.js cleanup error:', e);
    }

    if (audio1Ref.current) {
      audio1Ref.current.pause();
      audio1Ref.current.src = '';
    }
    if (audio2Ref.current) {
      audio2Ref.current.pause();
      audio2Ref.current.src = '';
    }

    toneStartTimeRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    console.log('⏹️ Stopping playback');
    cleanupAllEngines();
    setState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      track: undefined, 
      mashup: undefined 
    }));
    setTimeStretchInfo(null);
    setCurrentTime(0);
    setDuration(0);
  }, [cleanupAllEngines]);

  const pause = useCallback(() => {
    console.log('⏸️ Pausing playback, engine:', state.engine);
    
    if (howlerRef.current) {
      howlerRef.current.pause();
    }
    
    if (soundTouch1Ref.current) {
      soundTouch1Ref.current.stop();
    }
    if (soundTouch2Ref.current) {
      soundTouch2Ref.current.stop();
    }
    
    if (tonePlayer1Ref.current?.state === 'started') {
      tonePlayer1Ref.current.stop();
    }
    if (tonePlayer2Ref.current?.state === 'started') {
      tonePlayer2Ref.current.stop();
    }

    if (audio1Ref.current) audio1Ref.current.pause();
    if (audio2Ref.current) audio2Ref.current.pause();

    setState(prev => ({ ...prev, isPlaying: false }));
    console.log('✅ Playback paused');
  }, [state.engine]);

  const seek = useCallback((time: number) => {
    console.log('🎯 Seeking to:', time, 'Engine:', state.engine);
    
    if (howlerRef.current) {
      howlerRef.current.seek(time);
      setCurrentTime(time);
    } else if (state.engine === 'none' && audio1Ref.current) {
      audio1Ref.current.currentTime = time;
      if (audio2Ref.current) {
        audio2Ref.current.currentTime = time;
      }
      setCurrentTime(time);
    } else {
      console.warn('⚠️ Seeking not supported for engine:', state.engine);
    }
  }, [state.engine]);

  // ✅ NEW: Skip function (works with seekable engines only)
  const skip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    
    console.log(`⏭️ Skipping ${seconds}s to:`, newTime);
    
    // Only works with Howler or HTMLAudio engines
    if (state.engine === 'none' || state.mode === 'single') {
      seek(newTime);
    } else {
      console.warn('⚠️ Skip not available with time-stretch engines');
    }
  }, [currentTime, duration, seek, state.engine, state.mode]);

  const playSingleTrack = useCallback((track: Track) => {
    console.log('🎵 Playing single track (Howler.js):', track.name);
    
    cleanupAllEngines();
    
    if (!track.audioUrl) {
      alert('Cannot play track. Please re-upload.');
      return;
    }

    const howl = new Howl({
      src: [track.audioUrl],
      html5: true,
      volume: volume,
      onload: () => {
        console.log('✅ Howler loaded:', track.name);
        setDuration(howl.duration());
      },
      onplay: () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      },
      onend: () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      },
      onerror: (id, error) => {
        console.error('❌ Howler error:', error);
        alert('Failed to play track');
      },
    });

    howlerRef.current = howl;
    
    setState({
      mode: 'single',
      track,
      isPlaying: false,
      engine: 'none',
      autoMixEnabled: state.autoMixEnabled,
    });

    setCurrentTime(0);
    setTimeStretchInfo(null);
    howl.play();
  }, [volume, cleanupAllEngines, state.autoMixEnabled]);

  const playMashup = useCallback(async (track1: Track, track2: Track) => {
    console.log('🎵 Playing mashup, engine:', timeStretchEngine, 'Auto-Mix:', state.autoMixEnabled);
    
    cleanupAllEngines();

    if (!track1.audioUrl || !track2.audioUrl) {
      alert('Cannot play mashup: missing audio files');
      return;
    }

    const targetBPM = state.autoMixEnabled ? (track1.bpm + track2.bpm) / 2 : 0;
    const track1Rate = state.autoMixEnabled ? targetBPM / track1.bpm : 1.0;
    const track2Rate = state.autoMixEnabled ? targetBPM / track2.bpm : 1.0;

    console.log(`🎛️ Rates: Track1=${track1Rate.toFixed(3)}, Track2=${track2Rate.toFixed(3)}, Target=${targetBPM.toFixed(1)} BPM`);

    setState({
      mode: 'dual',
      mashup: { track1, track2 },
      isPlaying: false,
      engine: timeStretchEngine,
      autoMixEnabled: state.autoMixEnabled,
    });

    if (timeStretchEngine === 'none') {
      console.log('🎧 Using HTMLAudio');
      
      if (!audio1Ref.current || !audio2Ref.current) return;

      audio1Ref.current.src = track1.audioUrl;
      audio2Ref.current.src = track2.audioUrl;
      
      if (state.autoMixEnabled) {
        audio1Ref.current.playbackRate = track1Rate;
        audio2Ref.current.playbackRate = track2Rate;
      } else {
        audio1Ref.current.playbackRate = 1.0;
        audio2Ref.current.playbackRate = 1.0;
      }
      
      audio1Ref.current.volume = volume * (1 - crossfade);
      audio2Ref.current.volume = volume * crossfade;
      
      setTimeStretchInfo({
        engine: 'none',
        track1Rate: state.autoMixEnabled ? track1Rate : 1.0,
        track2Rate: state.autoMixEnabled ? track2Rate : 1.0,
        targetBPM: state.autoMixEnabled ? targetBPM : 0,
        quality: 'basic',
      });

      try {
        audio1Ref.current.onloadedmetadata = () => {
          const actualDuration = state.autoMixEnabled 
            ? audio1Ref.current!.duration / track1Rate 
            : audio1Ref.current!.duration;
          setDuration(actualDuration);
          console.log('✅ HTMLAudio duration:', actualDuration);
        };

        // ✅ FIXED: Better error handling with iOS/Safari detection
        await audio1Ref.current.play().catch((err: Error) => {
          console.error('❌ Audio1 playback failed:', err);
          if (isAutoplayBlocked()) {
            alert(getAutoplayErrorMessage());
          } else {
            alert('Failed to play audio. Please click the play button again.');
          }
          throw err;
        });
        
        await audio2Ref.current.play().catch((err: Error) => {
          console.error('❌ Audio2 playback failed:', err);
          if (isAutoplayBlocked()) {
            alert(getAutoplayErrorMessage());
          } else {
            alert('Failed to play audio. Please click the play button again.');
          }
          throw err;
        });
        
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (err) {
        console.error('❌ Playback failed:', err);
        // Error messages already handled in individual play() calls above
      }

    } else if (timeStretchEngine === 'soundtouch') {
      console.log('🎛️ Using SoundTouch.js');
      
      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
        }

        const ctx = audioContextRef.current;
        
        // ✅ FIXED: Better iOS/Safari handling for AudioContext resume
        if (ctx.state === 'suspended') {
          try {
            await ctx.resume();
            if (ctx.state === 'suspended' && isIOS()) {
              console.warn('⚠️ AudioContext still suspended on iOS - user interaction required');
            }
          } catch (resumeErr) {
            console.error('Failed to resume AudioContext:', resumeErr);
            if (isAutoplayBlocked()) {
              alert(getAutoplayErrorMessage());
            }
            throw resumeErr;
          }
        }
        
        const [buffer1, buffer2] = await Promise.all([
          fetch(track1.audioUrl).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)),
          fetch(track2.audioUrl).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)),
        ]);

        soundTouch1Ref.current = new SoundTouchEngine(ctx);
        soundTouch2Ref.current = new SoundTouchEngine(ctx);

        soundTouch1Ref.current.setVolume(volume * (1 - crossfade));
        soundTouch2Ref.current.setVolume(volume * crossfade);

        await Promise.all([
          soundTouch1Ref.current.loadAndPlay(buffer1, track1Rate, 1.0),
          soundTouch2Ref.current.loadAndPlay(buffer2, track2Rate, 1.0),
        ]);

        setState(prev => ({ ...prev, isPlaying: true }));
        
        const stretchedDuration = buffer1.duration / track1Rate;
        setDuration(stretchedDuration);
        
        setTimeStretchInfo({
          engine: 'soundtouch',
          track1Rate,
          track2Rate,
          targetBPM: state.autoMixEnabled ? targetBPM : 0,
          quality: 'perfect',
        });
        
        console.log('✅ SoundTouch duration:', stretchedDuration);

      } catch (err) {
        console.error('❌ SoundTouch failed:', err);
        // ✅ FIXED: Better error message with iOS/Safari info
        const errorMsg = isAutoplayBlocked() 
          ? `${getAutoplayErrorMessage()} If problem persists, try switching to Simple engine in Settings.`
          : 'SoundTouch failed. Try switching to Tone.js or Simple engine in Settings.';
        alert(errorMsg);
      }

    } else if (timeStretchEngine === 'tone') {
      console.log('🎹 Using Tone.js');
      
      try {
        // ✅ FIXED: Dynamically load Tone.js
        const Tone = await import('tone').catch((err) => {
          console.error('Failed to load Tone.js:', err);
          throw new Error('Tone.js engine failed to load. Please refresh the page or switch to a different engine.');
        });
        
        await Tone.start();

        const player1 = new Tone.Player({
          url: track1.audioUrl,
          playbackRate: track1Rate,
        });

        const player2 = new Tone.Player({
          url: track2.audioUrl,
          playbackRate: track2Rate,
        });

        const crossfader = new Tone.CrossFade(crossfade);
        const master = new Tone.Gain(volume);

        player1.connect(crossfader.a);
        player2.connect(crossfader.b);
        crossfader.connect(master);
        master.toDestination();

        tonePlayer1Ref.current = player1;
        tonePlayer2Ref.current = player2;
        toneCrossfaderRef.current = crossfader;
        toneGainRef.current = master;

        await Tone.loaded();

        toneStartTimeRef.current = Tone.now();
        
        player1.start();
        player2.start();

        setState(prev => ({ ...prev, isPlaying: true }));
        
        const stretchedDuration = player1.buffer.duration / track1Rate;
        setDuration(stretchedDuration);

        setTimeStretchInfo({
          engine: 'tone',
          track1Rate,
          track2Rate,
          targetBPM: state.autoMixEnabled ? targetBPM : 0,
          quality: 'good',
        });
        
        console.log('✅ Tone.js duration:', stretchedDuration);

      } catch (err) {
        console.error('❌ Tone.js failed:', err);
        // ✅ FIXED: Better error message with iOS/Safari info
        const errorMsg = err instanceof Error && err.message.includes('load')
          ? err.message
          : isAutoplayBlocked()
          ? `${getAutoplayErrorMessage()} If problem persists, try switching to SoundTouch or Simple engine in Settings.`
          : 'Tone.js failed. Try switching to SoundTouch or Simple engine in Settings.';
        alert(errorMsg);
      }
    }
  }, [timeStretchEngine, volume, crossfade, cleanupAllEngines, state.autoMixEnabled]);

  const togglePlayPause = useCallback(() => {
    console.log('⏯️ Toggle play/pause, isPlaying:', state.isPlaying);
    
    if (state.isPlaying) {
      pause();
    } else {
      if (state.mode === 'single' && state.track) {
        if (howlerRef.current && !state.isPlaying) {
          howlerRef.current.play();
          setState(prev => ({ ...prev, isPlaying: true }));
        } else {
          playSingleTrack(state.track);
        }
      } else if (state.mode === 'dual' && state.mashup) {
        playMashup(state.mashup.track1, state.mashup.track2);
      }
    }
  }, [state, pause, playSingleTrack, playMashup]);

  const setAutoMixEnabledHandler = useCallback((enabled: boolean) => {
    console.log('🎚️ Auto-Mix toggled:', enabled);
    setState(prev => ({ ...prev, autoMixEnabled: enabled }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const setCrossfade = useCallback((val: number) => {
    setCrossfadeState(val);
  }, []);

  const setTimeStretchEngine = useCallback((engine: TimeStretchEngine) => {
    console.log('🎛️ Engine changed to:', engine);
    setTimeStretchEngineState(engine);
  }, []);

  const value: PlaybackContextValue = {
    state,
    playSingleTrack,
    playMashup,
    pause,
    stop,
    togglePlayPause,
    seek,
    skip,
    volume,
    setVolume,
    crossfade,
    setCrossfade,
    currentTime,
    duration,
    timeStretchEngine,
    setTimeStretchEngine,
    timeStretchInfo,
    autoMixEnabled: state.autoMixEnabled,
    setAutoMixEnabled: setAutoMixEnabledHandler,
    audio1Ref,
    audio2Ref,
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <audio ref={audio1Ref} preload="auto" style={{ display: 'none' }} />
      <audio ref={audio2Ref} preload="auto" style={{ display: 'none' }} />
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}