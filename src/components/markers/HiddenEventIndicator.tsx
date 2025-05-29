import React, { useState, useRef, useEffect } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { Event } from '../../types/Event';
import { CircleMarker as LeafletCircleMarker, Popup as LeafletPopup } from 'leaflet';

interface HiddenEventIndicatorProps {
  event: Event;
  onClick: (event: Event) => void;
  onHoverStart: () => void;
}

function HiddenEventIndicator({ event, onClick, onHoverStart }: HiddenEventIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<LeafletPopup | null>(null);
  const markerRef = useRef<LeafletCircleMarker | null>(null);
  const isHovering = useRef(false);

  const handleMouseEnter = () => {
    isHovering.current = true;
    setShowTooltip(true);
    onHoverStart();
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // Only hide tooltip if we're not moving to the popup
    const target = e.relatedTarget as Element;
    if (!target?.closest('.leaflet-popup')) {
      isHovering.current = false;
      setShowTooltip(false);
    }
  };

  const handleTooltipMouseEnter = () => {
    isHovering.current = true;
  };

  const handleTooltipMouseLeave = (e: React.MouseEvent) => {
    // Only hide if we're not moving back to the marker
    const target = e.relatedTarget as Element;
    if (!target?.classList?.contains('hidden-event-marker') && 
        !target?.closest('.leaflet-popup')) {
      isHovering.current = false;
      setShowTooltip(false);
    }
  };

  const handleTooltipClick = () => {
    onClick(event);
    // Keep tooltip visible if still hovering
    if (!isHovering.current) {
      setShowTooltip(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isHovering.current = false;
      setShowTooltip(false);
    };
  }, []);

  return (
    <>
      <CircleMarker
        ref={markerRef}
        center={[event.location.lat, event.location.lng]}
        pathOptions={{
          radius: 3,
          fillColor: "#000000",
          fillOpacity: 0.4,
          stroke: false,
          pane: "hiddenEvents"
        }}
        eventHandlers={{
          click: () => setShowTooltip(true),
          mouseenter: handleMouseEnter,
          mouseleave: handleMouseLeave
        }}
        className="hidden-event-marker"
      />
      {showTooltip && (
        <Popup
          position={[event.location.lat, event.location.lng]}
          options={{ closeButton: false }}
          className="hover-popup"
          ref={tooltipRef}
          onClose={() => {
            if (!isHovering.current) {
              setShowTooltip(false);
            }
          }}
        >
          <div 
            className="tooltip-content"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onClick={handleTooltipClick}
            style={{ cursor: 'pointer' }}
          >
            <strong>{event.title}</strong>
            <p>{event.summary}</p>
          </div>
        </Popup>
      )}
    </>
  );
}

export default HiddenEventIndicator; 