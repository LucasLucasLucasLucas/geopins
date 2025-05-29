import { Event, EventInput } from '../types/Event';
import { generateUniqueEventId } from '../utils/idGenerator';

// Helper function to generate a random date within the last 30 days
const getRandomRecentDate = (maxDaysAgo = 30) => {
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  date.setMinutes(date.getMinutes() - minutesAgo);
  
  return date.toISOString();
};

// Helper function to generate random articles
const generateArticles = (count: number) => {
  const publishers = [
    'Global News', 'Tech Daily', 'Climate Watch', 'Economic Times',
    'Political Observer', 'Urban Times', 'City Post', 'Metro News'
  ];
  
  return Array.from({ length: count }, () => ({
    publisher: publishers[Math.floor(Math.random() * publishers.length)],
    url: `https://example.com/article/${Math.random().toString(36).substring(7)}`,
    snippet: Math.random() > 0.5 ? `Breaking news: A significant development has occurred in this region...` : undefined
  }));
};

// Helper function to create a single event
const createEvent = (input: EventInput): Event => ({
  id: input.id || generateUniqueEventId('event'),
  title: input.title,
  summary: input.summary,
  timestamp: input.timestamp,
  location: input.location,
  articles: input.articles,
  image: input.image,
  score: input.score || Math.floor(Math.random() * 2000) + 1,
  rank: input.rank || 0, // Will be calculated later
  likes: input.likes || 0,
  comments: input.comments || [],
  tags: input.tags,
  sourceTier: input.sourceTier
});

// Generate initial featured events
export const generateFeaturedEvents = (): Event[] => {
  const featuredEvents: EventInput[] = [
    {
      id: generateUniqueEventId('news'),
      title: "Amsterdam Tech Hub",
      summary: "Major European technology investment announcement",
      timestamp: getRandomRecentDate(),
      location: { lat: 52.3676, lng: 4.9041 },
      articles: generateArticles(3),
      tags: ["investment", "europe", "tech"],
      sourceTier: "international"
    },
    {
      id: generateUniqueEventId('news'),
      title: "Tokyo Climate Summit",
      summary: "International climate policy negotiations",
      timestamp: getRandomRecentDate(),
      location: { lat: 35.6762, lng: 139.6503 },
      articles: generateArticles(2),
      tags: ["climate", "policy", "international"],
      sourceTier: "international"
    },
    // Add more featured events...
  ];

  return featuredEvents.map(event => createEvent(event));
};

// Generate events around urban centers
export const generateUrbanEvents = (count: number): Event[] => {
  const urbanCenters = {
    'North America': [
      { name: 'New York', location: { lat: 40.7128, lng: -74.0060 } },
      { name: 'Los Angeles', location: { lat: 34.0522, lng: -118.2437 } },
      // Add more centers...
    ],
    // Add more regions...
  };

  const events: EventInput[] = [];
  const allCities = Object.values(urbanCenters).flat();

  for (let i = 0; i < count; i++) {
    const city = allCities[i % allCities.length];
    const randomOffset = () => (Math.random() * 2 - 1) * 0.5;
    
    events.push({
      id: generateUniqueEventId('urban'),
      title: `${city.name} Urban Development`,
      summary: `New developments in ${city.name} metropolitan area`,
      timestamp: getRandomRecentDate(),
      location: {
        lat: city.location.lat + randomOffset(),
        lng: city.location.lng + randomOffset()
      },
      articles: generateArticles(Math.floor(Math.random() * 3) + 1),
      tags: [city.name.toLowerCase(), 'urban', 'development'],
      sourceTier: 'local'
    });
  }

  return events.map(event => createEvent(event));
};

// Generate all mock events
export const generateMockEvents = (
  urbanEventCount = 100,
  clusterEventCount = 50
): Event[] => {
  const events = [
    ...generateFeaturedEvents(),
    ...generateUrbanEvents(urbanEventCount)
  ];

  return events;
}; 