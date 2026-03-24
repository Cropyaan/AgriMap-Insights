import React, { useState } from 'react';
import axios from 'axios';
import AgriMap from './components/AgriMap';
import InfoPanel from './components/InfoPanel';
import SearchBar from './components/SearchBar';

function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLocationSelect = async (lat, lng) => {
    setSelectedLocation({ lat, lng });
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`http://localhost:8000/api/location`, {
        params: { lat, lng }
      });
      setLocationData(response.data);
    } catch (err) {
      console.error("Error fetching location data:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to fetch location data. Please ensure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResult = (result) => {
    const { lat, lng } = result;
    handleLocationSelect(lat, lng);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-brand">
          <h1>🌱 AgriMap India</h1>
        </div>
        <div className="header-search">
          <SearchBar onSearchResult={handleSearchResult} />
        </div>
      </header>
      <main className="main-container">
        <InfoPanel 
          data={locationData} 
          loading={loading} 
          error={error} 
          selectedLocation={selectedLocation} 
        />
        <AgriMap 
          selectedLocation={selectedLocation} 
          onLocationSelect={handleLocationSelect} 
        />
      </main>
    </>
  );
}

export default App;
