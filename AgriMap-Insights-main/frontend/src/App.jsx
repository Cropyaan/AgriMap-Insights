import React, { useState, useEffect } from 'react';
import apiService from './services/api';
import AgriMap from './components/AgriMap';
import InfoPanel from './components/InfoPanel';
import SearchBar from './components/SearchBar';


function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [error, setError] = useState(null);


  const handleLocationSelect = async (lat, lng) => {
    setSelectedLocation({ lat, lng });
    setLoading(true);
    setError(null);
    setIsWaking(false);

    // Timer for "Waking server..." message (Render cold start)
    const wakeupTimer = setTimeout(() => {
      setIsWaking(true);
    }, 2000);

    try {
      const data = await apiService.getLocationDetails(lat, lng);
      setLocationData(data);
    } catch (err) {
      console.error("Error fetching location data:", err);
      setError(err.userMessage || "Failed to fetch location data. Please try again.");
    } finally {
      clearTimeout(wakeupTimer);
      setLoading(false);
      setIsWaking(false);
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
          isWaking={isWaking}
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
