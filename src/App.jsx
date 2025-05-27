import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Tooltip, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

// Fix Leaflet's default icon path
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Configure default marker icon
const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Constants for decluttering
const MIN_TOP_EVENTS = 5;
const MAX_TOP_EVENTS = 100;
const MIN_PIXEL_DISTANCE = 25; // Reduced from 40px to better match visual overlap
const DEBUG_MODE = true; // Enable collision zone visualization

// Update collision distance configuration with much smaller distances
const COLLISION_CONFIG = {
  // Base collision distances
  baseDistance: 5,     // Maximum collision distance at lowest zoom
  minDistance: 3,      // Minimum collision distance at highest zoom
  
  // Zoom level breakpoints
  startZoom: 2,
  endZoom: 15,
  
  // Linear scaling between zoom levels
  getCollisionDistance: (zoom) => {
    const clampedZoom = Math.min(Math.max(zoom, COLLISION_CONFIG.startZoom), COLLISION_CONFIG.endZoom);
    const zoomProgress = (clampedZoom - COLLISION_CONFIG.startZoom) / 
      (COLLISION_CONFIG.endZoom - COLLISION_CONFIG.startZoom);
    
    return Math.round(
      COLLISION_CONFIG.baseDistance - 
      (zoomProgress * (COLLISION_CONFIG.baseDistance - COLLISION_CONFIG.minDistance))
    );
  }
};

// Debug helper to show distance at different zoom levels
if (DEBUG_MODE) {
  console.log('Collision Distance Scale:');
  for (let zoom = 2; zoom <= 15; zoom++) {
    console.log(`Zoom ${zoom}: ${COLLISION_CONFIG.getCollisionDistance(zoom)}px`);
  }
}

// Utility functions for decluttering
const getPixelDistance = (point1, point2, map) => {
  const p1 = map.latLngToContainerPoint(point1);
  const p2 = map.latLngToContainerPoint(point2);
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p2.y, 2));
};

// Check if a point is within the visible viewport
const isInVisibleViewport = (latLng, map) => {
  const point = map.latLngToContainerPoint(latLng);
  const mapSize = map.getSize();
  
  // Get actual visible map dimensions
  const container = map.getContainer();
  const actualWidth = container.clientWidth;
  const actualHeight = container.clientHeight;
  
  // Check if point is within the actual visible area
  return point.x >= 0 && 
         point.x <= actualWidth && 
         point.y >= 0 && 
         point.y <= actualHeight;
};

