import L from 'leaflet';

class ClusterService {
  constructor() {
    this.clusters = new Map();
    this.gridSize = 50; // pixels
    this.minClusterSize = 3;
  }

  // Clear existing clusters
  clear() {
    this.clusters.clear();
  }

  // Create clusters from events
  createClusters(events, map) {
    this.clear();
    const grid = new Map();
    const zoom = map.getZoom();

    // First pass: assign events to grid cells
    events.forEach(event => {
      const point = map.latLngToContainerPoint(L.latLng(event.coordinates));
      const cellX = Math.floor(point.x / this.gridSize);
      const cellY = Math.floor(point.y / this.gridSize);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key).push(event);
    });

    // Second pass: create clusters from dense cells
    grid.forEach((cellEvents, key) => {
      if (cellEvents.length >= this.minClusterSize) {
        // Calculate cluster center
        const center = cellEvents.reduce((acc, event) => {
          const point = map.latLngToContainerPoint(L.latLng(event.coordinates));
          return [acc[0] + point.x, acc[1] + point.y];
        }, [0, 0]);

        const centerPoint = L.point(
          center[0] / cellEvents.length,
          center[1] / cellEvents.length
        );

        // Create cluster
        const cluster = {
          id: key,
          center: map.containerPointToLatLng(centerPoint),
          events: cellEvents,
          size: cellEvents.length,
          bounds: this.calculateClusterBounds(cellEvents, map),
          topEvent: this.getTopEvent(cellEvents)
        };

        this.clusters.set(key, cluster);
      }
    });

    return Array.from(this.clusters.values());
  }

  // Calculate bounds for a cluster
  calculateClusterBounds(events, map) {
    const points = events.map(event => 
      map.latLngToContainerPoint(L.latLng(event.coordinates))
    );

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    return L.latLngBounds(
      map.containerPointToLatLng([minX, minY]),
      map.containerPointToLatLng([maxX, maxY])
    );
  }

  // Get the highest ranked event in a cluster
  getTopEvent(events) {
    return events.reduce((top, event) => 
      (!top || event.rank < top.rank) ? event : top
    , null);
  }

  // Check if an event is part of a cluster
  isEventClustered(event) {
    for (const cluster of this.clusters.values()) {
      if (cluster.events.includes(event)) {
        return true;
      }
    }
    return false;
  }

  // Get cluster containing an event
  getEventCluster(event) {
    for (const cluster of this.clusters.values()) {
      if (cluster.events.includes(event)) {
        return cluster;
      }
    }
    return null;
  }
}

// Create and export singleton instance
export const clusterService = new ClusterService(); 