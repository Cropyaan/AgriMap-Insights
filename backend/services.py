import httpx
from cachetools import cached, TTLCache
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup caches
weather_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour
geocode_cache = TTLCache(maxsize=1000, ttl=86400) # 24 hours
soil_cache = TTLCache(maxsize=1000, ttl=21600)    # 6 hours

USER_AGENT = "AgriMapIndia_DataIntegration/1.0"

@cached(cache=geocode_cache)
def geocode(query: str):
    logger.info(f"Geocoding query: {query}")
    is_pincode = query.strip().isdigit() and len(query.strip()) == 6
    params = {
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    if is_pincode:
        params["q"] = f"{query.strip()}, India"
    else:
        params["q"] = query

    try:
        with httpx.Client(headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get("https://nominatim.openstreetmap.org/search", params=params, timeout=10.0)
            resp.raise_for_status()
            
        if len(resp.json()) > 0:
            data = resp.json()[0]
            addr = data.get("address", {})
            return {
                "lat": float(data["lat"]),
                "lng": float(data["lon"]),
                "name": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("state_district") or data.get("name") or query,
                "state": addr.get("state"),
                "district": addr.get("state_district"),
                "country": addr.get("country")
            }
    except Exception as e:
        logger.error(f"Geocoding error: {e}")
    return None

@cached(cache=geocode_cache)
def reverse_geocode(lat: float, lng: float):
    logger.info(f"Reverse Geocoding: {lat}, {lng}")
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
    }
    try:
        with httpx.Client(headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get("https://nominatim.openstreetmap.org/reverse", params=params, timeout=10.0)
            resp.raise_for_status()
            
        addr = resp.json().get("address", {})
        return {
            "state": addr.get("state"),
            "district": addr.get("state_district") or addr.get("county"),
            "name": addr.get("city") or addr.get("town") or addr.get("village"),
            "country": addr.get("country")
        }
    except Exception as e:
        logger.error(f"Reverse Geocoding error: {e}")
    return {}

@cached(cache=weather_cache)
def get_weather(lat: float, lng: float):
    logger.info(f"Fetching Weather: {lat}, {lng}")
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": ["temperature_2m", "relative_humidity_2m", "precipitation"],
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
        "timezone": "Asia/Kolkata"
    }
    try:
        with httpx.Client() as client:
            resp = client.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=10.0)
            resp.raise_for_status()
        
        data = resp.json()
        current = data.get("current", {})
        daily = data.get("daily", {})
        return {
            "temperature": current.get("temperature_2m", 0),
            "humidity": current.get("relative_humidity_2m", 0),
            "rainfall": current.get("precipitation", 0),
            "forecast": [
                {
                    "date": daily.get("time", [])[i],
                    "max_temp": daily.get("temperature_2m_max", [])[i],
                    "min_temp": daily.get("temperature_2m_min", [])[i],
                    "rainfall": daily.get("precipitation_sum", [])[i]
                }
                for i in range(len(daily.get("time", [])))
            ] if "time" in daily else []
        }
    except Exception as e:
        logger.error(f"Weather API error: {e}")
        return {
            "temperature": 32.0,
            "humidity": 50.0,
            "rainfall": 0.0,
            "forecast": []
        }

