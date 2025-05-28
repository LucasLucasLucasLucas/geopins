import React, { useState, useCallback, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getPixelDistance, MIN_PIXEL_DISTANCE } from '../../utils/mapUtils';
import { getMarkerFootprint } from '../markers/MarkerIcon';
import { processEvents } from '../../services/eventService';

// Create spatial index for efficient collision detection
const createSpatialIndex = (map, events, zoom) => {
  const gridSize = 50;
  const grid = new Map();
  
  events.forEach(event => {
    const pixel = map.latLngToContainerPoint(L.latLng(event.coordinates));
    const gridX = Math.floor(pixel.x / gridSize);
    const gridY = Math.floor(pixel.y / gridSize);
    
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const key = `${gridX + x},${gridY + y}`;
        if (!grid.has(key)) {
          grid.set(key, []);
        }
        grid.get(key).push(event);
      }
    }
  });
  
  return {
    grid,
    gridSize,
    getNearbyEvents: (event) => {
      const pixel = map.latLngToContainerPoint(L.latLng(event.coordinates));
      const gridX = Math.floor(pixel.x / gridSize);
      const gridY = Math.floor(pixel.y / gridSize);
      const key = `${gridX},${gridY}`;
      return grid.get(key) || [];
    }
  };
};

// Enhanced collision detection
const checkMarkersCollision = (event1, event2, map, currentZoom) => {
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

// Simplified collision check for fallback
const checkSimpleCollision = (event1, event2, map, zoom) => {
  const distance = getPixelDistance(
    L.latLng(event1.coordinates),
    L.latLng(event2.coordinates),
    map
  );
  const minDistance = MIN_PIXEL_DISTANCE * (zoom <= 4 ? 0.7 : zoom <= 8 ? 0.85 : 1);
  return distance < minDistance;
};

// Determine event tier based on rank and viewport
const determineEventTier = (event, visibleEvents, currentlyVisibleArea = null) => {
  if (event.rank <= 5) return 'top';

  if (currentlyVisibleArea && visibleEvents.length > 0) {
    const eventsInView = visibleEvents.filter(e => 
      currentlyVisibleArea.contains(L.latLng(e.coordinates))
    );

    const localTop10 = eventsInView
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10)
      .map(e => e.id);

    if (localTop10.includes(event.id)) return 'high';
  }

  return 'normal';
};

// Main event handler component
function EventHandler({ events, setVisibleEvents, setHiddenEvents, topVisibleCount }) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);
  const [useVisualFootprint, setUseVisualFootprint] = useState(true);
  
  const getViewportEvents = useCallback(() => {
    const bounds = map.getBounds();
    const extendedBounds = bounds.pad(0.5);
    return events.filter(event => extendedBounds.contains(L.latLng(event.coordinates)));
  }, [events, map]);
  
  const getEventSizeTiers = useCallback((events, bounds) => {
    const tiers = new Map();
    
    events.forEach(event => {
      if (event.rank <= 5) {
        tiers.set(event.id, 'top');
      }
    });
    
    if (bounds) {
      const localEvents = events.filter(e => bounds.contains(L.latLng(e.coordinates)));
      const localTop10 = localEvents
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 10)
        .map(e => e.id);
        
      localTop10.forEach(id => {
        if (!tiers.has(id)) {
          tiers.set(id, 'high');
        }
      });
    }
    
    return tiers;
  }, []);
  
  const updateEvents = useCallback(() => {
    if (!mapReady) return;

    try {
      const { visibleEvents, hiddenEvents } = processEvents(events, map, topVisibleCount);
      setVisibleEvents(visibleEvents);
      setHiddenEvents(hiddenEvents);
    } catch (error) {
      console.error('Error in event handling:', error);
    }
  }, [events, topVisibleCount, mapReady, map, setVisibleEvents, setHiddenEvents]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!mapReady) return;
      updateEvents();
    };

    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);

    return () => {
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [map, mapReady, updateEvents]);

  useEffect(() => {
    const checkMapReady = () => {
      if (map.getContainer().clientWidth > 0 && map.getContainer().clientHeight > 0) {
        setMapReady(true);
        updateEvents();
      } else {
        setTimeout(checkMapReady, 100);
      }
    };
    checkMapReady();
  }, [map, updateEvents]);

  return null;
}

export default EventHandler; 