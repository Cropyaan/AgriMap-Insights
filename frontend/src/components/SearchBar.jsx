import React, { useState } from 'react';
import axios from 'axios';
import { Search, X, Loader, Navigation } from 'lucide-react';

const SearchBar = ({ onSearchResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLocationClick = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      setError('');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          onSearchResult({ lat, lng });
          setLoading(false);
        },
        (error) => {
          setError('Location access denied. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`http://localhost:8000/api/search`, {
        params: { q: query }
      });
      onSearchResult(response.data);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Location not found. Try a different name or pincode.');
      } else {
        setError('Search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by village, city, or pincode..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          {query && (
            <button type="button" className="clear-btn" onClick={() => { setQuery(''); setError(''); }}>
              <X size={18} />
            </button>
          )}
          <button type="button" className="location-btn clear-btn" onClick={handleLocationClick} title="Use My Location">
            <Navigation size={18} />
          </button>
        </div>
        <button type="submit" className="search-submit" disabled={loading || !query.trim()}>
          {loading ? <Loader size={18} className="spinner-icon rotate" /> : 'Search'}
        </button>
      </form>
      {error && <div className="search-error">{error}</div>}
    </div>
  );
};

export default SearchBar;