// Update createRankIcon to use category images
const createCategoryIcon = (category, severity, verified, zoom, rank) => {
  const zoomClass = zoom <= 4 ? 'far' : zoom <= 8 ? 'medium' : 'close';
  const severityClass = `severity-${severity}`;
  const verifiedClass = verified ? 'verified' : '';
  
  const iconConfig = {
    className: `category-marker-wrapper zoom-level-${zoomClass} ${severityClass} ${verifiedClass}`,
    html: `
      <div class="category-marker">
        <img src="/images/categories/${category}.svg" alt="${category}" />
      </div>
      <div class="rank-banner">#${rank}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  };
  
  return L.divIcon(iconConfig);
};

// Add rank tier configuration
const RANK_TIERS = {
  TOP: { max: 100 },
  HIGH: { max: 300 },
  MEDIUM: { max: 500 },
  LOW: { max: Infinity }
};

// Hidden event indicator component
function HiddenEventIndicator({ event, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  const handleTooltipMouseLeave = (e) => {
    // Check if we're not moving back to the marker
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

// Custom pane initialization component
function CustomPanes() {
  const map = useMap();
  
  useEffect(() => {
    // Create custom pane for hidden events that renders below markers
    if (!map.getPane('hiddenEvents')) {
      map.createPane('hiddenEvents');
      map.getPane('hiddenEvents').style.zIndex = 350; // Below markers (400) but above tiles (200)
    }
  }, [map]);
  
  return null;
}

// Update MapEventHandler component
function MapEventHandler({ events, setVisibleEvents, setHiddenEvents, topVisibleCount }) {
  const map = useMap();
  const [mapReady, setMapReady] = useState(false);
  
  // Memoize the update function with proper dependencies
  const updateEvents = useCallback(() => {
    if (!mapReady) return;

    const bounds = map.getBounds();
    const currentZoom = map.getZoom();
    const collisionDistance = COLLISION_CONFIG.getCollisionDistance(currentZoom);
    
    // Get all events in bounds
    const inBoundsEvents = events.filter(event => {
      const latLng = L.latLng(event.coordinates);
      return bounds.contains(latLng) && isInVisibleViewport(latLng, map);
    });

    // Sort events by rank (lower rank = higher priority)
    const rankedEvents = [...inBoundsEvents].sort((a, b) => a.rank - b.rank);
    
    // Initialize all events as potentially visible
    const visibleEvents = new Map();
    const hiddenEvents = [];
    
    console.log(`Processing ${rankedEvents.length} events in bounds, target: ${topVisibleCount}`);
    
    // First pass: Try to make all events visible within the limit
    for (const event of rankedEvents) {
      // Stop if we've reached the visibility limit
      if (visibleEvents.size >= topVisibleCount) {
        hiddenEvents.push(event);
        continue;
      }

      const eventPos = L.latLng(event.coordinates);
      let hasCollision = false;

      // Check for collisions with already placed events
      for (const [placedId, placedEvent] of visibleEvents.entries()) {
        const distance = getPixelDistance(eventPos, L.latLng(placedEvent.coordinates), map);
        
        // Only consider it a collision if pins are very close
        if (distance < collisionDistance) {
          // If we collide with a higher-ranked event, replace it
          if (placedEvent.rank > event.rank) {
            console.log(`Replacing event ${placedEvent.rank} with ${event.rank} due to better rank`);
            visibleEvents.delete(placedId);
            hiddenEvents.push(placedEvent);
            visibleEvents.set(event.id, {
              ...event,
              collisionRadius: collisionDistance
            });
          } else {
            hiddenEvents.push(event);
          }
          hasCollision = true;
          break;
        }
      }

      // If no collision and within limit, make it visible
      if (!hasCollision && visibleEvents.size < topVisibleCount) {
        visibleEvents.set(event.id, {
          ...event,
          collisionRadius: collisionDistance
        });
        console.log(`Placed event ${event.rank}, total visible: ${visibleEvents.size}`);
      }
    }

    // Add remaining events to hidden if we're over the limit
    const remainingEvents = rankedEvents.slice(visibleEvents.size);
    hiddenEvents.push(...remainingEvents);

    console.log(`Final counts - Visible: ${visibleEvents.size}, Hidden: ${hiddenEvents.length}`);
    console.log('Visible events:', Array.from(visibleEvents.values()).map(e => e.rank).sort((a, b) => a - b));

    setVisibleEvents(Array.from(visibleEvents.values()));
    setHiddenEvents(hiddenEvents);
  }, [events, topVisibleCount, mapReady, map]);

  // Initialize map
  useEffect(() => {
    const checkMapReady = () => {
      const container = map.getContainer();
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        setMapReady(true);
      } else {
        setTimeout(checkMapReady, 100);
      }
    };
    checkMapReady();
  }, [map]);

  // Update on map changes
  useMapEvents({
    moveend: updateEvents,
    zoomend: updateEvents,
    zoomlevelschange: updateEvents,
    resize: updateEvents
  });

  // Force update when topVisibleCount changes
  useEffect(() => {
    if (mapReady) {
      console.log('Top visible count changed to:', topVisibleCount);
      updateEvents();
    }
  }, [topVisibleCount, mapReady, updateEvents]);

  // Initial update when map is ready
  useEffect(() => {
    if (mapReady) {
      updateEvents();
    }
  }, [mapReady, updateEvents]);

  return null;
}

// Mock data structure - will be replaced with API/database fetch
const mockNewsEvents = [
  {
    id: '1234-5678-abcd',
    timestamp: new Date('2024-03-26T10:00:00Z').toISOString(),
    title: "Amsterdam Tech Hub",
    coordinates: [52.3676, 4.9041],
    description: "Major European technology investment announcement",
    source: "Tech Daily",
    category: "technology",
    tags: ["investment", "europe", "tech"],
    severity: "medium",
    verified: true,
    rank: 3
  },
  {
    id: '8765-4321-efgh',
    timestamp: new Date('2024-03-26T09:30:00Z').toISOString(),
    title: "Tokyo Climate Summit",
    coordinates: [35.6762, 139.6503],
    description: "International climate policy negotiations",
    source: "Climate Watch",
    category: "environment",
    tags: ["climate", "policy", "international"],
    severity: "high",
    verified: true,
    rank: 1
  },
  {
    id: 'abcd-9012-ijkl',
    timestamp: new Date('2024-03-26T08:45:00Z').toISOString(),
    title: "São Paulo Economic Forum",
    coordinates: [-23.5505, -46.6333],
    description: "South American economic development conference",
    source: "Economic Times",
    category: "economy",
    tags: ["economy", "south-america", "development"],
    severity: "medium",
    verified: true,
    rank: 4
  },
  {
    id: '4567-mnop-8901',
    timestamp: new Date('2024-03-26T11:15:00Z').toISOString(),
    title: "Lake Baikal Conservation",
    coordinates: [53.5587, 108.1650],
    description: "New environmental protection measures at world's deepest lake",
    source: "Environmental Report",
    category: "environment",
    tags: ["conservation", "water", "siberia"],
    severity: "medium",
    verified: true,
    rank: 5
  },
  {
    id: 'qrst-2345-uvwx',
    timestamp: new Date('2024-03-26T07:20:00Z').toISOString(),
    title: "Kashmir Line of Control",
    coordinates: [34.1526, 74.3152],
    description: "Cross-border dialogue initiatives between India and Pakistan",
    source: "Global Affairs",
    category: "politics",
    tags: ["diplomacy", "border", "asia"],
    severity: "high",
    verified: true,
    rank: 2
  },
  {
    id: 'event-006',
    timestamp: new Date('2024-03-25T15:30:00Z').toISOString(),
    title: "Silicon Valley AI Breakthrough",
    coordinates: [37.4419, -122.1430],
    description: "Revolutionary AI model shows human-level reasoning capabilities",
    source: "Tech Insider",
    category: "technology",
    tags: ["ai", "innovation", "silicon-valley"],
    severity: "high",
    verified: true,
    rank: 6
  },
  {
    id: 'event-007',
    timestamp: new Date('2024-03-24T08:15:00Z').toISOString(),
    title: "Great Barrier Reef Recovery Project",
    coordinates: [-18.2871, 147.6992],
    description: "Major coral restoration initiative shows promising results",
    source: "Ocean Science Today",
    category: "environment",
    tags: ["coral", "conservation", "marine"],
    severity: "medium",
    verified: true,
    rank: 15
  },
  {
    id: 'event-008',
    timestamp: new Date('2024-03-23T11:45:00Z').toISOString(),
    title: "Sahara Solar Farm Launch",
    coordinates: [23.4162, 25.6628],
    description: "World's largest solar installation begins operations",
    source: "Energy Monitor",
    category: "technology",
    tags: ["renewable", "solar", "africa"],
    severity: "high",
    verified: true,
    rank: 8
  },
  {
    id: 'event-009',
    timestamp: new Date('2024-03-22T14:20:00Z').toISOString(),
    title: "Arctic Council Emergency Meeting",
    coordinates: [78.2232, 15.6267],
    description: "Nations gather to address rapid ice melt concerns",
    source: "Climate Report",
    category: "environment",
    tags: ["arctic", "climate", "international"],
    severity: "high",
    verified: true,
    rank: 7
  },
  {
    id: 'event-010',
    timestamp: new Date('2024-03-21T09:10:00Z').toISOString(),
    title: "Singapore Quantum Computing Center",
    coordinates: [1.3521, 103.8198],
    description: "New quantum research facility opens with breakthrough announcement",
    source: "Science Daily",
    category: "technology",
    tags: ["quantum", "research", "asia"],
    severity: "medium",
    verified: true,
    rank: 12
  },
  {
    id: 'event-105',
    timestamp: new Date('2024-02-26T16:45:00Z').toISOString(),
    title: "Antarctic Research Station Upgrade",
    coordinates: [-82.8628, -135.0000],
    description: "Major technological improvements to climate research capabilities",
    source: "Polar Science Weekly",
    category: "technology",
    tags: ["research", "antarctica", "climate"],
    severity: "medium",
    verified: true,
    rank: 105
  }
];

// Generate a pool of unique random ranks between 6 and 500
const generateUniqueRanks = (count, min, max) => {
  const ranks = new Set();
  while (ranks.size < count) {
    ranks.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(ranks);
};

// Constants for event generation
const categories = ['environment', 'politics', 'economy', 'technology'];
const severities = ['low', 'medium', 'high'];
const sources = ['Global News', 'Tech Review', 'Economic Times', 'Environmental Watch', 'Political Observer'];

// Helper function to generate random coordinates
const getRandomCoordinates = () => {
  const lat = (Math.random() * 180) - 90;
  const lng = (Math.random() * 360) - 180;
  return [lat, lng];
};

// Generate unique ranks for remaining events
const remainingEventCount = 100;  // Generating 100 more events
const uniqueRanks = generateUniqueRanks(remainingEventCount, 6, 500);

// Generate remaining events with random ranks
for (let i = 0; i < remainingEventCount; i++) {
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);
  timestamp.setHours(timestamp.getHours() - hoursAgo);
  timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

  const event = {
    id: `event-${(i + 6).toString().padStart(3, '0')}`,
    timestamp: timestamp.toISOString(),
    title: `Event ${i + 6} Title`,
    coordinates: getRandomCoordinates(),
    description: `Description for event ${i + 6}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    tags: categories.slice(0, 3).sort(() => Math.random() - 0.5),
    severity: severities[Math.floor(Math.random() * severities.length)],
    verified: Math.random() > 0.3,
    rank: uniqueRanks[i]
  };

  mockNewsEvents.push(event);
}

