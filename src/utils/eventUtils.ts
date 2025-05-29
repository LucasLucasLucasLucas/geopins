import { Event } from '../types/Event';

// Calculate ranks based on scores
export const calculateEventRanks = (events: Event[]): { [key: string]: number } => {
  // Sort events by score in descending order
  const sortedEvents = [...events].sort((a, b) => b.score - a.score);
  
  // Initialize ranks object
  const ranks: { [key: string]: number } = {};
  
  // Assign ranks (same score = same rank)
  let currentRank = 1;
  let currentScore = sortedEvents[0]?.score;
  
  sortedEvents.forEach((event, index) => {
    if (event.score < currentScore) {
      currentRank = index + 1;
      currentScore = event.score;
    }
    ranks[event.id] = currentRank;
  });
  
  return ranks;
};

// Determine event tier based on rank and viewport
export const determineEventTier = (
  event: Event,
  visibleEvents: Event[],
  bounds: L.LatLngBounds | null = null
): 'top' | 'high' | 'normal' => {
  // Top 5 events by rank are always 'top' tier
  if (event.rank <= 5) {
    return 'top';
  }

  // If bounds are provided, check for top 10 events in viewport
  if (bounds) {
    const viewportEvents = visibleEvents.filter(e => 
      bounds.contains(L.latLng(e.location.lat, e.location.lng))
    );
    
    const topViewportEvents = viewportEvents
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10)
      .map(e => e.id);

    if (topViewportEvents.includes(event.id)) {
      return 'high';
    }
  }

  return 'normal';
}; 