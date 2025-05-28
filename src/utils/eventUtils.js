import { MIN_TOP_EVENTS, MAX_TOP_EVENTS } from './mapUtils';

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