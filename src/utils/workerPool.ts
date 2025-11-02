// src/utils/workerPool.ts
// Manages pool of Web Workers for parallel audio analysis

import type { AnalysisMode, SegmentDensity, BeatStorage, AudioAnalysisResult } from '../types/track';

interface WorkerTask {
  id: string;
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
          // ✅ FIXED: Force classic worker mode (allows importScripts)
          const workerUrl = new URL('../workers/audioAnalysis.worker.ts', import.meta.url);
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
            const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 10000);
            
            const handler = (e: MessageEvent) => {
              if (e.data.type === 'loaded' || e.data.type === 'ready') {
                clearTimeout(timeout);
                worker.removeEventListener('message', handler);
                resolve();
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

    availableWorker.busy = true;
    availableWorker.currentTask = task;
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
      
      const task: WorkerTask = {
        id: taskId,
        resolve,
        reject,
        onProgress,
      };

      const availableWorker = this.workers.find(w => !w.busy);

      if (availableWorker) {
        availableWorker.busy = true;
        availableWorker.currentTask = task;

        availableWorker.worker.postMessage({
          type: 'analyze',
          id: taskId,
          audioData,
          sampleRate,
          duration,
          fileName,
          options,
        });
      } else {
        this.queue.push(task);
        
        const checkQueue = () => {
          const worker = this.workers.find(w => !w.busy);
          if (worker && this.queue.includes(task)) {
            const queueIndex = this.queue.indexOf(task);
            if (queueIndex !== -1) {
              this.queue.splice(queueIndex, 1);
              worker.busy = true;
              worker.currentTask = task;

              worker.worker.postMessage({
                type: 'analyze',
                id: taskId,
                audioData,
                sampleRate,
                duration,
                fileName,
                options,
              });
            }
          }
        };

        const interval = setInterval(() => {
          if (!this.queue.includes(task)) {
            clearInterval(interval);
            return;
          }
          checkQueue();
        }, 100);
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