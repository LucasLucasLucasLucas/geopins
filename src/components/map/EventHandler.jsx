import React, { useState, useCallback, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { useDebounce } from '../../hooks/useDebounce';
import { checkMarkersCollision, determineEventTier } from '../../utils/eventUtils';
import EventMarker from '../markers/EventMarker.jsx';
import ClusterMarker from '../markers/ClusterMarker.jsx';
import { processEvents } from '../../services/eventService';
import { viewportService } from '../../services/viewportService';
import { clusterService } from '../../services/clusterService';

const DEBOUNCE_DELAY = 100; // 100ms debounce delay

function EventHandler({ events, setVisibleEvents, setHiddenEvents, topVisibleCount }) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);
  const [useVisualFootprint, setUseVisualFootprint] = useState(true);
  const [clusters, setClusters] = useState([]);

  const updateEvents = useCallback(() => {
    if (!mapReady) return;

    try {
      const bounds = map.getBounds();
      const currentZoom = map.getZoom();
      
      // Extend the bounds for event loading
      const extendedBounds = bounds.pad(0.5);
      
      // Get all events in extended bounds
      const inBoundsEvents = events.filter(event => {
        const latLng = L.latLng(event.coordinates);
        return extendedBounds.contains(latLng);
      });

      // Sort events by rank (lower rank = higher priority)
      const rankedEvents = [...inBoundsEvents].sort((a, b) => a.rank - b.rank);
      
      // Initialize arrays for visible and hidden events
      const visibleEvents = [];
      const hiddenEvents = [];
      
      // First pass: Place all events without considering collisions
      // This helps us determine local importance before final placement
      const preliminaryVisible = rankedEvents.slice(0, topVisibleCount).map(event => ({
        ...event,
        // Initially use global ranking since we don't have visible events yet
        sizeTier: determineEventTier(event)
      }));

      // Second pass: Apply collision detection with finalized size tiers
      for (const event of preliminaryVisible) {
        if (visibleEvents.length >= topVisibleCount) {
          // For hidden events, use global ranking
          hiddenEvents.push({
            ...event,
            sizeTier: determineEventTier(event)
          });
          continue;
        }

        let hasCollision = false;

        // Check for collisions with already placed events
        for (const placedEvent of visibleEvents) {
          let collides;
          
          if (useVisualFootprint) {
            collides = checkMarkersCollision(event, placedEvent, map, currentZoom);
          } else {
            const distance = getPixelDistance(
              L.latLng(event.coordinates),
              L.latLng(placedEvent.coordinates),
              map
            );
            const eventCollisionDistance = COLLISION_CONFIG.getCollisionDistance(currentZoom, event.sizeTier);
            const placedCollisionDistance = COLLISION_CONFIG.getCollisionDistance(currentZoom, placedEvent.sizeTier);
            const effectiveCollisionDistance = Math.max(eventCollisionDistance, placedCollisionDistance);
            collides = distance < effectiveCollisionDistance;
          }
          
          if (collides) {
            if (placedEvent.rank > event.rank) {
              // Remove the placed event and add this one
              visibleEvents.splice(visibleEvents.indexOf(placedEvent), 1);
              hiddenEvents.push({
                ...placedEvent,
                sizeTier: determineEventTier(placedEvent)
              });
              
              visibleEvents.push(event);
            } else {
              hiddenEvents.push({
                ...event,
                sizeTier: determineEventTier(event)
              });
            }
            hasCollision = true;
            break;
          }
        }

        if (!hasCollision) {
          visibleEvents.push(event);
        }
      }

      // Final pass: Update size tiers based on final visible set
      const finalVisibleEvents = visibleEvents.map(event => ({
        ...event,
        // Now use local ranking with the final set of visible events
        sizeTier: determineEventTier(event, visibleEvents)
      }));

      setVisibleEvents(finalVisibleEvents);
      setHiddenEvents(hiddenEvents);
    } catch (error) {
      console.error('Error in event handling:', error);
      setUseVisualFootprint(false);
    }
  }, [events, topVisibleCount, mapReady, map, setVisibleEvents, setHiddenEvents, useVisualFootprint]);

  // Debounce the update function
  const debouncedUpdate = useDebounce(updateEvents, DEBOUNCE_DELAY);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!mapReady) return;
      debouncedUpdate();
    };

    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);

    return () => {
      map.off('moveend', handleViewportChange);
      map.off('zoomend', handleViewportChange);
    };
  }, [map, mapReady, debouncedUpdate]);

  // Initialize map and trigger first update
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

  // Handle cluster click
  const handleClusterClick = useCallback((clusterEvents) => {
    const { visibleEvents, hiddenEvents } = processEvents(clusterEvents, map, clusterEvents.length);
    setVisibleEvents(prev => [...prev, ...visibleEvents]);
    setHiddenEvents(prev => [...prev, ...hiddenEvents]);
  }, [map, setVisibleEvents, setHiddenEvents]);

  return (
    <>
      {clusters.map(cluster => (
        <ClusterMarker
          key={cluster.id}
          cluster={cluster}
          onClusterClick={handleClusterClick}
        />
      ))}
    </>
  );
}

export default React.memo(EventHandler); 