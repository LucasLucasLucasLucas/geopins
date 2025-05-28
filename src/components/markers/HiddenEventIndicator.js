import React, { useState, useRef } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';

function HiddenEventIndicator({ event, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  const handleTooltipMouseLeave = (e) => {
    if (!e.relatedTarget?.classList.contains('hidden-event-marker')) {
      setShowTooltip(false);
    }
  };

  const handleTooltipClick = () => {
    onClick(event);
  };

  return (
    <>
      <CircleMarker
        center={event.coordinates}
        radius={3}
        fillColor="#000000"
        fillOpacity={0.4}
        stroke={false}
        pane="hiddenEvents"
        eventHandlers={{
          click: () => setShowTooltip(true)
        }}
        className="hidden-event-marker"
      />
      {showTooltip && (
        <Popup
          position={event.coordinates}
          closeButton={false}
          className="hover-popup"
          ref={tooltipRef}
        >
          <div 
            className="tooltip-content"
            onMouseLeave={handleTooltipMouseLeave}
            onClick={handleTooltipClick}
            style={{ cursor: 'pointer' }}
          >
            <strong>{event.title}</strong>
            <p>Breaking news: A significant development has occurred in this region. Click for full details.</p>
          </div>
        </Popup>
      )}
    </>
  );
}

export default HiddenEventIndicator; 