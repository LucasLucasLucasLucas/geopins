// Constants for event generation
export const categories = ['environment', 'politics', 'economy', 'technology'];
export const severities = ['low', 'medium', 'high'];
export const sources = ['Global News', 'Tech Review', 'Economic Times', 'Environmental Watch', 'Political Observer'];

// Major urban centers for event clustering
export const URBAN_CENTERS = {
  global: [
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 51.5074, lng: -0.1278, name: "London" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo" },
    { lat: 22.3193, lng: 114.1694, name: "Hong Kong" },
    { lat: 1.3521, lng: 103.8198, name: "Singapore" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney" },
    { lat: 48.8566, lng: 2.3522, name: "Paris" },
    { lat: 55.7558, lng: 37.6173, name: "Moscow" },
    { lat: 23.1291, lng: 113.2644, name: "Guangzhou" },
    { lat: -23.5505, lng: -46.6333, name: "Sao Paulo" }
  ],
  africa: [
    { lat: -1.2921, lng: 36.8219, name: "Nairobi" },
    { lat: 30.0444, lng: 31.2357, name: "Cairo" },
    { lat: 6.5244, lng: 3.3792, name: "Lagos" },
    { lat: -26.2041, lng: 28.0473, name: "Johannesburg" },
    { lat: 33.9715, lng: -6.8498, name: "Rabat" },
    { lat: 14.6937, lng: -17.4441, name: "Dakar" },
    { lat: 5.3396, lng: -4.0267, name: "Abidjan" },
    { lat: 9.0765, lng: 7.3986, name: "Abuja" },
    { lat: 12.6392, lng: -8.0029, name: "Bamako" },
    { lat: -3.3822, lng: 29.3644, name: "Bujumbura" }
  ],
  eurasia: [
    { lat: 55.7558, lng: 37.6173, name: "Moscow" },
    { lat: 39.9042, lng: 116.4074, name: "Beijing" },
    { lat: 28.6139, lng: 77.2090, name: "Delhi" },
    { lat: 41.0082, lng: 28.9784, name: "Istanbul" },
    { lat: 52.5200, lng: 13.4050, name: "Berlin" },
    { lat: 55.9533, lng: -3.1883, name: "Edinburgh" },
    { lat: 59.9139, lng: 10.7522, name: "Oslo" },
    { lat: 41.9028, lng: 12.4964, name: "Rome" },
    { lat: 25.2048, lng: 55.2708, name: "Dubai" },
    { lat: 43.2220, lng: 76.8512, name: "Almaty" },
    { lat: 34.0522, lng: -118.2437, name: "Riyadh" },
    { lat: 31.5497, lng: 74.3436, name: "Lahore" },
    { lat: 35.6892, lng: 51.3890, name: "Tehran" },
    { lat: 59.9311, lng: 30.3609, name: "St Petersburg" },
    { lat: 48.2082, lng: 16.3738, name: "Vienna" }
  ],
  northAmerica: [
    { lat: 40.7128, lng: -74.0060, name: "New York" },
    { lat: 34.0522, lng: -118.2437, name: "Los Angeles" },
    { lat: 41.8781, lng: -87.6298, name: "Chicago" },
    { lat: 45.5017, lng: -73.5673, name: "Montreal" },
    { lat: 49.2827, lng: -123.1207, name: "Vancouver" },
    { lat: 19.4326, lng: -99.1332, name: "Mexico City" },
    { lat: 25.7617, lng: -80.1918, name: "Miami" },
    { lat: 29.7604, lng: -95.3698, name: "Houston" },
    { lat: 43.6532, lng: -79.3832, name: "Toronto" },
    { lat: 20.6534, lng: -103.3474, name: "Guadalajara" }
  ]
};

// Base events
export const mockNewsEvents = [
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
  // ... Add all other base events here
];

// Helper functions for event generation
export const generateUniqueRanks = (count, min, max) => {
  const ranks = new Set();
  while (ranks.size < count) {
    ranks.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(ranks);
};

export const getRandomCoordinatesWithRegionalBias = (region) => {
  const centers = URBAN_CENTERS[region];
  if (Math.random() < 0.7) {
    const center = centers[Math.floor(Math.random() * centers.length)];
    const radius = 3 + Math.random() * 7;
    const angle = Math.random() * Math.PI * 2;
    const lat = center.lat + Math.cos(angle) * radius * Math.random();
    const lng = center.lng + Math.sin(angle) * radius * Math.random();
    return [
      Math.max(Math.min(lat, 85), -85),
      ((lng + 180) % 360) - 180
    ];
  } else {
    switch(region) {
      case 'africa':
        return [
          (Math.random() * 35) - 35,
          (Math.random() * 65) - 20
        ];
      case 'eurasia':
        return [
          (Math.random() * 50) + 10,
          (Math.random() * 140) - 10
        ];
      case 'northAmerica':
        return [
          (Math.random() * 50) + 15,
          (Math.random() * 100) - 140
        ];
      default:
        return getRandomCoordinatesWithUrbanBias();
    }
  }
};

// Generate events for a specific region
export const generateRegionalEvents = (count, region) => {
  const newEvents = [];
  const existingRanks = new Set(mockNewsEvents.map(event => event.rank));
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

    let rank;
    do {
      rank = Math.floor(Math.random() * 5000) + mockNewsEvents.length + 1;
    } while (existingRanks.has(rank));
    existingRanks.add(rank);

    const event = {
      id: `${region}-${(i + 1).toString().padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      title: `${region.charAt(0).toUpperCase() + region.slice(1)} Event ${i + 1}`,
      coordinates: getRandomCoordinatesWithRegionalBias(region),
      description: `Generated ${region} event ${i + 1}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      tags: [region, ...categories.slice(0, 2).sort(() => Math.random() - 0.5)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      verified: Math.random() > 0.3,
      rank: rank
    };

    newEvents.push(event);
  }

  return newEvents;
};

// Generate additional events
const additionalAfricanEvents = generateRegionalEvents(500, 'africa');
const additionalEurasianEvents = generateRegionalEvents(2000, 'eurasia');
const additionalNorthAmericanEvents = generateRegionalEvents(500, 'northAmerica');

// Add all new events to mockNewsEvents
mockNewsEvents.push(
  ...additionalAfricanEvents,
  ...additionalEurasianEvents,
  ...additionalNorthAmericanEvents
); 