@cached(cache=soil_cache)
def get_soil_type(lat: float, lng: float, state: str = ""):
    logger.info(f"Fetching Soil data: {lat}, {lng}")
    url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
    params = {
        "lon": lng,
        "lat": lat,
        "property": ["sand", "silt", "clay"],
        "depth": "0-5cm",
        "value": "mean"
    }

    fallback_soil = "Mixed Soil"
    if state:
        s = state.title()
        if s in ["Maharashtra", "Gujarat", "Madhya Pradesh", "Karnataka", "Telangana"]:
            fallback_soil = "Black Soil"
        elif s in ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal", "Assam"]:
            fallback_soil = "Alluvial Soil"
        elif s in ["Rajasthan"]:
            fallback_soil = "Sandy / Desert Soil"
        elif s in ["Kerala", "Goa", "Odisha", "Meghalaya"]:
            fallback_soil = "Laterite Soil"
        elif s in ["Jammu And Kashmir", "Himachal Pradesh", "Uttarakhand", "Ladakh"]:
            fallback_soil = "Mountain Soil"
        elif s in ["Tamil Nadu", "Andhra Pradesh", "Chhattisgarh", "Jharkhand"]:
            fallback_soil = "Red Soil"
        else:
            fallback_soil = "Loamy Soil"

    try:
        with httpx.Client(headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(url, params=params, timeout=10.0)
            resp.raise_for_status()
            
        data = resp.json()
        props = data.get("properties", {}).get("layers", [])
        
        sand = silt = clay = 0.0
        for layer in props:
            name = layer.get("name")
            # Safely handle potential missing attributes in layer structure
            depths = layer.get("depths", [])
            value = 0.0
            if depths and len(depths) > 0:
                val = depths[0].get("values", {}).get("mean", 0)
                if val is not None:
                    try:
                        value = float(val)
                    except ValueError:
                        value = 0.0

            if name == "sand":
                sand = value
            elif name == "silt":
                silt = value
            elif name == "clay":
                clay = value
                
        total = sand + silt + clay
        logger.info(f"Soil raw data -> Sand: {sand}, Silt: {silt}, Clay: {clay}, Total: {total}")

        if total >= 10.0:  # Require a valid threshold of data to classify
            sand_pct = (sand / total) * 100
            silt_pct = (silt / total) * 100
            clay_pct = (clay / total) * 100
            
            logger.info(f"Soil computed percentages -> Sand: {sand_pct:.2f}%, Silt: {silt_pct:.2f}%, Clay: {clay_pct:.2f}%")
            
            if clay_pct > 40:
                return "Clay Soil"
            elif sand_pct > 70:
                return "Sandy Soil"
            elif 30 <= silt_pct <= 60 and clay_pct < 30:
                return "Loamy Soil"
            else:
                return "Mixed Soil"
        else:
            logger.warning(f"SoilGrids total {total} < threshold. Using state fallback.")
            return fallback_soil
    except Exception as e:
        logger.error(f"SoilGrids API error: {e}. Using state fallback.")
        
    return fallback_soil


def get_crop_recommendations(soil_type: str, temp: float, rainfall: float):
    # Crop Rules based on Environment & Soil Texture
    recommended = []
    
    # 1. PRIMARY SOIL TYPES
    if soil_type == "Sandy Soil" or soil_type == "Sandy / Desert Soil":
        if rainfall < 50:
            recommended.extend(["Pearl Millet (Bajra)", "Guar", "Sorghum", "Moth Bean"])
        else:
            recommended.extend(["Watermelon", "Cucumber", "Groundnut"])
            
    elif soil_type == "Clay Soil":
        if rainfall > 100:
            recommended.extend(["Rice", "Sugarcane", "Jute"])
        else:
            recommended.extend(["Soybean", "Black Gram", "Wheat"])
            
    elif soil_type == "Loamy Soil":
        if temp > 25:
            recommended.extend(["Sugarcane", "Cotton", "Vegetables", "Maize"])
        else:
            recommended.extend(["Wheat", "Mustard", "Barley", "Pulses"])
            
    elif soil_type == "Mixed Soil":
        if temp > 30:
            recommended.extend(["Chilli", "Tomato", "Mango", "Millets"])
        elif rainfall > 80:
            recommended.extend(["Pigeon Pea", "Maize", "Spices"])
        else:
            recommended.extend(["Finger Millet (Ragi)", "Pulses", "Tobacco"])

    # 2. SECONDARY / FALLBACK SOIL TYPES
    elif soil_type == "Black Soil":
        if temp > 25:
            recommended.extend(["Cotton", "Soybean", "Sugarcane"])
        else:
            recommended.extend(["Wheat", "Gram", "Linseed"])
            
    elif soil_type == "Alluvial Soil":
        if rainfall > 100:
            recommended.extend(["Rice", "Sugarcane", "Jute"])
        else:
            recommended.extend(["Wheat", "Maize", "Oilseeds", "Tobacco"])
            
    elif soil_type == "Laterite Soil":
        if temp > 25:
            recommended.extend(["Cashew", "Rubber", "Tea", "Coffee"])
        else:
            recommended.extend(["Tapioca", "Spices", "Coconut"])
            
    elif soil_type == "Mountain Soil":
        if temp < 20:
            recommended.extend(["Apple", "Plum", "Saffron", "Walnut"])
        else:
            recommended.extend(["Tea", "Coffee", "Spices", "Maize"])
            
    elif soil_type == "Red Soil":
        if rainfall > 80:
            recommended.extend(["Rice", "Sugarcane", "Cotton"])
        else:
            recommended.extend(["Groundnut", "Millets", "Pulses", "Tobacco"])
            
    else:
        # Failsafe for completely unknown soils
        recommended.extend(["Maize", "Vegetables", "Millets", "Onion"])
        
    # Dynamic Profitability Logic based on Temperature
    profitable = []
    if temp >= 30:
        profitable = ["Chilli", "Tomato", "Mango", "Cotton", "Sugarcane"]
    elif temp >= 20:
        profitable = ["Onion", "Grapes", "Beans", "Sunflower", "Mustard"]
    else:
        profitable = ["Potato", "Peas", "Cabbage", "Cauliflower", "Apples"]

    return {
        "recommended_crops": list(dict.fromkeys(recommended))[:3],
        "profitable_crops": list(dict.fromkeys(profitable))[:3]
    }
