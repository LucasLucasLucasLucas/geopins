import L from 'leaflet';

class SpatialIndex {
  constructor(gridSize = 50) {
    this.gridSize = gridSize;
    this.grid = new Map();
    this.eventLocations = new Map(); // Cache event locations
    this.lastZoom = null;
    this.lastBounds = null;
  }

  // Clear the spatial index
  clear() {
    this.grid.clear();
    this.eventLocations.clear();
    this.lastZoom = null;
    this.lastBounds = null;
  }

  // Get grid cell key for a point
  getCellKey(x, y) {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  // Get all events in a cell
  getCell(key) {
    return this.grid.get(key) || [];
  }

  // Get all neighboring cells for a point
  getNeighboringCells(x, y) {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    const cells = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cell = this.getCell(key);
        if (cell.length > 0) {
          cells.push(...cell);
        }
      }
    }

    return cells;
  }

  // Update the index with new events
  updateIndex(events, map) {
    const currentZoom = map.getZoom();
    const currentBounds = map.getBounds();
    
    // Check if we need to update
    if (this.lastZoom === currentZoom && 
        this.lastBounds && 
        this.lastBounds.contains(currentBounds) &&
        currentBounds.contains(this.lastBounds)) {
      return; // Skip update if view hasn't changed significantly
    }

    this.clear();
    this.lastZoom = currentZoom;
    this.lastBounds = currentBounds;

    events.forEach(event => {
      const latlng = L.latLng(event.coordinates);
      const point = map.latLngToContainerPoint(latlng);
      
      // Cache the pixel location
      this.eventLocations.set(event.id, point);
      
      // Add to grid
      const key = this.getCellKey(point.x, point.y);
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(event);
    });
  }

  // Get nearby events efficiently
  getNearbyEvents(event, map) {
    let point = this.eventLocations.get(event.id);
    
    // Calculate point if not cached
    if (!point) {
      point = map.latLngToContainerPoint(L.latLng(event.coordinates));
      this.eventLocations.set(event.id, point);
    }

    return this.getNeighboringCells(point.x, point.y);
  }

  // Quick check if two events might collide (bounding box check)
  mightCollide(event1, event2, maxDistance) {
    const p1 = this.eventLocations.get(event1.id);
    const p2 = this.eventLocations.get(event2.id);
    
    if (!p1 || !p2) return true; // Conservative approach
    
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    
    return dx <= maxDistance && dy <= maxDistance;
  }
}

// Create and export a singleton instance
export const spatialIndex = new SpatialIndex();

// Helper functions
export const getPixelDistance = (point1, point2) => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + 
    Math.pow(point2.y - point2.y, 2)
  );
}; 