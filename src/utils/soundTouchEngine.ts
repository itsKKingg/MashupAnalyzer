// src/utils/soundTouchEngine.ts
// ✅ POLISHED: Production-ready with proper error handling

import { SoundTouch, SimpleFilter } from 'soundtouchjs';

const DEBUG = import.meta.env.DEV;
const log = (...args: unknown[]) => DEBUG && console.log(...args);

export class SoundTouchEngine {
  private audioContext: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private startTime: number = 0;
  private isDisposed: boolean = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.gainNode = audioContext.createGain();
    this.gainNode.connect(audioContext.destination);
  }

  async loadAndPlay(
    audioBuffer: AudioBuffer,
    tempo: number,
    pitch: number = 1.0
  ): Promise<void> {
    if (this.isDisposed) {
      throw new Error('SoundTouchEngine has been disposed');
    }

    this.stop();

    log('🎛️ SoundTouch processing:', { tempo, pitch, duration: audioBuffer.duration });

    try {
      // Extract and interleave audio channels
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel =
        audioBuffer.numberOfChannels > 1
          ? audioBuffer.getChannelData(1)
          : leftChannel;

      const interleavedInput = this.interleaveChannels(leftChannel, rightChannel);

      // Configure SoundTouch
      const soundtouch = new SoundTouch();
      soundtouch.tempo = tempo;
      soundtouch.pitch = pitch;

      // Process audio
      const processedSamples = this.processAudio(soundtouch, interleavedInput);

      if (processedSamples.length === 0) {
        throw new Error('SoundTouch processing produced no output');
      }

      log('✅ SoundTouch processed:', processedSamples.length / 2, 'frames');

      // Create output buffer
      const stretchedBuffer = this.createOutputBuffer(
        processedSamples,
        audioBuffer.sampleRate
      );

      // Play
      this.playBuffer(stretchedBuffer);

      log('🎵 SoundTouch playback started at', this.startTime);
    } catch (error) {
      console.error('❌ SoundTouch processing failed:', error);
      throw error;
    }
  }

  private interleaveChannels(
    left: Float32Array,
    right: Float32Array
  ): Float32Array {
    const interleaved = new Float32Array(left.length * 2);
    for (let i = 0; i < left.length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
    return interleaved;
  }

  private processAudio(
    soundtouch: SoundTouch,
    interleavedInput: Float32Array
  ): number[] {
    let extractPosition = 0;

    const source = {
      extract: (target: Float32Array, numFrames: number): number => {
        const startIndex = extractPosition * 2;
        const endIndex = Math.min(
          startIndex + numFrames * 2,
          interleavedInput.length
        );
        const actualFrames = Math.floor((endIndex - startIndex) / 2);

        for (let i = 0; i < actualFrames * 2; i++) {
          target[i] = interleavedInput[startIndex + i];
        }

        extractPosition += actualFrames;
        return actualFrames;
      },
    };

    const filter = new SimpleFilter(source, soundtouch);
    const processedSamples: number[] = [];
    const bufferSize = 4096;
    const extractBuffer = new Float32Array(bufferSize * 2);

    let framesExtracted: number;
    do {
      framesExtracted = filter.extract(extractBuffer, bufferSize);
      if (framesExtracted > 0) {
        for (let i = 0; i < framesExtracted * 2; i++) {
          processedSamples.push(extractBuffer[i]);
        }
      }
    } while (framesExtracted > 0);

    return processedSamples;
  }

  private createOutputBuffer(
    processedSamples: number[],
    sampleRate: number
  ): AudioBuffer {
    const outputFrames = Math.floor(processedSamples.length / 2);
    const stretchedBuffer = this.audioContext.createBuffer(
      2,
      outputFrames,
      sampleRate
    );

    const leftOut = stretchedBuffer.getChannelData(0);
    const rightOut = stretchedBuffer.getChannelData(1);

    for (let i = 0; i < outputFrames; i++) {
      leftOut[i] = processedSamples[i * 2];
      rightOut[i] = processedSamples[i * 2 + 1];
    }

    return stretchedBuffer;
  }

  private playBuffer(buffer: AudioBuffer): void {
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.connect(this.gainNode);

    this.startTime = this.audioContext.currentTime;
    this.sourceNode.start(0);
  }

  setVolume(volume: number): void {
    if (this.gainNode && !this.isDisposed) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentTime(): number {
    if (!this.sourceNode || this.startTime === 0) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.sourceNode = null;
    }
    this.startTime = 0;
  }

  dispose(): void {
    this.stop();
    if (this.gainNode && !this.isDisposed) {
      try {
        this.gainNode.disconnect();
      } catch (e) {
        // Already disconnected
      }
    }
    this.isDisposed = true;
  }
}