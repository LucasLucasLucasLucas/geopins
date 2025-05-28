import React, { useState, useEffect } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { createCategoryIcon } from './MarkerIcon';

function EventMarker({ event, onClick }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  return (
    <Marker 
      position={event.coordinates}
      icon={createCategoryIcon(event.category, event.severity, event.verified, zoom, event.rank, event.sizeTier)}
      eventHandlers={{
        click: () => onClick(event)
      }}
    >
      <Tooltip 
        direction="top" 
        offset={[0, -20]}
        opacity={1}
        permanent={false}
        className="event-tooltip"
      >
        <div className="tooltip-content">
          <strong>{event.title}</strong>
          <p>
            Breaking news: A significant development has occurred in this region. Click for full details.
            {event.verified && <span className="verified-tag">✓ Verified</span>}
          </p>
        </div>
      </Tooltip>
    </Marker>
  );
}

export default EventMarker; 