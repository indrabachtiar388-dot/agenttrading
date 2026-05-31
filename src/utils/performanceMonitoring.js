/**
 * Performance monitoring utilities
 */

// Monitor component render performance
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
  }

  // Start measuring
  start(name) {
    const markName = `${name}-start`;
    if (window.performance && window.performance.mark) {
      window.performance.mark(markName);
      this.marks.set(name, markName);
    }
  }

  // End measuring
  end(name) {
    const startMark = this.marks.get(name);
    if (!startMark) return null;

    const endMark = `${name}-end`;
    const measureName = `${name}-measure`;

    if (window.performance && window.performance.mark) {
      window.performance.mark(endMark);
      window.performance.measure(measureName, startMark, endMark);

      const measure = window.performance.getEntriesByName(measureName)[0];
      this.measures.set(name, measure.duration);

      // Clean up
      window.performance.clearMarks(startMark);
      window.performance.clearMarks(endMark);
      window.performance.clearMeasures(measureName);

      return measure.duration;
    }

    return null;
  }

  // Get all measures
  getMeasures() {
    return Object.fromEntries(this.measures);
  }

  // Clear all measures
  clear() {
    this.marks.clear();
    this.measures.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Monitor API calls
export const monitorAPICall = async (name, apiCall) => {
  performanceMonitor.start(`api-${name}`);
  try {
    const result = await apiCall();
    const duration = performanceMonitor.end(`api-${name}`);

    if (duration > 3000) {
      console.warn(`Slow API call detected: ${name} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    performanceMonitor.end(`api-${name}`);
    throw error;
  }
};

// Monitor component mount time
export const usePerformanceMonitor = (componentName) => {
  if (typeof window === 'undefined') return;

  const mountTime = Date.now();

  return () => {
    const duration = Date.now() - mountTime;
    if (duration > 1000) {
      console.warn(`Slow component mount: ${componentName} took ${duration}ms`);
    }
  };
};

// Resource timing observer
export const observeResourceTiming = (callback) => {
  if (!window.PerformanceObserver) return;

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.duration > 1000) {
        callback({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type: entry.initiatorType,
        });
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
  return observer;
};

// Long task observer
export const observeLongTasks = (callback) => {
  if (!window.PerformanceObserver) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        callback({
          duration: entry.duration,
          startTime: entry.startTime,
        });
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch (e) {
    // longtask may not be supported
    console.log('Long task monitoring not supported');
  }
};

// Memory usage monitoring
export const getMemoryUsage = () => {
  if (window.performance && window.performance.memory) {
    return {
      usedJSHeapSize: window.performance.memory.usedJSHeapSize,
      totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
      usagePercent: (window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
};

// Network information
export const getNetworkInfo = () => {
  if (navigator.connection) {
    return {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData,
    };
  }
  return null;
};

// FPS monitor
export class FPSMonitor {
  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.lastTime = performance.now();
    this.running = false;
  }

  start(callback) {
    this.running = true;
    const loop = (time) => {
      if (!this.running) return;

      this.frames++;
      const delta = time - this.lastTime;

      if (delta >= 1000) {
        this.fps = Math.round((this.frames * 1000) / delta);
        this.frames = 0;
        this.lastTime = time;

        if (callback) callback(this.fps);

        if (this.fps < 30) {
          console.warn(`Low FPS detected: ${this.fps}`);
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  getFPS() {
    return this.fps;
  }
}
