import React, { useState } from 'react';
import apiService from '../services/api';
import { Search, X, Loader, Navigation } from 'lucide-react';


const SearchBar = ({ onSearchResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounced search logic
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length >= 3) {
        performSearch(query);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.searchLocation(searchQuery);
      onSearchResult(data);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Location not found. Try a different name or pincode.');
      } else {
        setError(err.userMessage || 'Search failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
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
