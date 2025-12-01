// src/utils/workerPool.ts
// Manages pool of Web Workers for parallel audio analysis

import type { AnalysisMode, SegmentDensity, BeatStorage, AudioAnalysisResult } from '../types/track';

const DEFAULT_MAX_WORKERS = 16;
const CF_MAX_WORKERS = 4;
const WORKER_READY_TIMEOUT_MS = 45000;
const TASK_TIMEOUT_MS = 70000;
const CF_HOST_REGEX = /\.(?:pages|workers)\.dev$/i;

const detectCloudflarePages = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  if (CF_HOST_REGEX.test(host)) return true;
  return Boolean((window as unknown as { __CF$cv$params?: unknown }).__CF$cv$params);
};

const getEnvWorkerOverride = (): number | null => {
  const env = (import.meta.env?.VITE_MAX_WORKERS ?? import.meta.env?.VITE_WORKER_COUNT) as string | undefined;
  if (!env) return null;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

interface AnalysisPayload {
  audioData: Float32Array;
  sampleRate: number;
  duration: number;
  fileName: string;
  options: {
    mode: AnalysisMode;
    segmentDensity: SegmentDensity;
    beatStorage: BeatStorage;
  };
}

interface WorkerTask {
  id: string;
  payload: AnalysisPayload;
  resolve: (result: AudioAnalysisResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number, status?: string) => void;
}

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  currentTask: WorkerTask | null;
  index: number;
  timeoutHandle?: number;
}

class AudioAnalysisWorkerPool {
  private workers: WorkerInstance[] = [];
  private queue: WorkerTask[] = [];
  private maxWorkers: number;
  private initPromise: Promise<void> | null = null;
  private readonly isCloudflareEnv: boolean;

  constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.isCloudflareEnv = detectCloudflarePages();

    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    const envOverride = getEnvWorkerOverride();

    if (envOverride) {
      this.maxWorkers = Math.max(1, Math.min(envOverride, maxWorkers, cores));
    } else if (this.isCloudflareEnv) {
      this.maxWorkers = Math.max(1, Math.min(CF_MAX_WORKERS, cores));
    } else {
      const safeDesktopCount = Math.max(1, cores - 1);
      this.maxWorkers = Math.max(1, Math.min(maxWorkers, safeDesktopCount));
    }

    console.log(`🧵 Worker pool: ${this.maxWorkers} workers (${cores} cores available${this.isCloudflareEnv ? ' • Cloudflare safe mode' : ''})`);
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log(`🧵 Initializing up to ${this.maxWorkers} workers...`);

      for (let i = 0; i < this.maxWorkers; i++) {
        const workerInstance = await this.spawnWorker(i);
        if (workerInstance) {
          this.workers.push(workerInstance);
        }
      }