// After the existing event generation loop, add Uppsala cluster
const UPPSALA_CENTER = [59.8586, 17.6389];
const CLUSTER_RADIUS = 0.1;

// Generate 50 clustered events around Uppsala
for (let i = 0; i < 50; i++) {
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  
  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() - daysAgo);
  timestamp.setHours(timestamp.getHours() - hoursAgo);
  timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

  // Generate coordinates with small random variations
  const lat = UPPSALA_CENTER[0] + (Math.random() * 2 - 1) * CLUSTER_RADIUS;
  const lng = UPPSALA_CENTER[1] + (Math.random() * 2 - 1) * CLUSTER_RADIUS;

  const event = {
    id: `uppsala-${(i + 1).toString().padStart(3, '0')}`,
    timestamp: timestamp.toISOString(),
    title: `Uppsala Area Event ${i + 1}`,
    coordinates: [lat, lng],
    description: `Local event in Uppsala region - Cluster test ${i + 1}`,
    source: sources[Math.floor(Math.random() * sources.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    tags: ["uppsala", "sweden", categories[Math.floor(Math.random() * categories.length)]],
    severity: severities[Math.floor(Math.random() * severities.length)],
    verified: Math.random() > 0.3,
    rank: 500 + i // Ranks starting from 501 to ensure no overlap with existing events
  };

  mockNewsEvents.push(event);
}

// Time range presets
const TIME_PRESETS = {
  '24h': {
    label: 'Last 24 hours',
    getRange: () => {
      const end = new Date();
      const start = new Date(end - 24 * 60 * 60 * 1000);
      return { start, end };
    }
  },
  '7d': {
    label: 'Last 7 days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
  },
  'month': {
    label: 'This month',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    }
  }
};

