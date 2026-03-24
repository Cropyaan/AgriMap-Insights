from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import services

app = FastAPI(title="AgriMap India API")

# Configure CORS for the frontend React application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WeatherForecast(BaseModel):
    date: str
    max_temp: float
    min_temp: float
    rainfall: float

class WeatherInfo(BaseModel):
    temperature: float
    humidity: float
    rainfall: float
    forecast: List[WeatherForecast] = []

class LocationResponse(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    soil: str
    weather: WeatherInfo
    recommended_crops: List[str]
    profitable_crops: List[str]

class SearchResponse(BaseModel):
    lat: float
    lng: float
    name: str
    state: Optional[str] = None
    district: Optional[str] = None
    country: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to AgriMap India API"}

@app.get("/api/search", response_model=SearchResponse)
def search_location(q: str):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = services.geocode(q)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
        
    return result

@app.get("/api/location", response_model=LocationResponse)
def get_location_insights(lat: float, lng: float):
    # 1. Reverse Geocode to get State/District
    location_info = services.reverse_geocode(lat, lng)
    
    country = location_info.get("country")
    if not country or country.lower() != "india":
        raise HTTPException(
            status_code=400, 
            detail="Invalid land location. Please select a valid land region in India."
        )
    
    # 2. Get Real Weather
    weather_data = services.get_weather(lat, lng)
    weather = WeatherInfo(**weather_data)
    
    # 3. Get Soil and Crop logic
    soil_type = services.get_soil_type(lat, lng, location_info.get("state", ""))
    agri_data = services.get_crop_recommendations(soil_type, weather_data["temperature"], weather_data["rainfall"])

    return LocationResponse(
        name=location_info.get("name"),
        state=location_info.get("state"),
        soil=soil_type,
        weather=weather,
        recommended_crops=agri_data["recommended_crops"],
        profitable_crops=agri_data["profitable_crops"]
    )
