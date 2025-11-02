/// <reference types="vite/client" />

declare module 'essentia.js/dist/essentia.js-core.es.js' {
  export default class Essentia {
    constructor(wasm: any);
    RhythmExtractor2013(signal: Float32Array, params?: any): {
      bpm: number;
      ticks: number[];
      confidence: number;
      [key: string]: any;
    };
    KeyExtractor(audio: Float32Array, params?: any): {
      key: string;
      scale: string;
      strength: number;
      [key: string]: any;
    };
    RMS(array: Float32Array): {
      rms: number;
    };
    Energy(array: Float32Array): {
      energy: number;
    };
    SpectralCentroidTime(signal: Float32Array, sampleRate: number): number;
    SpectralRolloffTime(signal: Float32Array, sampleRate: number): number;
    ZeroCrossingRate(signal: Float32Array): number;
    shutdown(): void;
  }
}

declare module 'essentia.js/dist/essentia-wasm.web.js' {
  const EssentiaWASM: any;
  export default EssentiaWASM;
}

declare module 'essentia.js';