import L from 'leaflet';

class ViewportService {
  constructor() {
    this.visibleBounds = null;
    this.loadedBounds = null;
    this.zoomLevel = null;
    this.lodThresholds = {
      far: 4,    // Global view
      medium: 8, // Regional view
      close: 12  // Local view
    };
  }

  // Check if we need to update the viewport
  needsUpdate(newBounds, newZoom) {
    if (!this.loadedBounds || !this.zoomLevel) return true;
    
    // Always update if zoom level changes significantly
    if (Math.abs(this.zoomLevel - newZoom) >= 1) return true;
    
    // Check if new bounds are significantly different
    const currentCenter = this.loadedBounds.getCenter();
    const newCenter = newBounds.getCenter();
    
    const distance = currentCenter.distanceTo(newCenter);
    const viewportWidth = this.loadedBounds.getEast() - this.loadedBounds.getWest();
    
    // Update if moved more than 25% of viewport width
    return distance > (viewportWidth * 0.25);
  }

  // Get appropriate level of detail based on zoom
  getLODLevel(zoom) {
    if (zoom <= this.lodThresholds.far) return 'far';
    if (zoom <= this.lodThresholds.medium) return 'medium';
    return 'close';
  }

  // Update viewport state
  updateViewport(bounds, zoom) {
    this.visibleBounds = bounds;
    this.loadedBounds = bounds.pad(0.5); // Load events in area 50% larger than viewport
    this.zoomLevel = zoom;
  }

  // Filter events based on viewport and LOD
  filterEvents(events, bounds, zoom) {
    const lodLevel = this.getLODLevel(zoom);
    const extendedBounds = bounds.pad(0.5);
    
    // Basic viewport filtering
    const inViewport = events.filter(event => 
      extendedBounds.contains(L.latLng(event.coordinates))
    );
    
    // Apply LOD-based filtering
    switch (lodLevel) {
      case 'far':
        // Show only top-ranked events at global view
        return inViewport.filter(event => event.rank <= 100);
      
      case 'medium':
        // Show high and top-ranked events at regional view
        return inViewport.filter(event => event.rank <= 500);
      
      case 'close':
        // Show all events at local view
        return inViewport;
    }
  }

  // Get loading state for progressive enhancement
  getLoadingState() {
    return {
      bounds: this.loadedBounds,
      zoom: this.zoomLevel,
      lodLevel: this.getLODLevel(this.zoomLevel)
    };
  }
}

// Create and export singleton instance
export const viewportService = new ViewportService(); 