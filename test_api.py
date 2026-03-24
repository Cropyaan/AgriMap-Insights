import requests

print("Testing Ocean (Should fail location validation)")
resp = requests.get("http://127.0.0.1:8000/api/location?lat=0&lng=0")
print(resp.json())

print("\nTesting Rajasthan (Should hit fallback or actual sandy soil)")
resp = requests.get("http://127.0.0.1:8000/api/location?lat=26.9124&lng=75.7873") # Jaipur, Rajasthan
print(resp.json())

print("\nTesting Maharashtra (Should hit fallback or actual black/clay soil)")
resp = requests.get("http://127.0.0.1:8000/api/location?lat=19.0760&lng=72.8777") # Mumbai, Maharashtra
print(resp.json())
