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
  lastUsed: number;
  taskCount: number;
  isHealthy: boolean;
  restartCount: number;
}

class AudioAnalysisWorkerPool {
  private workers: WorkerInstance[] = [];
  private queue: WorkerTask[] = [];
  private maxWorkers: number;
  private initPromise: Promise<void> | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RESTARTS_PER_WORKER = 3;
  private readonly WORKER_TIMEOUT = 300000; // 5 minutes
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_TASKS_PER_WORKER = 50; // Restart after N tasks

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
            lastUsed: Date.now(),
            taskCount: 0,
            isHealthy: true,
            restartCount: 0,
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
      
      // Start health check interval
      this.startHealthChecks();
    })();

    return this.initPromise;
  }

  private startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private async performHealthCheck() {
    const now = Date.now();
    
    for (const workerInstance of this.workers) {
      // Check for stuck workers
      if (workerInstance.busy && workerInstance.currentTask) {
        const taskAge = now - workerInstance.lastUsed;
        if (taskAge > this.WORKER_TIMEOUT) {
          console.warn(`⚠️ Worker ${this.workers.indexOf(workerInstance)} appears stuck (task age: ${taskAge}ms)`);
          await this.restartWorker(workerInstance, 'Task timeout');
          continue;
        }
      }

      // Check for workers that have processed too many tasks
      if (workerInstance.taskCount > this.MAX_TASKS_PER_WORKER) {
        console.log(`🔄 Worker ${this.workers.indexOf(workerInstance)} has processed ${workerInstance.taskCount} tasks, restarting for memory cleanup`);
        await this.restartWorker(workerInstance, 'Task limit reached');
      }
    }
  }

  private async restartWorker(workerInstance: WorkerInstance, reason: string) {
    const workerIndex = this.workers.indexOf(workerInstance);
    
    if (workerInstance.restartCount >= this.MAX_RESTARTS_PER_WORKER) {
      console.error(`❌ Worker ${workerIndex} exceeded restart limit (${this.MAX_RESTARTS_PER_WORKER}), marking as unhealthy`);
      workerInstance.isHealthy = false;
      if (workerInstance.currentTask) {
        workerInstance.currentTask.reject(new Error(`Worker failed: ${reason}`));
        workerInstance.currentTask = null;
      }
      workerInstance.busy = false;
      return;
    }

    console.log(`🔄 Restarting worker ${workerIndex} (${reason})...`);
    
    // Fail current task if any
    if (workerInstance.currentTask) {
      workerInstance.currentTask.reject(new Error(`Worker restarted: ${reason}`));
      workerInstance.currentTask = null;
    }

    try {
      // Terminate old worker
      workerInstance.worker.terminate();
      
      // Create new worker
      const workerUrl = new URL('../workers/audioAnalysis.worker.js?worker', import.meta.url);
      const newWorker = new Worker(workerUrl, { type: 'classic' });
      
      // Update worker instance
      workerInstance.worker = newWorker;
      workerInstance.busy = false;
      workerInstance.lastUsed = Date.now();
      workerInstance.taskCount = 0;
      workerInstance.isHealthy = true;
      workerInstance.restartCount++;
      
      // Reattach event handlers
      newWorker.onmessage = (e) => this.handleWorkerMessage(workerInstance, e);
      newWorker.onerror = (e) => this.handleWorkerError(workerInstance, e);
      
      // Initialize new worker
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 10000);
        
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'loaded' || e.data.type === 'ready') {
            clearTimeout(timeout);
            newWorker.removeEventListener('message', handler);
            resolve();
          }
        };

        newWorker.addEventListener('message', handler);
        newWorker.postMessage({ type: 'init' });
      });
      
      console.log(`✅ Worker ${workerIndex} restarted successfully (${workerInstance.restartCount}/${this.MAX_RESTARTS_PER_WORKER})`);
      
    } catch (error) {
      console.error(`❌ Failed to restart worker ${workerIndex}:`, error);
      workerInstance.isHealthy = false;
    }
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
        workerInstance.taskCount++;
        workerInstance.lastUsed = Date.now();
        this.completeTask(workerInstance);
        break;

      case 'error':
        console.error(`❌ Worker ${this.workers.indexOf(workerInstance)} task failed:`, error);
        workerInstance.currentTask.reject(new Error(error));
        this.completeTask(workerInstance);
        break;
    }
  }

  private handleWorkerError(workerInstance: WorkerInstance, error: ErrorEvent) {
    console.error(`❌ Worker ${this.workers.indexOf(workerInstance)} error:`, error);
    
    // Mark worker as unhealthy and restart it
    workerInstance.isHealthy = false;
    
    if (workerInstance.currentTask) {
      workerInstance.currentTask.reject(new Error(`Worker error: ${error.message}`));
      this.completeTask(workerInstance);
    }

    // Restart the worker asynchronously
    setTimeout(() => {
      this.restartWorker(workerInstance, 'Worker error');
    }, 1000);
  }

  private completeTask(workerInstance: WorkerInstance) {
    workerInstance.busy = false;
    workerInstance.currentTask = null;
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find available and healthy worker
    const availableWorker = this.workers.find(w => !w.busy && w.isHealthy);
    if (!availableWorker) {
      // If no healthy workers available, check if we need to restart unhealthy ones
      const unhealthyWorker = this.workers.find(w => !w.isHealthy && w.restartCount < this.MAX_RESTARTS_PER_WORKER);
      if (unhealthyWorker) {
        console.log(`🔄 Attempting to restart unhealthy worker ${this.workers.indexOf(unhealthyWorker)}`);
        setTimeout(() => {
          this.restartWorker(unhealthyWorker, 'Queue processing needs worker');
        }, 100);
      }
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    availableWorker.busy = true;
    availableWorker.currentTask = task;
    availableWorker.lastUsed = Date.now();
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

      const availableWorker = this.workers.find(w => !w.busy && w.isHealthy);

      if (availableWorker) {
        availableWorker.busy = true;
        availableWorker.currentTask = task;
        availableWorker.lastUsed = Date.now();

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
          const worker = this.workers.find(w => !w.busy && w.isHealthy);
          if (worker && this.queue.includes(task)) {
            const queueIndex = this.queue.indexOf(task);
            if (queueIndex !== -1) {
              this.queue.splice(queueIndex, 1);
              worker.busy = true;
              worker.currentTask = task;
              worker.lastUsed = Date.now();

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
    const healthyWorkers = this.workers.filter(w => w.isHealthy);
    const unhealthyWorkers = this.workers.filter(w => !w.isHealthy);
    const totalTasks = this.workers.reduce((sum, w) => sum + w.taskCount, 0);
    const avgRestarts = this.workers.reduce((sum, w) => sum + w.restartCount, 0) / this.workers.length;
    
    return {
      total: this.workers.length,
      healthy: healthyWorkers.length,
      unhealthy: unhealthyWorkers.length,
      busy: this.workers.filter(w => w.busy).length,
      available: this.workers.filter(w => !w.busy && w.isHealthy).length,
      queued: this.queue.length,
      totalTasks,
      avgRestarts: avgRestarts.toFixed(1),
      workers: this.workers.map((w, i) => ({
        index: i,
        busy: w.busy,
        healthy: w.isHealthy,
        tasks: w.taskCount,
        restarts: w.restartCount,
        lastUsed: Date.now() - w.lastUsed,
      }))
    };
  }

  terminate() {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Send termination message to workers for cleanup
    this.workers.forEach(w => {
      try {
        w.worker.postMessage({ type: 'terminate' });
      } catch (e) {
        console.warn('Could not send termination message to worker:', e);
      }
    });
    
    // Give workers a moment to clean up
    setTimeout(() => {
      this.workers.forEach(w => {
        try {
          w.worker.terminate();
        } catch (e) {
          console.warn('Worker already terminated:', e);
        }
      });
      this.workers = [];
      this.queue = [];
      this.initPromise = null;
      console.log('🛑 Worker pool terminated');
    }, 500);
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