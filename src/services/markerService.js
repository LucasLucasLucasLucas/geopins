import L from 'leaflet';
import { getMarkerSize } from './eventService';

class MarkerCache {
  constructor() {
    this.iconCache = new Map();
    this.tierCache = new Map();
    this.lastZoom = null;
    this.batchQueue = new Map();
    this.processingBatch = false;
  }

  // Generate a unique key for icon caching
  getIconKey(category, severity, verified, zoom, rank, sizeTier) {
    return `${category}-${severity}-${verified}-${zoom}-${rank}-${sizeTier}`;
  }

  // Get or create icon
  getIcon(category, severity, verified, zoom, rank, sizeTier) {
    const key = this.getIconKey(category, severity, verified, zoom, rank, sizeTier);
    
    if (this.iconCache.has(key)) {
      return this.iconCache.get(key);
    }

    const icon = this.createIcon(category, severity, verified, zoom, rank, sizeTier);
    this.iconCache.set(key, icon);
    return icon;
  }

  // Create icon with optimized HTML generation
  createIcon(category, severity, verified, zoom, rank, sizeTier) {
    const zoomClass = zoom <= 4 ? 'far' : zoom <= 8 ? 'medium' : 'close';
    const severityClass = `severity-${severity}`;
    const verifiedClass = verified ? 'verified' : '';
    const rankTierClass = `rank-${sizeTier}`;
    
    const size = getMarkerSize(zoom, sizeTier);
    const bannerHeight = Math.round(size * 0.4);
    
    // Use template strings only once
    const html = `
      <div class="${rankTierClass}" style="position:relative;width:${size}px;height:${size + bannerHeight}px;">
        <div class="category-marker" style="width:${size}px;height:${size}px;position:absolute;top:0;left:0;">
          <img src="/images/categories/${category}.svg" alt="${category}" />
        </div>
        <div class="rank-banner" style="position:absolute;top:${size}px;left:50%;transform:translateX(-50%);">#${rank}</div>
      </div>
    `;

    return L.divIcon({
      className: `category-marker-wrapper ${zoomClass} ${severityClass} ${verifiedClass} ${rankTierClass}`,
      html,
      iconSize: [size, size + bannerHeight],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -(size/2 + bannerHeight)]
    });
  }

  // Clear cache when zoom changes significantly
  clearCacheIfNeeded(newZoom) {
    if (this.lastZoom === null || Math.abs(this.lastZoom - newZoom) >= 1) {
      this.iconCache.clear();
      this.lastZoom = newZoom;
    }
  }

  // Get tier with memoization
  getTier(event, visibleEvents, bounds) {
    const cacheKey = `${event.id}-${bounds.toBBoxString()}`;
    
    if (this.tierCache.has(cacheKey)) {
      return this.tierCache.get(cacheKey);
    }

    let tier;
    if (event.rank <= 5) {
      tier = 'top';
    } else if (bounds && visibleEvents.length > 0) {
      const eventsInView = visibleEvents.filter(e => 
        bounds.contains(L.latLng(e.coordinates))
      );

      const localTop10 = eventsInView
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 10)
        .map(e => e.id);

      tier = localTop10.includes(event.id) ? 'high' : 'normal';
    } else {
      tier = 'normal';
    }

    this.tierCache.set(cacheKey, tier);
    return tier;
  }

  // Queue events for batch processing
  queueForBatch(event, visibleEvents, bounds) {
    this.batchQueue.set(event.id, {
      event,
      visibleEvents,
      bounds
    });

    if (!this.processingBatch) {
      this.processBatch();
    }
  }

  // Process batch of events
  async processBatch() {
    if (this.batchQueue.size === 0 || this.processingBatch) return;

    this.processingBatch = true;
    const batchSize = 50; // Process 50 events at a time
    const entries = Array.from(this.batchQueue.entries());
    
    try {
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread

        batch.forEach(([id, { event, visibleEvents, bounds }]) => {
          const tier = this.getTier(event, visibleEvents, bounds);
          event.sizeTier = tier;
          this.batchQueue.delete(id);
        });
      }
    } finally {
      this.processingBatch = false;
      if (this.batchQueue.size > 0) {
        this.processBatch(); // Process any remaining events
      }
    }
  }

  // Clear all caches
  clearAll() {
    this.iconCache.clear();
    this.tierCache.clear();
    this.lastZoom = null;
    this.batchQueue.clear();
    this.processingBatch = false;
  }
}

// Create and export singleton instance
export const markerCache = new MarkerCache(); 