import L from 'leaflet';

// Constants
const MIN_PIXEL_DISTANCE = 25;
const DEFAULT_MARKER_SIZE = {
  far: 20,    // zoom <= 3
  medium: 24, // zoom <= 6
  close: 28   // zoom > 6
};

const SIZE_MULTIPLIERS = {
  top: 2.0,
  high: 1.5,
  normal: 1.0
};

// Core event calculations
export const getMarkerSize = (zoom, sizeTier = 'normal') => {
  let baseSize;
  if (zoom <= 3) {
    baseSize = DEFAULT_MARKER_SIZE.far;
  } else if (zoom <= 6) {
    baseSize = DEFAULT_MARKER_SIZE.medium;
  } else {
    baseSize = DEFAULT_MARKER_SIZE.close;
  }
  
  return Math.round(baseSize * (SIZE_MULTIPLIERS[sizeTier] || 1.0));
};

export const getMarkerFootprint = (zoom, sizeTier = 'normal') => {
  const baseSize = getMarkerSize(zoom, sizeTier);
  const markerRadius = baseSize / 2;
  const bannerHeight = Math.round(baseSize * 0.4);
  const bannerWidth = baseSize * 1.2;
  
  const visualPadding = {
    top: 4,
    high: 3,
    normal: 2
  }[sizeTier] || 2;
  
  return {
    radius: markerRadius + visualPadding,
    bannerHeight,
    bannerWidth,
    totalHeight: baseSize + bannerHeight,
    visualPadding
  };
};

// Collision detection
export const checkCollision = (event1, event2, map, zoom) => {
  const pos1 = L.latLng(event1.coordinates);
  const pos2 = L.latLng(event2.coordinates);
  
  const pixel1 = map.latLngToContainerPoint(pos1);
  const pixel2 = map.latLngToContainerPoint(pos2);
  
  const distance = Math.sqrt(
    Math.pow(pixel2.x - pixel1.x, 2) + 
    Math.pow(pixel2.y - pixel1.y, 2)
  );
  
  const footprint1 = getMarkerFootprint(zoom, event1.sizeTier);
  const footprint2 = getMarkerFootprint(zoom, event2.sizeTier);
  
  const minDistance = footprint1.radius + footprint2.radius;
  
  const verticalDistance = Math.abs(pixel2.y - pixel1.y);
  if (verticalDistance < (footprint1.bannerHeight + footprint2.bannerHeight)) {
    const bannerOverlap = Math.max(
      (footprint1.bannerWidth + footprint2.bannerWidth) / 2,
      minDistance
    );
    return distance < bannerOverlap;
  }
  
  return distance < minDistance;
};

import { markerCache } from './markerService';

import { spatialIndex, getPixelDistance } from './spatialIndexService';

// Main event processing
export const processEvents = (events, map, topVisibleCount) => {
  const bounds = map.getBounds();
  const currentZoom = map.getZoom();
  const extendedBounds = bounds.pad(0.5);
  
  // Get events in viewport
  const viewportEvents = events.filter(event => 
    extendedBounds.contains(L.latLng(event.coordinates))
  ).sort((a, b) => a.rank - b.rank);
  
  // Update spatial index with current viewport events
  spatialIndex.updateIndex(viewportEvents, map);
  
  const visibleEvents = [];
  const hiddenEvents = [];
  const maxCollisionDistance = Math.max(
    ...Object.values(DEFAULT_MARKER_SIZE)
  ) * Math.max(...Object.values(SIZE_MULTIPLIERS)) * 2;

  // Clear marker cache if zoom has changed
  markerCache.clearCacheIfNeeded(currentZoom);

  for (const event of viewportEvents.slice(0, topVisibleCount)) {
    if (visibleEvents.length >= topVisibleCount) {
      const sizeTier = markerCache.getTier(event, visibleEvents, bounds);
      hiddenEvents.push({ ...event, sizeTier });
      continue;
    }

    const nearbyEvents = spatialIndex.getNearbyEvents(event, map);
    let hasCollision = false;

    for (const placedEvent of nearbyEvents) {
      if (!visibleEvents.includes(placedEvent)) continue;
      
      // Quick bounding box check before detailed collision check
      if (spatialIndex.mightCollide(event, placedEvent, maxCollisionDistance)) {
        if (checkCollision(event, placedEvent, map, currentZoom)) {
          if (placedEvent.rank > event.rank) {
            visibleEvents.splice(visibleEvents.indexOf(placedEvent), 1);
            const placedTier = markerCache.getTier(placedEvent, visibleEvents, bounds);
            hiddenEvents.push({ ...placedEvent, sizeTier: placedTier });
            
            const eventTier = markerCache.getTier(event, visibleEvents, bounds);
            visibleEvents.push({ ...event, sizeTier: eventTier });
          } else {
            const eventTier = markerCache.getTier(event, visibleEvents, bounds);
            hiddenEvents.push({ ...event, sizeTier: eventTier });
          }
          hasCollision = true;
          break;
        }
      }
    }

    if (!hasCollision) {
      const sizeTier = markerCache.getTier(event, visibleEvents, bounds);
      visibleEvents.push({ ...event, sizeTier });
    }
  }

  return { visibleEvents, hiddenEvents };
}; 