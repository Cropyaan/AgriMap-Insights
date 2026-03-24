import React from 'react';
import { MapPin, Cloud, Droplets, Thermometer, Sprout, TrendingUp, Layers } from 'lucide-react';

const InfoPanel = ({ data, loading, isWaking, error, selectedLocation }) => {
  if (loading) {
    return (
      <div className="info-sidebar">
        <div className="loader-container">
          <div className="spinner"></div>
          <p>{isWaking ? "Waking server... this may take a moment." : "Analyzing location..."}</p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="info-sidebar">
        <div className="empty-state">
          <p style={{ color: '#d32f2f' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="info-sidebar">
        <div className="empty-state">
          <MapPin size={48} />
          <h3>Welcome to AgriMap India</h3>
          <p>Click anywhere on the map to get soil insights, weather forecasts, and AI-powered crop recommendations.</p>
        </div>
      </div>
    );
  }

  const { soil, weather, recommended_crops, profitable_crops } = data;

  return (
    <div className="info-sidebar">
      <div className="location-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={24} color="var(--primary-color)" />
          Location Insights
        </h2>
        {selectedLocation && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
          </p>
        )}
      </div>

      <div className="info-card soil">
        <div className="card-header">
          <Layers />
          <span>Soil Analysis</span>
        </div>
        <div className="soil-value">{soil}</div>
      </div>

      <div className="info-card weather">
        <div className="card-header">
          <Cloud />
          <span>Current Weather</span>
        </div>
        <div className="weather-grid">
          <div className="weather-item">
            <Thermometer size={16} color="var(--text-secondary)" />
            <span className="weather-label">Temp</span>
            <span className="weather-value">{weather.temperature}°C</span>
          </div>
          <div className="weather-item">
            <Droplets size={16} color="var(--text-secondary)" />
            <span className="weather-label">Humidity</span>
            <span className="weather-value">{weather.humidity}%</span>
          </div>
          <div className="weather-item">
            <Cloud size={16} color="var(--text-secondary)" />
            <span className="weather-label">Rainfall</span>
            <span className="weather-value">{weather.rainfall}mm</span>
          </div>
        </div>
      </div>

      <div className="info-card crops">
        <div className="card-header">
          <Sprout />
          <span>Recommended Crops</span>
        </div>
        <div className="pill-container">
          {recommended_crops.map(crop => (
            <span key={crop} className="pill">{crop}</span>
          ))}
        </div>
      </div>

      <div className="info-card crops" style={{ borderTopColor: '#f57f17' }}>
        <div className="card-header" style={{ color: '#f57f17' }}>
          <TrendingUp />
          <span>Most Profitable</span>
        </div>
        <div className="pill-container">
          {profitable_crops.map(crop => (
            <span key={crop} className="pill profitable">{crop}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