      console.log(`✅ Worker pool initialized with ${this.workers.length} workers`);
    })();

    return this.initPromise;
  }

  private async spawnWorker(index: number): Promise<WorkerInstance | null> {
    try {
      const workerUrl = new URL('../workers/audioAnalysis.worker.js?worker', import.meta.url);
      const worker = new Worker(workerUrl, { type: 'classic' });

      const workerInstance: WorkerInstance = {
        worker,
        busy: false,
        currentTask: null,
        index,
      };

      worker.onmessage = (event) => this.handleWorkerMessage(workerInstance, event);
      worker.onerror = (event) => this.handleWorkerError(workerInstance, event);

      await this.awaitWorkerReady(worker, index);
      console.log(`✅ Worker ${index + 1}/${this.maxWorkers} ready`);
      return workerInstance;
    } catch (error) {
      console.error(`❌ Worker ${index + 1} failed to initialize:`, error);
      return null;
    }
  }

  private awaitWorkerReady(worker: Worker, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeoutId);
        worker.removeEventListener('message', handleMessage);
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Worker ${index + 1} init timeout`));
      }, WORKER_READY_TIMEOUT_MS);

      const handleMessage = (event: MessageEvent) => {
        const { type, error } = event.data || {};
        if (type === 'loaded' || type === 'ready') {
          cleanup();
          resolve();
        } else if (type === 'error') {
          console.warn(`Worker ${index + 1} initialized in fallback mode:`, error);
          cleanup();
          resolve();
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'init' });
    });
  }

  private handleWorkerMessage(workerInstance: WorkerInstance, event: MessageEvent) {
    const { type, id, result, error, progress, status } = event.data || {};

    if (type === 'progress' && workerInstance.currentTask) {
      workerInstance.currentTask.onProgress?.(progress, status);
      return;
    }

    if (!workerInstance.currentTask) {
      return;
    }

    switch (type) {
      case 'result':
        this.clearTaskTimeout(workerInstance);
        workerInstance.currentTask.resolve(result);
        this.completeTask(workerInstance);
        break;

      case 'error':
        this.clearTaskTimeout(workerInstance);
        workerInstance.currentTask.reject(new Error(error || 'Worker error'));
        this.completeTask(workerInstance);
        this.restartWorker(workerInstance);
        break;

      default:
        break;
    }
  }

  private handleWorkerError(workerInstance: WorkerInstance, error: ErrorEvent) {
    console.error(`Worker ${workerInstance.index + 1} error:`, error.message);
    if (workerInstance.currentTask) {
      workerInstance.currentTask.reject(new Error(error.message));
      this.completeTask(workerInstance);
    }
    this.restartWorker(workerInstance);
  }

  private startTaskTimeout(workerInstance: WorkerInstance) {
    this.clearTaskTimeout(workerInstance);
    workerInstance.timeoutHandle = window.setTimeout(() => {
      console.warn(`Worker ${workerInstance.index + 1} exceeded ${TASK_TIMEOUT_MS}ms, restarting`);
      if (workerInstance.currentTask) {
        workerInstance.currentTask.reject(new Error('Analysis timed out'));
        this.completeTask(workerInstance);
      }
      this.restartWorker(workerInstance);
    }, TASK_TIMEOUT_MS);
  }

  private clearTaskTimeout(workerInstance: WorkerInstance) {
    if (workerInstance.timeoutHandle) {
      clearTimeout(workerInstance.timeoutHandle);
      workerInstance.timeoutHandle = undefined;
    }
  }

  private completeTask(workerInstance: WorkerInstance) {
    this.clearTaskTimeout(workerInstance);
    workerInstance.busy = false;
    workerInstance.currentTask = null;
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(worker => !worker.busy);
    if (!availableWorker) return;

    const task = this.queue.shift();
    if (!task) return;
    
    this.dispatchTask(availableWorker, task);

    if (this.queue.length > 0) {
      queueMicrotask(() => this.processQueue());
    }
  }

  private dispatchTask(workerInstance: WorkerInstance, task: WorkerTask) {
    workerInstance.busy = true;
    workerInstance.currentTask = task;

    const message = {
      type: 'analyze',
      id: task.id,
      ...task.payload,
    };

    const transferables: Transferable[] = [];
    if (task.payload.audioData?.buffer instanceof ArrayBuffer) {
      transferables.push(task.payload.audioData.buffer);
    }

    try {
      workerInstance.worker.postMessage(message, transferables);
      this.startTaskTimeout(workerInstance);
    } catch (error) {
      console.error('Failed to dispatch task to worker:', error);
      workerInstance.busy = false;
      workerInstance.currentTask = null;
      this.clearTaskTimeout(workerInstance);
      task.reject(error instanceof Error ? error : new Error(String(error)));
      this.restartWorker(workerInstance);
    }
  }

  async analyze(
    audioData: Float32Array,
    sampleRate: number,
    duration: number,
    fileName: string,
    options: {
      mode: AnalysisMode;
      segmentDensity: SegmentDensity;
      beatStorage: BeatStorage;
    },
    onProgress?: (progress: number, status?: string) => void
  ): Promise<AudioAnalysisResult> {
    if (!this.initPromise) {
      await this.initialize();
    } else {
      await this.initPromise;
    }

    return new Promise((resolve, reject) => {
      const taskId = `${Date.now()}-${Math.random()}`;
      
      const payload: AnalysisPayload = {
        audioData,
        sampleRate,
        duration,
        fileName,
        options,
      };

      const task: WorkerTask = {
        id: taskId,
        payload,
        resolve,
        reject,
        onProgress,
      };

      const availableWorker = this.workers.find(w => !w.busy);

      if (availableWorker) {
        this.dispatchTask(availableWorker, task);
      } else {
        this.queue.push(task);
        this.processQueue();
      }
    });
  }

  private restartWorker(workerInstance: WorkerInstance) {
    const index = this.workers.indexOf(workerInstance);
    this.clearTaskTimeout(workerInstance);
    workerInstance.worker.terminate();

    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    void this.spawnWorker(workerInstance.index).then((replacement) => {
      if (!replacement) {
        console.warn(`⚠️ Unable to restart worker ${workerInstance.index + 1}`);
        return;
      }

      if (index === -1 || index > this.workers.length) {
        this.workers.push(replacement);
      } else {
        this.workers.splice(index, 0, replacement);
      }

      this.processQueue();
    });
  }

  getStats() {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      available: this.workers.filter(w => !w.busy).length,
      queued: this.queue.length,
    };
  }

  terminate() {
    this.workers.forEach(workerInstance => {
      this.clearTaskTimeout(workerInstance);
      workerInstance.worker.terminate();
    });
    this.workers = [];
    this.queue = [];
    this.initPromise = null;
    console.log('🛑 Worker pool terminated');
  }
}

let workerPool: AudioAnalysisWorkerPool | null = null;

export function getWorkerPool(maxWorkers: number = DEFAULT_MAX_WORKERS): AudioAnalysisWorkerPool {
  if (!workerPool) {
    workerPool = new AudioAnalysisWorkerPool(maxWorkers);
  }
  return workerPool;
}

export function terminateWorkerPool() {
  if (workerPool) {
    workerPool.terminate();
    workerPool = null;
  }
}
