import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

// Fix Leaflet's default icon path
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Sample location data
const newsLocations = [
  {
    name: "Amsterdam Tech Hub",
    position: [52.3676, 4.9041],
    description: "Major European technology investment announcement"
  },
  {
    name: "Tokyo Climate Summit",
    position: [35.6762, 139.6503],
    description: "International climate policy negotiations"
  },
  {
    name: "São Paulo Economic Forum",
    position: [-23.5505, -46.6333],
    description: "South American economic development conference"
  },
  {
    name: "Lake Baikal Conservation",
    position: [53.5587, 108.1650],
    description: "New environmental protection measures at world's deepest lake"
  },
  {
    name: "Kashmir Line of Control",
    position: [34.1526, 74.3152],
    description: "Cross-border dialogue initiatives between India and Pakistan"
  }
];

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Geopins 🌍</h1>
        <p className="subtitle">First live version deployed</p>
      </header>
      <main className="main">
        <div className="map-wrapper">
          <MapContainer
            center={[30, 45]}
            zoom={2}
            scrollWheelZoom={true}
            className="map-container"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {newsLocations.map(location => (
              <Marker 
                key={location.name} 
                position={location.position}
              >
                <Popup>
                  <strong>{location.name}</strong>
                  <br />
                  {location.description}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>
    </div>
  )
}

export default App
