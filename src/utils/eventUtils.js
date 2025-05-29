import { MIN_TOP_EVENTS, MAX_TOP_EVENTS } from './mapUtils';
import L from 'leaflet';

// Filter events based on active filters
export const filterEvents = (events, filters) => {
  return events.filter(event => {
    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(event.category)) {
      return false;
    }

    // Severity filter
    if (filters.severities.length > 0 && !filters.severities.includes(event.severity)) {
      return false;
    }

    // Verification filter
    if (filters.verified && !event.verified) {
      return false;
    }

    // Time range filter
    if (filters.timeRange) {
      const eventTime = new Date(event.timestamp);
      if (eventTime < filters.timeRange.start || eventTime > filters.timeRange.end) {
        return false;
      }
    }

    return true;
  });
};

// Sort events by importance and limit to visible count
export const sortAndLimitEvents = (events, visibleCount = MAX_TOP_EVENTS) => {
  // Sort by rank (lower rank = higher importance)
  const sortedEvents = [...events].sort((a, b) => a.rank - b.rank);
  
  // Ensure minimum number of top events
  const topEvents = sortedEvents.slice(0, Math.max(MIN_TOP_EVENTS, Math.min(visibleCount, MAX_TOP_EVENTS)));
  const remainingEvents = sortedEvents.slice(topEvents.length);

  return {
    visibleEvents: topEvents,
    hiddenEvents: remainingEvents
  };
};

// Calculate event size tier based on rank and zoom level
export const calculateEventSizeTier = (event, zoom) => {
  if (zoom <= 4) {
    return event.rank <= 10 ? 'top' : event.rank <= 50 ? 'high' : 'normal';
  } else if (zoom <= 8) {
    return event.rank <= 20 ? 'top' : event.rank <= 100 ? 'high' : 'normal';
  } else {
    return event.rank <= 30 ? 'top' : event.rank <= 150 ? 'high' : 'normal';
  }
};

// Check if two events collide on the map
export const checkCollision = (event1, event2, map, zoom) => {
  const point1 = map.latLngToContainerPoint(event1.coordinates);
  const point2 = map.latLngToContainerPoint(event2.coordinates);
  
  const tier1 = calculateEventSizeTier(event1, zoom);
  const tier2 = calculateEventSizeTier(event2, zoom);
  
  const size1 = getMarkerSize(zoom, tier1);
  const size2 = getMarkerSize(zoom, tier2);
  
  const minDistance = (size1 + size2) / 2 + MIN_PIXEL_DISTANCE;
  const actualDistance = Math.sqrt(
    Math.pow(point1.x - point2.x, 2) + 
    Math.pow(point1.y - point2.y, 2)
  );
  
  return actualDistance < minDistance;
};

// Find visible events without collisions
export const resolveCollisions = (events, map, zoom) => {
  const visibleEvents = [];
  const hiddenEvents = [];
  
  for (const event of events) {
    let hasCollision = false;
    
    for (const visibleEvent of visibleEvents) {
      if (checkCollision(event, visibleEvent, map, zoom)) {
        hasCollision = true;
        break;
      }
    }
    
    if (hasCollision) {
      hiddenEvents.push(event);
    } else {
      visibleEvents.push(event);
    }
  }
  
  return { visibleEvents, hiddenEvents };
};

// Get pixel distance between two points
export const getPixelDistance = (point1, point2, map) => {
  const p1 = map.latLngToContainerPoint(point1);
  const p2 = map.latLngToContainerPoint(point2);
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p2.y, 2));
};

// Check if a point is within the visible viewport with buffer
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

// Get marker size based on zoom level and tier
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

// Visual footprint calculations
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

// Enhanced collision detection
export const checkMarkersCollision = (event1, event2, map, currentZoom) => {
  const pos1 = L.latLng(event1.coordinates);
  const pos2 = L.latLng(event2.coordinates);
  
  const pixel1 = map.latLngToContainerPoint(pos1);
  const pixel2 = map.latLngToContainerPoint(pos2);
  
  const distance = Math.sqrt(
    Math.pow(pixel2.x - pixel1.x, 2) + 
    Math.pow(pixel2.y - pixel1.y, 2)
  );
  
  const footprint1 = getMarkerFootprint(currentZoom, event1.sizeTier);
  const footprint2 = getMarkerFootprint(currentZoom, event2.sizeTier);
  
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

/**
 * Calculates ranks for events based on their scores.
 * Events with equal scores share the same rank.
 * Higher scores get lower rank numbers (rank 1 is best).
 * @param {Array} events - Array of events with scores
 * @returns {Object} Map of event IDs to their ranks
 */
export const calculateEventRanks = (events) => {
  // Sort events by score in descending order
  const sortedEvents = [...events].sort((a, b) => {
    const scoreA = b.currentScore || b.importanceScore || 0;
    const scoreB = a.currentScore || a.importanceScore || 0;
    return scoreA - scoreB;
  });

  // Calculate ranks (equal scores get equal ranks)
  const ranks = {};
  let currentRank = 1;
  let prevScore = null;

  sortedEvents.forEach((event, index) => {
    const score = event.currentScore || event.importanceScore || 0;
    
    // If score is different from previous, increment rank
    if (prevScore !== null && score !== prevScore) {
      currentRank = index + 1;
    }
    
    ranks[event.id] = currentRank;
    prevScore = score;
  });

  return ranks;
};

// Update the tier determination to use score-based ranks
export const determineEventTier = (event, visibleEvents, currentlyVisibleArea = null) => {
  // Get current ranks for visible events
  const ranks = calculateEventRanks(visibleEvents);
  const eventRank = ranks[event.id];

  // Global top 5 always get top tier regardless of viewport
  if (eventRank <= 5) {
    return 'top';
  }

  // If we have visible area context, check for local importance
  if (currentlyVisibleArea && visibleEvents.length > 0) {
    // Get events that are actually in the current viewport
    const eventsInView = visibleEvents.filter(e => 
      currentlyVisibleArea.contains(L.latLng(e.coordinates))
    );

    // Calculate ranks for events in view
    const localRanks = calculateEventRanks(eventsInView);
    const localRank = localRanks[event.id];

    // If this event is in local top 10, it gets high tier
    if (localRank && localRank <= 10) {
      return 'high';
    }
  }

  // Default to normal tier
  return 'normal';
}; 