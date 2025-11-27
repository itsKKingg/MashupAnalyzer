// src/utils/workerPool.ts
// Manages pool of Web Workers for parallel audio analysis

import type { AnalysisMode, SegmentDensity, BeatStorage, AudioAnalysisResult } from '../types/track';

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
}

class AudioAnalysisWorkerPool {
  private workers: WorkerInstance[] = [];
  private queue: WorkerTask[] = [];
  private maxWorkers: number;
  private initPromise: Promise<void> | null = null;

  constructor(maxWorkers: number = 16) {  // 🔥 Changed from 4 to 8
    const cores = navigator.hardwareConcurrency || 4;
    this.maxWorkers = Math.min(maxWorkers, cores);
    console.log(`🧵 Worker pool: ${this.maxWorkers} workers (${cores} cores available)`);
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log(`🧵 Initializing ${this.maxWorkers} workers...`);

      for (let i = 0; i < this.maxWorkers; i++) {
        try {
          // ✅ FIXED: Import worker without extension to let Vite handle it properly
          const workerUrl = new URL('../workers/audioAnalysis.worker.js?worker', import.meta.url);
          const worker = new Worker(workerUrl, { type: 'classic' });

          const workerInstance: WorkerInstance = {
            worker,
            busy: false,
            currentTask: null,
          };

          worker.onmessage = (e) => this.handleWorkerMessage(workerInstance, e);
          worker.onerror = (e) => this.handleWorkerError(workerInstance, e);

          this.workers.push(workerInstance);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 30000); // Increased for Cloudflare Pages
            
            const handler = (e: MessageEvent) => {
              if (e.data.type === 'loaded' || e.data.type === 'ready') {
                clearTimeout(timeout);
                worker.removeEventListener('message', handler);
                resolve();
              } else if (e.data.type === 'error') {
                clearTimeout(timeout);
                worker.removeEventListener('message', handler);
                console.warn(`Worker ${i + 1} initialized with fallback mode:`, e.data.error);
                resolve(); // Continue even with fallback
              }
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'init' });
          });

          console.log(`✅ Worker ${i + 1}/${this.maxWorkers} ready`);
        } catch (error) {
          console.error(`❌ Worker ${i + 1} failed to initialize:`, error);
        }
      }

      console.log(`✅ Worker pool initialized with ${this.workers.length} workers`);
    })();

    return this.initPromise;
  }

  private handleWorkerMessage(workerInstance: WorkerInstance, e: MessageEvent) {
    const { type, id, result, error, progress, status } = e.data;

    if (!workerInstance.currentTask) return;

    switch (type) {
      case 'progress':
        workerInstance.currentTask.onProgress?.(progress, status);
        break;

      case 'result':
        workerInstance.currentTask.resolve(result);
        this.completeTask(workerInstance);
        break;

      case 'error':
        workerInstance.currentTask.reject(new Error(error));
        this.completeTask(workerInstance);
        break;
    }
  }

  private handleWorkerError(workerInstance: WorkerInstance, error: ErrorEvent) {
    console.error('Worker error:', error);
    if (workerInstance.currentTask) {
      workerInstance.currentTask.reject(new Error(error.message));
      this.completeTask(workerInstance);
    }
  }

  private completeTask(workerInstance: WorkerInstance) {
    workerInstance.busy = false;
    workerInstance.currentTask = null;
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !w.busy);
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
    } catch (error) {
      console.error('Failed to dispatch task to worker:', error);
      workerInstance.busy = false;
      workerInstance.currentTask = null;
      task.reject(error instanceof Error ? error : new Error(String(error)));
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

  getStats() {
    return {
      total: this.workers.length,
      busy: this.workers.filter(w => w.busy).length,
      available: this.workers.filter(w => !w.busy).length,
      queued: this.queue.length,
    };
  }

  terminate() {
    this.workers.forEach(w => w.worker.terminate());
    this.workers = [];
    this.queue = [];
    this.initPromise = null;
    console.log('🛑 Worker pool terminated');
  }
}

let workerPool: AudioAnalysisWorkerPool | null = null;

export function getWorkerPool(maxWorkers: number = 16): AudioAnalysisWorkerPool {  // 🔥 Changed from 4 to 8
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