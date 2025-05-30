import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Tooltip, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import EventModal from './components/modals/EventModal';
import EventMarker from './components/markers/EventMarker';
import EventHandler from './components/map/EventHandler';
import FilterPanel from './components/filters/FilterPanel';
import CustomPanes from './components/map/CustomPanes';
import { calculateEventRanks } from './utils/eventUtils';
import { generateMockEvents } from './data/mockEvents';
import { Event, EventComment } from './types/Event';

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
const MAX_TOP_EVENTS = 300;
const MIN_PIXEL_DISTANCE = 25;
const DEFAULT_VISIBLE_EVENTS = 300;
const DEBUG_MODE = true;

// Score configuration constants
const SCORE_CONFIG = {
  HOVER_BONUS: 5,
  CLICK_BONUS: 10,
  LIKE_BONUS: 25,
  COMMENT_BONUS: 15,
  DECAY_INTERVAL: 10000,
  DECAY_AMOUNT: 3,
  MIN_SCORE: 0,
  RANK_UPDATE_INTERVAL: 60000 // New constant for 1-minute rank updates
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pincode, setPincode] = useState('');

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode === '1994') {
      setAuthenticated(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="pincode-screen">
        <form onSubmit={handlePincodeSubmit} className="pincode-form">
          <h2 style={{ marginBottom: '1rem' }}>Enter Pincode</h2>
          <input
            type="password"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            style={{
              padding: '0.5rem',
              marginBottom: '1rem',
              width: '200px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <br />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Submit
          </button>
        </form>
      </div>
    );
  }

  // Initialize events with ranks based on scores
  const [events, setEvents] = useState<Event[]>(() => {
    const initialEvents = generateMockEvents();
    const initialRanks = calculateEventRanks(initialEvents);
    
    return initialEvents.map(event => ({
      ...event,
      rank: initialRanks[event.id]
    }));
  });

  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    severities: [],
    verified: false
  });
  const [activeTimeRange, setActiveTimeRange] = useState(null);
  const [visibleEvents, setVisibleEvents] = useState<Event[]>([]);
  const [hiddenEvents, setHiddenEvents] = useState<Event[]>([]);
  const [topVisibleCount, setTopVisibleCount] = useState(DEFAULT_VISIBLE_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Score management handlers
  const updateEventScore = useCallback((eventId: string, scoreChange: number) => {
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event => 
        event.id === eventId
          ? { ...event, score: Math.max(SCORE_CONFIG.MIN_SCORE, event.score + scoreChange) }
          : event
      );
      
      return updatedEvents;
    });
  }, []);

  // Handle hover start
  const handleEventHover = useCallback((eventId: string) => {
    updateEventScore(eventId, SCORE_CONFIG.HOVER_BONUS);
  }, [updateEventScore]);

  // Handle event click
  const handleEventClick = useCallback((event: Event) => {
    updateEventScore(event.id, SCORE_CONFIG.CLICK_BONUS);
    setSelectedEvent(event);
  }, [updateEventScore]);

  // Modified like handler
  const handleEventLike = useCallback((eventId: string) => {
    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event =>
        event.id === eventId
          ? { ...event, likes: event.likes + 1 }
          : event
      );
      updateEventScore(eventId, SCORE_CONFIG.LIKE_BONUS);
      return updatedEvents;
    });
  }, [updateEventScore]);

  // Modified comment handler
  const handleEventComment = useCallback((eventId: string, commentText: string) => {
    const timestamp = new Date();
    const formattedTime = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')} - ${timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    const newComment: EventComment = {
      text: commentText,
      timestamp: formattedTime
    };

    setEvents(prevEvents => {
      const updatedEvents = prevEvents.map(event =>
        event.id === eventId
          ? { ...event, comments: [...event.comments, newComment] }
          : event
      );
      updateEventScore(eventId, SCORE_CONFIG.COMMENT_BONUS);
      return updatedEvents;
    });
  }, [updateEventScore]);

  // Score decay effect - now only updates scores, not ranks
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setEvents(prevEvents => {
        const updatedEvents = prevEvents.map(event => ({
          ...event,
          score: Math.max(SCORE_CONFIG.MIN_SCORE, event.score - SCORE_CONFIG.DECAY_AMOUNT)
        }));
        
        return updatedEvents;
      });
    }, SCORE_CONFIG.DECAY_INTERVAL);

    return () => clearInterval(decayInterval);
  }, []);

  // New separate effect for rank updates every minute
  useEffect(() => {
    const rankUpdateInterval = setInterval(() => {
      setEvents(prevEvents => {
        const updatedRanks = calculateEventRanks(prevEvents);
        
        return prevEvents.map(event => ({
          ...event,
          rank: updatedRanks[event.id]
        }));
      });
    }, SCORE_CONFIG.RANK_UPDATE_INTERVAL);

    return () => clearInterval(rankUpdateInterval);
  }, []);

  // Memoize filter change handler
  const handleFilterChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  // Memoize time range change handler
  const handleTimeRangeChange = useCallback((newTimeRange) => {
    setActiveTimeRange(newTimeRange);
  }, []);

  // Memoize top visible count change handler
  const handleTopVisibleCountChange = useCallback((newCount) => {
    setTopVisibleCount(newCount);
  }, []);

  // Memoize event selection handler
  const handleEventSelect = useCallback((event: Event) => {
    setSelectedEvent(event);
  }, []);

  // Memoize event deselection handler
  const handleEventDeselect = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Time range filter
      if (activeTimeRange) {
        const eventDate = new Date(event.timestamp);
        if (eventDate < activeTimeRange.start || eventDate > activeTimeRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [events, activeTimeRange]);

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
          onTimeRangeChange={handleTimeRangeChange}
          topVisibleCount={topVisibleCount}
          onTopVisibleCountChange={handleTopVisibleCountChange}
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
            <EventHandler 
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
                onClick={handleEventClick}
                onHoverStart={() => handleEventHover(event.id)}
              />
            ))}
            {visibleEvents.map(event => (
              <EventMarker 
                key={event.id}
                event={event}
                onClick={handleEventClick}
                onHoverStart={() => handleEventHover(event.id)}
              />
            ))}
          </MapContainer>
        </div>
      </div>
      {selectedEvent && (
        <EventModal 
          event={selectedEvent}
          onClose={handleEventDeselect}
          onLike={() => handleEventLike(selectedEvent.id)}
          onComment={(text) => handleEventComment(selectedEvent.id, text)}
        />
      )}
    </div>
  );
}

export default App; 