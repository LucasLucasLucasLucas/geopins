import L from 'leaflet';
import { getMarkerSize } from './eventService';

class MarkerCache {
  constructor() {
    this.cache = new Map();
    this.lastZoom = null;
  }

  getKey(category, severity, verified, zoom, rank, sizeTier) {
    return `${category}-${severity}-${verified}-${zoom}-${rank}-${sizeTier}`;
  }

  getIcon(category, severity, verified, zoom, rank, sizeTier) {
    const key = this.getKey(category, severity, verified, zoom, rank, sizeTier);
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const icon = this.createCategoryIcon(category, severity, verified, zoom, rank, sizeTier);
    this.cache.set(key, icon);
    return icon;
  }

  clearCacheIfNeeded(newZoom) {
    if (this.lastZoom !== newZoom) {
      this.cache.clear();
      this.lastZoom = newZoom;
    }
  }

  createCategoryIcon(category, severity, verified, zoom, rank, sizeTier) {
    const zoomClass = zoom <= 4 ? 'far' : zoom <= 8 ? 'medium' : 'close';
    const severityClass = `severity-${severity}`;
    const verifiedClass = verified ? 'verified' : '';
    const rankTierClass = `rank-${sizeTier}`;
    
    // Get marker size (circular part)
    const size = this.getMarkerSize(zoom, sizeTier);
    // Banner height is additional to marker size, only for display
    const bannerHeight = Math.round(size * 0.4);
    
    const iconConfig = {
      className: `category-marker-wrapper ${zoomClass} ${severityClass} ${verifiedClass} ${rankTierClass}`,
      html: `
        <div class="${rankTierClass}" style="position:relative;width:${size}px;height:${size + bannerHeight}px;">
          <div class="category-marker" style="width:${size}px;height:${size}px;position:absolute;top:0;left:0;">
            <img src="/images/categories/${category}.svg" alt="${category}" />
          </div>
          <div class="rank-banner" style="position:absolute;top:${size}px;left:50%;transform:translateX(-50%);">#${rank}</div>
        </div>
      `,
      iconSize: [size, size + bannerHeight],
      iconAnchor: [size/2, size/2],
      popupAnchor: [0, -(size/2 + bannerHeight)]
    };
    
    return L.divIcon(iconConfig);
  }

  getMarkerSize(zoom, sizeTier = 'normal') {
    // Base size calculation based on zoom
    let baseSize;
    if (zoom <= 3) {
      baseSize = 20;
    } else if (zoom <= 6) {
      baseSize = 24;
    } else {
      baseSize = 28;
    }
    
    // Apply size multipliers based on tier
    const sizeMultipliers = {
      top: 2.0,
      high: 1.5,
      normal: 1.0
    };
    
    return Math.round(baseSize * (sizeMultipliers[sizeTier] || 1.0));
  }
}

export const markerCache = new MarkerCache(); 