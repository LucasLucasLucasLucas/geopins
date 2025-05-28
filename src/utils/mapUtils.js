// Map constants
export const MIN_TOP_EVENTS = 5;
export const MAX_TOP_EVENTS = 300;
export const MIN_PIXEL_DISTANCE = 25;
export const DEFAULT_VISIBLE_EVENTS = 300;
export const DEBUG_MODE = true;

// Marker size calculations
export const getMarkerSize = (zoom, sizeTier = 'normal') => {
  let baseSize;
  if (zoom <= 3) {
    baseSize = 20;
  } else if (zoom <= 6) {
    baseSize = 24;
  } else {
    baseSize = 28;
  }
  
  const sizeMultipliers = {
    top: 2.0,
    high: 1.5,
    normal: 1.0
  };
  
  return Math.round(baseSize * (sizeMultipliers[sizeTier] || 1.0));
};

// Collision configuration
export const COLLISION_CONFIG = {
  baseDistance: 10,
  minDistance: 5,
  sizeMultipliers: {
    top: 1.5,
    high: 1.2,
    normal: 1.0
  },
  padding: {
    top: 5,
    high: 4,
    normal: 3
  },
  startZoom: 2,
  endZoom: 15,
  getCollisionDistance: (zoom, sizeTier = 'normal') => {
    const markerSize = getMarkerSize(zoom, sizeTier);
    const zoomProgress = (Math.min(Math.max(zoom, COLLISION_CONFIG.startZoom), COLLISION_CONFIG.endZoom) - COLLISION_CONFIG.startZoom) / 
      (COLLISION_CONFIG.endZoom - COLLISION_CONFIG.startZoom);
    const baseDistance = COLLISION_CONFIG.baseDistance - 
      (zoomProgress * (COLLISION_CONFIG.baseDistance - COLLISION_CONFIG.minDistance));
    const multiplier = COLLISION_CONFIG.sizeMultipliers[sizeTier] || 1.0;
    const padding = COLLISION_CONFIG.padding[sizeTier] || 0;
    return Math.round((markerSize * multiplier + padding) * 0.5);
  }
};

// Utility functions
export const getPixelDistance = (point1, point2, map) => {
  const p1 = map.latLngToContainerPoint(point1);
  const p2 = map.latLngToContainerPoint(point2);
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p2.y, 2));
};

export const isInVisibleViewport = (latLng, map) => {
  const point = map.latLngToContainerPoint(latLng);
  const container = map.getContainer();
  const actualWidth = container.clientWidth;
  const actualHeight = container.clientHeight;
  const bufferX = actualWidth * 0.5;
  const bufferY = actualHeight * 0.5;
  return point.x >= -bufferX && 
         point.x <= actualWidth + bufferX && 
         point.y >= -bufferY && 
         point.y <= actualHeight + bufferY;
}; 