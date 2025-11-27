// src/workers/audioAnalysis.worker.ts
// Optimized for speed - Combo A

// STEP 1: Define globals that UMD modules expect (MUST BE FIRST!)
self.exports = {};
self.module = { exports: {} };

const workerUrl = (() => {
  try {
    return new URL(self.location.href);
  } catch {
    return null;
  }
})();

const ESSENTIA_BASE_URL = (() => {
  try {
    if (!workerUrl) return '/essentia/';
    return new URL('../essentia/', workerUrl).toString();
  } catch {
    return '/essentia/';
  }
})();

function resolveEssentiaAsset(path) {
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return new URL(cleanPath, ESSENTIA_BASE_URL).toString();
}

const FETCH_TIMEOUT_MS = 20000;

async function fetchWithRetry(url, options = {}, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: 'reload',
        credentials: 'same-origin',
        mode: 'same-origin',
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      clearTimeout(timer);
      if (attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function instantiateEssentiaBinary(imports, receiveInstance) {
  const wasmPath = resolveEssentiaAsset('essentia-wasm.umd.wasm');
  const response = await fetchWithRetry(wasmPath, {
    headers: { Accept: 'application/wasm' },
  }, 2);

  if (typeof WebAssembly.instantiateStreaming === 'function') {
    try {
      const streamingResult = await WebAssembly.instantiateStreaming(response.clone(), imports);
      receiveInstance(streamingResult.instance);
      return streamingResult.instance.exports;
    } catch (streamError) {
      console.warn('[Worker] instantiateStreaming failed, using ArrayBuffer fallback:', streamError.message);
    }
  }

  const wasmBinary = await response.arrayBuffer();
  const result = await WebAssembly.instantiate(wasmBinary, imports);
  receiveInstance(result.instance);
  return result.instance.exports;
}

function ensureFloat32Array(data) {
  if (data instanceof Float32Array) return data;
  if (data instanceof ArrayBuffer) return new Float32Array(data);
  if (ArrayBuffer.isView(data)) return new Float32Array(data.buffer);
  return new Float32Array(data || []);
}

// STEP 2: Load Essentia UMD builds
importScripts(
  resolveEssentiaAsset('essentia.js-extractor.umd.js'),
  resolveEssentiaAsset('essentia-wasm.umd.js')
);

// STEP 3: Type declarations

const CONFIG = {
  TARGET_SAMPLE_RATE: 22050,     // Keep high quality
  DURATION_QUICK: 15,             // Quick mode: 15s
  DURATION_FULL: 30,              // 🔥 Full mode: 30s (was 90s)
  DURATION_HIGH_PRECISION: 45,    // 🔥 High precision: 45s (was 120s)
  SEGMENT_SAMPLES: {
    light: 20000,
    standard: 15000,
    detailed: 5000,
  },
  ONSET_HOP_SIZE: 512,
  MAX_SEGMENTS: 2,                // 🔥 Only 2 segments per track
};

let essentiaInstance = null;
let isInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

async function initializeEssentia() {
  if (isInitialized && essentiaInstance) return true;

  initializationAttempts++;
  
  try {
    const EssentiaClass = (self.module).exports;
    const WASMModule = (self).exports?.EssentiaWASM;
    
    if (typeof EssentiaClass !== 'function') {
      throw new Error('EssentiaExtractor not found');
    }
    
    if (!WASMModule) {
      throw new Error('EssentiaWASM not found');
    }
    
    let wasmModule;
    if (typeof WASMModule === 'function') {
      wasmModule = await WASMModule({
        locateFile: (path) => resolveEssentiaAsset(path),
        instantiateWasm: instantiateEssentiaBinary,
      });
    } else {
      wasmModule = WASMModule;
    }
    
    essentiaInstance = new EssentiaClass(wasmModule);
    
    isInitialized = true;
    initializationAttempts = 0;
    console.log('[Worker] ✅ Essentia initialized successfully');
    return true;
  } catch (error) {
    console.error(`[Worker] ❌ Essentia init failed (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS}):`, error.message);
    isInitialized = false;
    
    // Retry with exponential backoff
    if (initializationAttempts < MAX_INIT_ATTEMPTS) {
      const delay = Math.pow(2, initializationAttempts) * 1000;
      console.log(`[Worker] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return initializeEssentia();
    }
    
    return false;
  }
}

function preprocessAudio(audioData, originalSampleRate, originalDuration, mode) {
  let maxDuration;
  let startOffset = 0;

  switch (mode) {
    case 'quick':
      maxDuration = CONFIG.DURATION_QUICK;
      startOffset = Math.max(0, (originalDuration - maxDuration) / 2);
      break;
    case 'high-precision':
      maxDuration = CONFIG.DURATION_HIGH_PRECISION;
      break;
    case 'full':
    default:
      maxDuration = CONFIG.DURATION_FULL;
      break;
  }

  const analyzedDuration = Math.min(originalDuration, maxDuration);
  const startSample = Math.floor(startOffset * originalSampleRate);
  const endSample = Math.floor((startOffset + analyzedDuration) * originalSampleRate);

  let signal;
  if (startSample > 0 || endSample < audioData.length) {
    signal = audioData.slice(startSample, endSample);
  } else {
    signal = audioData;
  }

  if (originalSampleRate > CONFIG.TARGET_SAMPLE_RATE) {
    signal = downsample(signal, originalSampleRate, CONFIG.TARGET_SAMPLE_RATE);
  }

  return { signal, analyzedDuration };
}

function downsample(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;

  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.floor(i * ratio)];
  }

  return result;
}

function getBeatCount(vector) {
  if (!vector) return 0;
  if (Array.isArray(vector)) return vector.length;
  if (typeof vector.length === 'number') return vector.length;
  if (typeof vector.size === 'function') return vector.size();
  return 0;
}

function analyzeRhythm(signal, sampleRate) {
  if (!essentiaInstance || typeof essentiaInstance.RhythmExtractor2013 !== 'function') {
    return fallbackBPMDetection(signal, sampleRate);
  }

  try {
    let inputVector = signal;

    if (typeof essentiaInstance.arrayToVector === 'function') {
      try {
        inputVector = essentiaInstance.arrayToVector(signal);
      } catch (e) {
        inputVector = signal;
      }
    }

    const result = essentiaInstance.RhythmExtractor2013(inputVector);

    if (result && typeof result.bpm === 'number') {
      const bpm = parseFloat(result.bpm.toFixed(2));
      const beatCount = getBeatCount(result.ticks);

      if (bpm >= 60 && bpm <= 200) {
        return {
          bpm,
          confidence: result.confidence || 0.7,
          beatCount,
          beatInterval: 60 / bpm,
        };
      }
    }
  } catch (error) {
    // Silent fallback
  }

  return fallbackBPMDetection(signal, sampleRate);
}

function fallbackBPMDetection(signal, sampleRate) {
  const onsets = detectOnsets(signal, sampleRate);

  if (onsets.length < 4) {
    return {
      bpm: 120,
      confidence: 0,
      beatCount: 0,
      beatInterval: 0.5,
    };
  }

  const intervals = onsets.slice(1).map((time, i) => time - onsets[i]);
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  const validIntervals = intervals.filter(
    interval => Math.abs(interval - medianInterval) < medianInterval * 0.3
  );

  if (validIntervals.length === 0) {
    return {
      bpm: 120,
      confidence: 0.2,
      beatCount: onsets.length,
      beatInterval: 0.5,
    };
  }

  const avgInterval = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
  let bpm = parseFloat((60 / avgInterval).toFixed(2));

  while (bpm < 60) bpm = parseFloat((bpm * 2).toFixed(2));
  while (bpm > 200) bpm = parseFloat((bpm / 2).toFixed(2));

  const confidence = Math.min(validIntervals.length / intervals.length, 0.8);

  return {
    bpm,
    confidence,
    beatCount: onsets.length,
    beatInterval: avgInterval,
  };
}

function detectOnsets(signal, sampleRate) {
  const hopSize = CONFIG.ONSET_HOP_SIZE;
  const onsets = [];
  const threshold = 0.01;
  const minGap = 0.1;

  let prevEnergy = 0;
  const energyBuffer = [];
  const maxEnergyBufferSize = 10;

  for (let i = 0; i < signal.length - hopSize; i += hopSize) {
    let sumSquares = 0;
    const frameEnd = i + hopSize;
    for (let j = i; j < frameEnd; j++) {
      const val = signal[j];
      sumSquares += val * val;
    }
    const energy = sumSquares / hopSize;

    energyBuffer.push(energy);
    if (energyBuffer.length > maxEnergyBufferSize) energyBuffer.shift();

    const avgEnergy = energyBuffer.reduce((a, b) => a + b, 0) / energyBuffer.length;

    if (energy > prevEnergy * 1.5 && energy > threshold && energy > avgEnergy * 1.3) {
      const onsetTime = i / sampleRate;

      if (onsets.length === 0 || onsetTime - onsets[onsets.length - 1] > minGap) {
        onsets.push(onsetTime);
      }
    }

    prevEnergy = energy;
  }

  return onsets;
}

function analyzeKey(signal) {
  if (!essentiaInstance) {
    return { key: 'C', confidence: 0, scale: 'major' };
  }

  try {
    const possibleMethods = ['KeyExtractor', 'keyExtractor', 'KeyEDM', 'keyEDM', 'Key'];

    for (const methodName of possibleMethods) {
      if (typeof essentiaInstance[methodName] !== 'function') continue;

      try {
        let inputVector = signal;

        if (typeof essentiaInstance.arrayToVector === 'function') {
          try {
            inputVector = essentiaInstance.arrayToVector(signal);
          } catch (e) {
            inputVector = signal;
          }
        }

        const result = essentiaInstance[methodName](inputVector);

        if (result && result.key) {
          const keyNote = result.key;
          let scale = 'major';

          if (result.scale) {
            const scaleStr = String(result.scale).toLowerCase();
            if (scaleStr.includes('minor') || scaleStr === 'minor') {
              scale = 'minor';
            }
          }

          if (result.mode) {
            const modeStr = String(result.mode).toLowerCase();
            if (modeStr.includes('minor') || modeStr === 'minor' || modeStr === '0') {
              scale = 'minor';
            }
          }

          const strength = result.strength || 0;
          const formattedKey = scale === 'minor' ? `${keyNote}m` : keyNote;

          return {
            key: formattedKey,
            confidence: strength,
            scale
          };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    // Silent fail
  }

  return { key: 'C', confidence: 0, scale: 'major' };
}

function analyzeSpectralFeatures(signal, sampleRate) {
  const rms = Math.sqrt(
    signal.reduce((sum, val) => sum + val * val, 0) / signal.length
  );

  const energy = Math.min(Math.max(rms * 2, 0), 1);
  const spectralCentroid = estimateSpectralCentroid(signal, sampleRate);

  return {
    energy,
    spectralCentroid,
  };
}

function estimateSpectralCentroid(signal, sampleRate) {
  let weightedSum = 0;
  let sum = 0;

  const step = Math.max(1, Math.floor(signal.length / 1000));

  for (let i = 0; i < signal.length; i += step) {
    const magnitude = Math.abs(signal[i]);
    const frequency = (i / signal.length) * (sampleRate / 2);
    weightedSum += magnitude * frequency;
    sum += magnitude;
  }

  return sum > 0 ? weightedSum / sum : 1000;
}

function calculateRhythmicFeatures(beatCount, duration) {
  if (beatCount < 2) {
    return {
      danceability: 0.5,
      valence: 0.5,
    };
  }

  const avgInterval = duration / beatCount;
  const expectedBeats = duration / avgInterval;
  const regularity = 1 - Math.abs(beatCount - expectedBeats) / expectedBeats;

  const beatRegularity = Math.max(0, Math.min(1, regularity));
  const danceability = Math.min(Math.max(beatRegularity * 0.8 + 0.2, 0), 1);

  return {
    danceability,
    valence: 0.5,
  };
}

function createSegments(signal, sampleRate, duration, bpm, key, avgEnergy) {
  const segmentDuration = duration / CONFIG.MAX_SEGMENTS;
  const segments = [];

  for (let i = 0; i < CONFIG.MAX_SEGMENTS; i++) {
    const startTime = i * segmentDuration;
    const endTime = Math.min(startTime + segmentDuration, duration);

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const segmentLength = endSample - startSample;

    let sumSquares = 0;
    const step = Math.max(1, Math.floor(segmentLength / 1000));

    for (let j = startSample; j < endSample && j < signal.length; j += step) {
      sumSquares += signal[j] * signal[j];
    }

    const rms = Math.sqrt(sumSquares / (segmentLength / step));
    const energy = Math.min(Math.max(rms * 5, 0), 1);
    const loudness = 20 * Math.log10(rms + 0.0001);

    segments.push({
      startTime,
      endTime,
      bpm,
      key,
      energy,
      loudness
    });
  }

  return segments;
}

async function analyzeAudio(msg) {
  const { audioData, sampleRate, duration, options, id } = msg;
  const preparedAudio = ensureFloat32Array(audioData);

  const sendProgress = (progress, status) => {
    self.postMessage({
      type: 'progress',
      id,
      progress,
      status
    });
  };

  try {
    sendProgress(10, 'Preprocessing...');
    const { signal, analyzedDuration } = preprocessAudio(
      preparedAudio,
      sampleRate,
      duration,
      options.mode
    );

    sendProgress(40, 'Detecting tempo...');
    const rhythmData = analyzeRhythm(signal, CONFIG.TARGET_SAMPLE_RATE);

    sendProgress(60, 'Detecting key...');
    const keyData = analyzeKey(signal);

    sendProgress(80, 'Analyzing spectrum...');
    const spectralData = analyzeSpectralFeatures(signal, CONFIG.TARGET_SAMPLE_RATE);

    const rhythmicFeatures = calculateRhythmicFeatures(rhythmData.beatCount || 0, duration);

    sendProgress(95, 'Finalizing...');
    const segments = createSegments(
      signal,
      CONFIG.TARGET_SAMPLE_RATE,
      analyzedDuration,
      rhythmData.bpm,
      keyData.key,
      spectralData.energy
    );

    const result = {
      bpm: rhythmData.bpm,
      key: keyData.key,
      duration,
      beatCount: rhythmData.beatCount,
      beatInterval: rhythmData.beatInterval,
      confidence: rhythmData.confidence,
      keyConfidence: keyData.confidence,
      energy: spectralData.energy,
      danceability: rhythmicFeatures.danceability,
      valence: rhythmicFeatures.valence,
      spectralCentroid: spectralData.spectralCentroid,
      segments,
      analysisMode: options.mode,
      analyzedDuration,
    };

    sendProgress(100, 'Complete!');
    return result;

  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

self.onmessage = async (e) => {
  const msg = e.data;

  if (msg.type === 'init') {
    const success = await initializeEssentia();
    self.postMessage({
      type: success ? 'ready' : 'error',
      error: success ? undefined : 'Essentia not available, using fallback algorithms'
    });
    return;
  }

  if (msg.type === 'analyze') {
    try {
      const result = await analyzeAudio(msg);
      self.postMessage({
        type: 'result',
        id: msg.id,
        result
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id: msg.id,
        error: error.message
      });
    }
  }
};

self.postMessage({ type: 'loaded' });
