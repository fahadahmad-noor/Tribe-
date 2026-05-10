import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/components/MapPicker.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 15, { duration: 1 });
  }, [center, zoom]);
  return null;
}

const MapPicker = ({ initialCoords = [0, 0], initialAddress = '', onLocationSelect }) => {
  const [position, setPosition] = useState(
    initialCoords[0] !== 0 || initialCoords[1] !== 0
      ? { lat: initialCoords[1], lng: initialCoords[0] }
      : null
  );
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const debounceRef = useRef(null);

  const defaultCenter = position ? [position.lat, position.lng] : [33.6844, 73.0479]; // Default Islamabad, Pakistan

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
      const data = await res.json();
      const addr = data.address || {};
      const displayName = data.display_name || '';
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const country = addr.country || '';
      return { address: displayName, city, country };
    } catch {
      return { address: '', city: '', country: '' };
    }
  }, []);

  const handleMapClick = useCallback(async (latlng) => {
    setPosition(latlng);
    const geo = await reverseGeocode(latlng.lat, latlng.lng);
    setAddress(geo.address);
    onLocationSelect?.({
      coordinates: [latlng.lng, latlng.lat],
      address: geo.address,
      city: geo.city,
      country: geo.country,
    });
  }, [onLocationSelect, reverseGeocode]);

  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const searchQuery = query.toLowerCase().includes('pakistan') ? query : `${query}, Pakistan`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=pk`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleSearchInput = (val) => {
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 400);
  };

  const selectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const country = addr.country || '';
    setPosition({ lat, lng });
    setAddress(result.display_name);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setFlyTarget({ lat, lng });
    onLocationSelect?.({
      coordinates: [lng, lat],
      address: result.display_name,
      city,
      country,
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setFlyTarget({ lat, lng });
        const geo = await reverseGeocode(lat, lng);
        setAddress(geo.address);
        setSearchQuery(geo.address);
        onLocationSelect?.({
          coordinates: [lng, lat],
          address: geo.address,
          city: geo.city,
          country: geo.country,
        });
      },
      () => alert('Could not get location. Please allow location access.')
    );
  };

  return (
    <div className="map-picker">
      <div className="map-search-container">
        <div className="map-search-row">
          <input
            type="text"
            className="input flex-1"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
          <button type="button" className="btn btn-outline btn-sm" onClick={handleUseMyLocation}>
            📍 My Location
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="map-search-results">
            {searchResults.map((r, i) => (
              <button key={i} type="button" className="map-search-result" onClick={() => selectResult(r)}>
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="map-container" style={{ height: 350, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <MapContainer center={defaultCenter} zoom={position ? 15 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMapClick} />
          {flyTarget && <FlyTo center={[flyTarget.lat, flyTarget.lng]} zoom={15} />}
          {position && <Marker position={[position.lat, position.lng]} />}
        </MapContainer>
      </div>
      {address && <p className="text-sm text-secondary mt-2">📍 {address}</p>}
    </div>
  );
};

export default MapPicker;
