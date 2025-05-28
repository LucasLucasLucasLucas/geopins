import React, { useState, useCallback, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import EventMarker from '../markers/EventMarker.jsx';
import ClusterMarker from '../markers/ClusterMarker.jsx';
import { processEvents } from '../../services/eventService';
import { viewportService } from '../../services/viewportService';
import { clusterService } from '../../services/clusterService';

function EventHandler({ events, setVisibleEvents, setHiddenEvents, topVisibleCount }) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);
  const [clusters, setClusters] = useState([]);

  const updateEvents = useCallback(() => {
    if (!mapReady) return;

    try {
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      // Check if we need to update based on viewport changes
      if (!viewportService.needsUpdate(bounds, zoom)) {
        return;
      }

      // Update viewport service state
      viewportService.updateViewport(bounds, zoom);

      // Filter events based on viewport and LOD
      const filteredEvents = viewportService.filterEvents(events, bounds, zoom);

      // Create clusters for dense areas
      const newClusters = clusterService.createClusters(filteredEvents, map);
      setClusters(newClusters);

      // Process remaining events (not in clusters)
      const unclustered = filteredEvents.filter(event => !clusterService.isEventClustered(event));
      const { visibleEvents, hiddenEvents } = processEvents(unclustered, map, topVisibleCount);

      setVisibleEvents(visibleEvents);
      setHiddenEvents(hiddenEvents);
    } catch (error) {
      console.error('Error in event handling:', error);
    }
  }, [events, topVisibleCount, mapReady, map, setVisibleEvents, setHiddenEvents]);

  // Handle cluster click
  const handleClusterClick = useCallback((clusterEvents) => {
    const { visibleEvents, hiddenEvents } = processEvents(clusterEvents, map, clusterEvents.length);
    setVisibleEvents(prev => [...prev, ...visibleEvents]);
    setHiddenEvents(prev => [...prev, ...hiddenEvents]);
  }, [map, setVisibleEvents, setHiddenEvents]);

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

export default EventHandler; 