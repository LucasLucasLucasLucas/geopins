import React, { useState, useEffect, useMemo } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { markerCache } from '../../services/markerService';
import { Event } from '../../types/Event';

interface EventMarkerProps {
  event: Event;
  onClick: (event: Event) => void;
  onHoverStart: () => void;
}

const EventMarker = React.memo(function EventMarker({ event, onClick, onHoverStart }: EventMarkerProps) {
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
      event.tags?.[0] || 'default', // Use first tag as category
      'medium', // Default severity
      true, // Default verified status
      zoom,
      event.rank,
      event.sourceTier || 'local' // Use sourceTier for marker size
    );
  }, [event.tags, event.rank, event.sourceTier, zoom]);

  const tooltipContent = useMemo(() => (
    <div className="tooltip-content">
      <strong>{event.title}</strong>
      <p>
        {event.summary}
        {event.articles.length > 0 && (
          <span className="source-tag"> - {event.articles[0].publisher}</span>
        )}
      </p>
      <div className="score-indicator">
        Score: {Math.round(event.score)}
      </div>
    </div>
  ), [event.title, event.summary, event.articles, event.score]);

  return (
    <Marker 
      position={[event.location.lat, event.location.lng]}
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
});

export default EventMarker; 