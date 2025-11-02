import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface AudioContextType {
  currentlyPlayingId: string | null;
  setCurrentlyPlaying: (id: string | null) => void;
  stopAllAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );

  const setCurrentlyPlaying = useCallback((id: string | null) => {
    setCurrentlyPlayingId(id);
  }, []);

  const stopAllAudio = useCallback(() => {
    setCurrentlyPlayingId(null);
  }, []);

  return (
    <AudioContext.Provider
      value={{ currentlyPlayingId, setCurrentlyPlaying, stopAllAudio }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
