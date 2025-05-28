import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';

function ZoomDebugger() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    map.on('zoomend', updateZoom);
    map.on('zoom', updateZoom);

    return () => {
      map.off('zoomend', updateZoom);
      map.off('zoom', updateZoom);
    };
  }, [map]);

  return (
    <div className="zoom-debugger">
      Current Zoom: {zoom.toFixed(2)}
    </div>
  );
}

export default ZoomDebugger; 