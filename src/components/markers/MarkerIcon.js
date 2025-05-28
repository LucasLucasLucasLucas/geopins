import L from 'leaflet';
import { getMarkerSize } from '../../services/eventService';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure default marker icon
export const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Create category-specific marker icon
export const createCategoryIcon = (category, severity, verified, zoom, rank, sizeTier) => {
  const zoomClass = zoom <= 4 ? 'far' : zoom <= 8 ? 'medium' : 'close';
  const severityClass = `severity-${severity}`;
  const verifiedClass = verified ? 'verified' : '';
  const rankTierClass = `rank-${sizeTier}`;
  
  const size = getMarkerSize(zoom, sizeTier);
  const bannerHeight = Math.round(size * 0.4);
  
  return L.divIcon({
    className: `category-marker-wrapper ${zoomClass} ${severityClass} ${verifiedClass} ${rankTierClass}`,
    html: `
      <div class="${rankTierClass}" style="position:relative;width:${size}px;height:${size + bannerHeight}px;">
        <div class="category-marker" style="width:${size}px;height:${size}px;position:absolute;top:0;left:0;">
          <img src="/images/categories/${category}.svg" alt="${category}" />
        </div>
        <div class="rank-banner" style="position:absolute;top:${size}px;left:50%;transform:translateX(-50%);">#${rank}</div>
      </div>
    `,
    iconSize: [size, size + bannerHeight],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -(size/2 + bannerHeight)]
  });
};

// Visual footprint calculations
export const getMarkerFootprint = (zoom, sizeTier = 'normal') => {
  const baseSize = getMarkerSize(zoom, sizeTier);
  const markerRadius = baseSize / 2;
  const bannerHeight = Math.round(baseSize * 0.4);
  const bannerWidth = baseSize * 1.2;
  
  const visualPadding = {
    top: 4,
    high: 3,
    normal: 2
  }[sizeTier] || 2;
  
  return {
    radius: markerRadius + visualPadding,
    bannerHeight,
    bannerWidth,
    totalHeight: baseSize + bannerHeight,
    visualPadding
  };
}; 