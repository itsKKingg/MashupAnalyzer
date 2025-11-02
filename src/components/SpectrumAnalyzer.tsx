// src/components/SpectrumAnalyzer.tsx
// Real-time spectrum analyzer using Meyda.js

import { useEffect, useRef, useState } from 'react';
import Meyda from 'meyda';
import { Activity, Waves, BarChart3 } from 'lucide-react';

interface SpectrumAnalyzerProps {
  audioElement?: HTMLAudioElement | null;
  isPlaying: boolean;
  mode?: 'spectrum' | 'waveform' | 'energy';
  height?: number;
  color?: string;
  showControls?: boolean;
}

export function SpectrumAnalyzer({
  audioElement,
  isPlaying,
  mode: initialMode = 'spectrum',
  height = 80,
  color = '#3b82f6',
  showControls = false,
}: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<Meyda.MeydaAnalyzer | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (!audioElement || !isPlaying) {
      // Stop analysis when not playing
      if (analyzerRef.current) {
        analyzerRef.current.stop();
        analyzerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setIsAnalyzing(false);
      return;
    }

    try {
      // Reuse existing audio context or create new one
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      // Create source only if it doesn't exist
      if (!sourceRef.current) {
        try {
          sourceRef.current = audioContext.createMediaElementSource(audioElement);
          // IMPORTANT: Reconnect to destination (otherwise audio won't play)
          sourceRef.current.connect(audioContext.destination);
        } catch (err) {
          // Source already created for this element
          console.warn('Media element source already exists, reusing');
        }
      }

      const source = sourceRef.current;

      // Create Meyda analyzer
      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContext,
        source: source as any,
        bufferSize: 512,
        featureExtractors: [
          'amplitudeSpectrum',
          'rms',
          'energy',
          'spectralCentroid',
          'zcr'
        ],
        callback: (features: any) => {
          if (features && canvasRef.current) {
            drawVisualization(features);
            setCurrentEnergy(features.energy || 0);
          }
        }
      });

      analyzer.start();
      analyzerRef.current = analyzer;
      setIsAnalyzing(true);

      console.log('✅ Spectrum analyzer started');

      return () => {
        if (analyzer) {
          analyzer.stop();
        }
      };

    } catch (error) {
      console.error('Failed to create spectrum analyzer:', error);
      setIsAnalyzing(false);
    }
  }, [audioElement, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop();
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const drawVisualization = (features: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(17, 24, 39, 0.3)'; // dark background with transparency
    ctx.fillRect(0, 0, width, height);

    if (mode === 'spectrum') {
      // Draw frequency spectrum
      const spectrum = features.amplitudeSpectrum || [];
      const barCount = Math.min(64, spectrum.length); // Limit bars for performance
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const index = Math.floor((i / barCount) * spectrum.length);
        const barHeight = (spectrum[index] / 255) * height * 2; // Scale amplitude
        const x = i * barWidth;
        const y = height - barHeight;

        // Gradient color based on frequency
        const hue = 220 + (i / barCount) * 60; // Blue to purple gradient
        const saturation = 70 + (barHeight / height) * 30; // Brighter when louder
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, 60%)`;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

    } else if (mode === 'waveform') {
      // Draw waveform (simplified using RMS)
      const rms = features.rms || 0;
      const amplitude = Math.min((rms / 0.3) * height * 0.4, height * 0.45);

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      
      // Simulate waveform with sine curve
      for (let x = 0; x < width; x += 3) {
        const phase = (x / width) * Math.PI * 8;
        const y = height / 2 + Math.sin(phase) * amplitude * (0.8 + Math.random() * 0.4);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Add glow effect
      ctx.strokeStyle = color + '40';
      ctx.lineWidth = 8;
      ctx.stroke();

    } else if (mode === 'energy') {
      // Energy meter (vertical bars)
      const energy = Math.min(features.energy || 0, 100);
      const energyHeight = (energy / 100) * height;

      // Gradient from green to red
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#10b981'); // green
      gradient.addColorStop(0.5, '#eab308'); // yellow
      gradient.addColorStop(0.8, '#f59e0b'); // orange
      gradient.addColorStop(1, '#ef4444'); // red

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - energyHeight, width, energyHeight);

      // Draw level markers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const y = (i / 10) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Peak indicator
      if (energy > 80) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 0, width, 5);
      }
    }
  };

  return (
    <div className="relative bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className="w-full"
        style={{ height: `${height}px` }}
      />

      {/* Overlay info */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isAnalyzing ? (
          <>
            <Activity className="text-green-400 animate-pulse" size={16} />
            <span className="text-xs text-green-400 font-mono">
              {mode === 'energy' && `${currentEnergy.toFixed(1)} dB`}
            </span>
          </>
        ) : (
          <Waves className="text-gray-500" size={16} />
        )}
      </div>

      {/* Mode label and controls */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase font-semibold">
          {mode === 'spectrum' && '🎵 Spectrum'}
          {mode === 'waveform' && '〰️ Waveform'}
          {mode === 'energy' && '📊 Energy'}
        </span>

        {/* Mode switcher */}
        {showControls && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setMode('spectrum')}
              className={`p-1 rounded ${mode === 'spectrum' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
              title="Spectrum"
            >
              <BarChart3 size={12} />
            </button>
            <button
              onClick={() => setMode('waveform')}
              className={`p-1 rounded ${mode === 'waveform' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
              title="Waveform"
            >
              <Waves size={12} />
            </button>
            <button
              onClick={() => setMode('energy')}
              className={`p-1 rounded ${mode === 'energy' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
              title="Energy"
            >
              <Activity size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Placeholder when not playing */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
          <div className="text-center">
            <Waves className="text-gray-600 mx-auto mb-2" size={32} />
            <p className="text-sm text-gray-500">Play to see visualization</p>
          </div>
        </div>
      )}
    </div>
  );
}