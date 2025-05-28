import React, { useState, useMemo } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { markerCache } from '../../services/markerService';

function ClusterMarker({ cluster, onClusterClick }) {
  const map = useMap();
  const [isHovered, setIsHovered] = useState(false);

  const icon = useMemo(() => {
    const size = Math.min(60, Math.max(40, 30 + Math.log2(cluster.size) * 5));
    const html = `
      <div class="cluster-marker" style="width:${size}px;height:${size}px;">
        <div class="cluster-content">
          <span class="cluster-size">${cluster.size}</span>
          <span class="cluster-label">events</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'cluster-marker-wrapper',
      iconSize: L.point(size, size),
      iconAnchor: L.point(size/2, size/2)
    });
  }, [cluster.size]);

  const handleClick = () => {
    // If cluster is small enough or zoom is high, show all events
    if (cluster.size <= 5 || map.getZoom() >= 12) {
      onClusterClick(cluster.events);
    } else {
      // Otherwise, zoom to cluster bounds
      map.fitBounds(cluster.bounds, {
        padding: L.point(50, 50),
        maxZoom: 12
      });
    }
  };

  return (
    <Marker
      position={cluster.center}
      icon={icon}
      eventHandlers={{
        click: handleClick,
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false)
      }}
    >
      {isHovered && (
        <Tooltip 
          direction="top"
          offset={[0, -20]}
          opacity={1}
        >
          <div className="cluster-tooltip">
            <strong>{cluster.size} Events</strong>
            <p>Top event: {cluster.topEvent.title}</p>
            <small>Click to {cluster.size <= 5 || map.getZoom() >= 12 ? 'view events' : 'zoom in'}</small>
          </div>
        </Tooltip>
      )}
    </Marker>
  );
}

export default ClusterMarker; 