function DateFilter({ activeTimeRange, onTimeRangeChange }) {
  const [customRange, setCustomRange] = useState({
    start: '',
    end: ''
  });

  const handlePresetClick = (presetKey) => {
    const range = TIME_PRESETS[presetKey].getRange();
    onTimeRangeChange({
      preset: presetKey,
      ...range
    });
  };

  const handleCustomRangeChange = (type, value) => {
    const newRange = {
      ...customRange,
      [type]: value
    };
    setCustomRange(newRange);

    // Only update if both dates are set
    if (newRange.start && newRange.end) {
      onTimeRangeChange({
        preset: null,
        start: new Date(newRange.start),
        end: new Date(newRange.end)
      });
    }
  };

  return (
    <div className="filter-section">
      <h3>Time Range</h3>
      <div className="time-presets">
        {Object.entries(TIME_PRESETS).map(([key, { label }]) => (
          <button
            key={key}
            className={`preset-button ${activeTimeRange?.preset === key ? 'active' : ''}`}
            onClick={() => handlePresetClick(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <h4>Custom Range</h4>
        <div className="date-inputs">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => handleCustomRangeChange('start', e.target.value)}
            disabled={activeTimeRange?.preset !== null}
          />
          <span>to</span>
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => handleCustomRangeChange('end', e.target.value)}
            disabled={activeTimeRange?.preset !== null}
          />
        </div>
      </div>
    </div>
  );
}

// Update FilterPanel slider to ensure immediate updates
function FilterPanel({ events, activeFilters, onFilterChange, activeTimeRange, onTimeRangeChange, topVisibleCount, onTopVisibleCountChange }) {
  // Extract unique values for each filter type
  const filterOptions = useMemo(() => ({
    categories: [...new Set(events.map(event => event.category))],
    severities: [...new Set(events.map(event => event.severity))],
  }), [events]);

  const handleSliderChange = (e) => {
    const newValue = parseInt(e.target.value);
    console.log('Slider changed to:', newValue);
    onTopVisibleCountChange(newValue);
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <h3>Top Visible Events</h3>
        <div className="slider-container">
          <input
            type="range"
            min={MIN_TOP_EVENTS}
            max={MAX_TOP_EVENTS}
            value={topVisibleCount}
            onChange={handleSliderChange}
            className="range-slider"
          />
          <div className="slider-value">{topVisibleCount} events</div>
        </div>
      </div>

      <DateFilter 
        activeTimeRange={activeTimeRange}
        onTimeRangeChange={onTimeRangeChange}
      />
      
      <div className="filter-section">
        <h3>Categories</h3>
        {filterOptions.categories.map(category => (
          <label key={category} className="filter-option">
            <input
              type="checkbox"
              checked={activeFilters.categories.includes(category)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                onFilterChange('categories', category, isChecked);
              }}
            />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </label>
        ))}
      </div>

      <div className="filter-section">
        <h3>Severity</h3>
        {filterOptions.severities.map(severity => (
          <label key={severity} className="filter-option">
            <input
              type="checkbox"
              checked={activeFilters.severities.includes(severity)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                onFilterChange('severities', severity, isChecked);
              }}
            />
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </label>
        ))}
      </div>

      <div className="filter-section">
        <h3>Status</h3>
        <label className="filter-option">
          <input
            type="checkbox"
            checked={activeFilters.verified}
            onChange={(e) => {
              onFilterChange('verified', 'verified', e.target.checked);
            }}
          />
          Verified Only
        </label>
      </div>
    </div>
  );
}

// Modal component for detailed event view
function EventModal({ event, onClose }) {
  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-image-placeholder">
          <div className="placeholder-text">News Image</div>
        </div>
        
        <div className="modal-body">
          <h2>{event.title}</h2>
          
          <div className="event-metadata">
            <span className="category">{event.category}</span>
            <span className="date">{new Date(event.timestamp).toLocaleDateString()}</span>
            {event.verified && <span className="verified">✓ Verified</span>}
          </div>
          
          <div className="event-tags">
            {event.tags.map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
          </div>
          
          <div className="article-content">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
            
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
          </div>
          
          <div className="event-source">
            Source: <strong>{event.source}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// Update EventMarker component
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
      icon={createCategoryIcon(event.category, event.severity, event.verified, zoom, event.rank)}
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

function App() {
  const [events] = useState(mockNewsEvents);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    severities: [],
    verified: false
  });
  const [activeTimeRange, setActiveTimeRange] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [hiddenEvents, setHiddenEvents] = useState([]);
  const [topVisibleCount, setTopVisibleCount] = useState(20);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Handle filter changes
  const handleFilterChange = (filterType, value, isActive) => {
    setActiveFilters(prev => {
      if (filterType === 'verified') {
        return { ...prev, verified: isActive };
      }
      
      const filterArray = prev[filterType];
      const updatedFilters = isActive
        ? [...filterArray, value]
        : filterArray.filter(item => item !== value);
      
      return {
        ...prev,
        [filterType]: updatedFilters
      };
    });
  };

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const categoryMatch = activeFilters.categories.length === 0 || 
        activeFilters.categories.includes(event.category);
      
      const severityMatch = activeFilters.severities.length === 0 || 
        activeFilters.severities.includes(event.severity);
      
      const verifiedMatch = !activeFilters.verified || event.verified;

      let timeMatch = true;
      if (activeTimeRange) {
        const eventDate = new Date(event.timestamp);
        timeMatch = eventDate >= activeTimeRange.start && eventDate <= activeTimeRange.end;
      }

      return categoryMatch && severityMatch && verifiedMatch && timeMatch;
    });
  }, [events, activeFilters, activeTimeRange]);

  return (
    <div className="app">
      <header className="header">
        <h1>Geopins 🌍</h1>
        <p className="subtitle">First live version deployed</p>
      </header>
      <div className="main">
        <FilterPanel 
          events={events}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          activeTimeRange={activeTimeRange}
          onTimeRangeChange={setActiveTimeRange}
          topVisibleCount={topVisibleCount}
          onTopVisibleCountChange={setTopVisibleCount}
        />
        <div className="map-wrapper">
          <MapContainer
            center={[30, 45]}
            zoom={2}
            scrollWheelZoom={true}
            className="map-container"
            preferCanvas={true}
          >
            <CustomPanes />
            <MapEventHandler 
              events={filteredEvents}
              setVisibleEvents={setVisibleEvents}
              setHiddenEvents={setHiddenEvents}
              topVisibleCount={topVisibleCount}
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hiddenEvents.map(event => (
              <HiddenEventIndicator 
                key={`hidden-${event.id}`}
                event={event}
                onClick={setSelectedEvent}
              />
            ))}
            {visibleEvents.map(event => (
              <EventMarker 
                key={event.id}
                event={event}
                onClick={setSelectedEvent}
              />
            ))}
          </MapContainer>
        </div>
      </div>
      {selectedEvent && (
        <EventModal 
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// Add styles for modal and tooltip
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .modal-close {
    position: absolute;
    top: 15px;
    right: 15px;
    background: white;
    border: none;
    font-size: 24px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    z-index: 2;
  }

  .modal-image-placeholder {
    width: 100%;
    height: 300px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }

  .modal-body {
    padding: 24px;
  }

  .modal-body h2 {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #333;
  }

  .event-metadata {
    margin-bottom: 16px;
    display: flex;
    gap: 16px;
    font-size: 14px;
  }

  .event-metadata span {
    color: #666;
  }

  .event-metadata .verified {
    color: #2ecc71;
  }

  .event-tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }

  .tag {
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
  }

  .article-content {
    color: #333;
    line-height: 1.6;
  }

  .article-content p {
    margin-bottom: 16px;
  }

  .event-source {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #eee;
    color: #666;
    font-size: 14px;
  }

  .event-tooltip {
    background: white;
    border: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 0;
    max-width: 250px;
    width: 250px;
  }

  .tooltip-content {
    padding: 8px 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .tooltip-content strong {
    display: block;
    margin-bottom: 4px;
    color: #333;
    white-space: normal;
    word-wrap: break-word;
    font-size: 14px;
    line-height: 1.3;
  }

  .tooltip-content p {
    margin: 0;
    font-size: 12px;
    color: #666;
    line-height: 1.4;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .leaflet-tooltip {
    white-space: normal !important;
  }

  .leaflet-tooltip-top:before {
    border-top-color: white;
  }

  .hover-popup .leaflet-popup-content-wrapper {
    background: white;
    border: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 0;
  }

  .hover-popup .leaflet-popup-content {
    margin: 0;
    width: 250px !important;
  }

  .hover-popup .leaflet-popup-tip {
    background: white;
  }

  .hidden-event-marker {
    cursor: pointer;
  }
`;
document.head.appendChild(styleSheet);

export default App
