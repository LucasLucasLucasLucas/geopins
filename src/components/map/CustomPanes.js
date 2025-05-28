import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

function CustomPanes() {
  const map = useMap();
  
  useEffect(() => {
    if (!map.getPane('hiddenEvents')) {
      map.createPane('hiddenEvents');
      map.getPane('hiddenEvents').style.zIndex = 350;
    }
  }, [map]);
  
  return null;
}

export default CustomPanes; 