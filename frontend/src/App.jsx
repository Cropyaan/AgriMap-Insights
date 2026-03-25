import React, { useState, useRef, useEffect } from 'react';
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
  const [isEmbed, setIsEmbed] = useState(false);
  
  const wakingTimer = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === 'true') {
      setIsEmbed(true);
    }
  }, []);

  const handleLocationSelect = async (lat, lng) => {
    setSelectedLocation({ lat, lng });
    setLoading(true);
    setIsWaking(false);
    setError(null);

    // Alert user if server is cold (> 3.5s)
    wakingTimer.current = setTimeout(() => setIsWaking(true), 3500);

    try {
      const response = await apiService.getInsights(lat, lng);
      setLocationData(response.data);
    } catch (err) {
      console.error("Error fetching location data:", err);
      const detail = err.response?.data?.detail || "Failed to fetch agricultural insights. Please retry.";
      setError(detail);
    } finally {
      clearTimeout(wakingTimer.current);
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
      {!isEmbed && (
        <header className="app-header">
          <div className="header-brand">
            <h1>🌱 AgriMap India</h1>
          </div>
          <div className="header-search">
            <SearchBar onSearchResult={handleSearchResult} />
          </div>
        </header>
      )}
      <main className={`main-container ${isEmbed ? 'embed-mode' : ''}`}>
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
