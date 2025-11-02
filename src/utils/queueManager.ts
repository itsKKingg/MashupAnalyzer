// src/utils/queueManager.ts
// FIXED: Simplified batch processing logic

export interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const CONFIG = {
  DEBUG: false, // Set to true for verbose logging
};

export class UploadQueue {
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private onUpdate?: (queue: QueueItem[]) => void;
  private onItemComplete?: (item: QueueItem) => void;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  setOnUpdate(callback: (queue: QueueItem[]) => void) {
    this.onUpdate = callback;
  }

  setOnItemComplete(callback: (item: QueueItem) => void) {
    this.onItemComplete = callback;
  }

  addFiles(files: File[]): void {
    const newItems: QueueItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}-${file.name}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    this.queue.push(...newItems);
    this.notifyUpdate();
  }

  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.filter(item => item.status === 'pending').length;
  }

  getProcessingCount(): number {
    return this.queue.filter(item => item.status === 'processing').length;
  }

  getCompletedCount(): number {
    return this.queue.filter(item => item.status === 'completed').length;
  }

  getFailedCount(): number {
    return this.queue.filter(item => item.status === 'failed').length;
  }

  getTotalCount(): number {
    return this.queue.length;
  }

  async processNext(
    processor: (file: File, onProgress: (progress: number) => void) => Promise<void>
  ): Promise<boolean> {
    if (this.processing.size >= this.maxConcurrent) {
      return false;
    }

    const nextItem = this.queue.find(item => item.status === 'pending');
    if (!nextItem) {
      return false;
    }

    nextItem.status = 'processing';
    nextItem.progress = 0;
    this.processing.add(nextItem.id);
    this.notifyUpdate();

    try {
      await processor(nextItem.file, (progress) => {
        nextItem.progress = progress;
        this.notifyUpdate();
      });

      nextItem.status = 'completed';
      nextItem.progress = 100;
      this.processing.delete(nextItem.id);
      
      if (this.onItemComplete) {
        this.onItemComplete(nextItem);
      }
      
      this.notifyUpdate();
      return true;
    } catch (error) {
      nextItem.status = 'failed';
      nextItem.error = error instanceof Error ? error.message : 'Unknown error';
      this.processing.delete(nextItem.id);
      
      if (CONFIG.DEBUG) {
        console.error(`Queue processing failed for ${nextItem.file.name}:`, error);
      }
      
      this.notifyUpdate();
      return false;
    }
  }

  // 🔥 FIXED: Simplified batch processing - no recursion, no race conditions
  async processAll(
    processor: (file: File, onProgress: (progress: number) => void) => Promise<void>
  ): Promise<void> {
    // Keep processing until everything is done
    while (this.getPendingCount() > 0 || this.processing.size > 0) {
      // Fill up all available worker slots
      while (this.processing.size < this.maxConcurrent && this.getPendingCount() > 0) {
        // Fire and forget - processNext handles its own completion
        this.processNext(processor);
      }
      
      // Wait before checking again (reduces CPU spinning)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  clear(): void {
    if (CONFIG.DEBUG && this.queue.length > 0) {
      console.log(`🧹 Clearing queue (${this.queue.length} items)`);
    }
    
    this.queue = [];
    this.processing.clear();
    this.notifyUpdate();
  }

  removeCompleted(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'completed');
    
    if (CONFIG.DEBUG && beforeCount !== this.queue.length) {
      console.log(`🧹 Removed ${beforeCount - this.queue.length} completed items`);
    }
    
    this.notifyUpdate();
  }

  removeFailed(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'failed');
    
    if (CONFIG.DEBUG && beforeCount !== this.queue.length) {
      console.log(`🧹 Removed ${beforeCount - this.queue.length} failed items`);
    }
    
    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate(this.getQueue());
    }
  }
}