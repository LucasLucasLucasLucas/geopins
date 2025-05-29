import React, { useState, useEffect, useMemo } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { markerCache } from '../../services/markerService';

const EventMarker = React.memo(function EventMarker({ event, onClick, onHoverStart }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
      markerCache.clearCacheIfNeeded(map.getZoom());
    };
    
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  const icon = useMemo(() => {
    return markerCache.getIcon(
      event.category,
      event.severity,
      event.verified,
      zoom,
      event.rank,
      event.sizeTier
    );
  }, [event.category, event.severity, event.verified, zoom, event.rank, event.sizeTier]);

  const tooltipContent = useMemo(() => (
    <div className="tooltip-content">
      <strong>{event.title}</strong>
      <p>
        Breaking news: A significant development has occurred in this region. Click for full details.
        {event.verified && <span className="verified-tag">✓ Verified</span>}
      </p>
      <div className="score-indicator">
        Score: {Math.round(event.currentScore || event.importanceScore)}
      </div>
    </div>
  ), [event.title, event.verified, event.currentScore, event.importanceScore]);

  return (
    <Marker 
      position={event.coordinates}
      icon={icon}
      eventHandlers={{
        click: () => onClick(event),
        mouseover: onHoverStart
      }}
    >
      <Tooltip 
        direction="top" 
        offset={[0, -20]}
        opacity={1}
        permanent={false}
        className="event-tooltip"
      >
        {tooltipContent}
      </Tooltip>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.coordinates[0] === nextProps.event.coordinates[0] &&
    prevProps.event.coordinates[1] === nextProps.event.coordinates[1] &&
    prevProps.event.category === nextProps.event.category &&
    prevProps.event.severity === nextProps.event.severity &&
    prevProps.event.verified === nextProps.event.verified &&
    prevProps.event.rank === nextProps.event.rank &&
    prevProps.event.sizeTier === nextProps.event.sizeTier &&
    prevProps.event.currentScore === nextProps.event.currentScore
  );
});

export default EventMarker; 