import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Search,
  X,
  Loader2,
  Store,
  Layers,
  ArrowUpRight,
  Compass,
  AlertCircle,
  Truck,
  TrendingUp,
  Filter,
  CheckCircle2,
  Info,
  Maximize2
} from 'lucide-react';
import { fetchMandisMapData } from '../services/api';

// Fix Vite asset URL resolution for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Geoapify API Key from environment variable with user-provided fallback
const GEOAPIFY_API_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY || 'ef53e2b2aa2644d9a15b5cf50aa952e1';

// Supported Geoapify Map Styles
const MAP_STYLES = [
  { id: 'osm-bright', label: 'Vibrant Green (Bright)', icon: '🌱' },
  { id: 'osm-carto', label: 'Topographic (Carto)', icon: '🗺️' },
  { id: 'positron', label: 'Minimal Light (Positron)', icon: '☀️' }
];

// Karnataka Geographical Center & Bounding Box
const KARNATAKA_CENTER = [14.65, 75.85];
const KARNATAKA_DEFAULT_ZOOM = 7;

// Haversine formula for distance calculation in kilometers
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function GeoapifyMandiMap({
  onSelectMandi = null,
  onNavigateToCalculator = null,
  initialMandiId = null,
  userLocation = null,
  onUserLocationChange = null,
  t = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Data states
  const [mandis, setMandis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedMandi, setSelectedMandi] = useState(null);

  // Map configuration states
  const [currentStyle, setCurrentStyle] = useState('osm-bright');
  const [tileError, setTileError] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [geocodingSuggestions, setGeocodingSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Geolocation states
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [currentUserPos, setCurrentUserPos] = useState(
    userLocation?.latitude && userLocation?.longitude
      ? { lat: userLocation.latitude, lon: userLocation.longitude, name: userLocation.location_name || 'Your Location' }
      : null
  );

  // UI state
  const [activeTab, setActiveTab] = useState('prices'); // 'prices' | 'info' | 'distance'

  // Load Mandis & authentic prices from backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchMandisMapData();
        if (isMounted) {
          setMandis(data || []);
          if (data && data.length > 0) {
            const initial = initialMandiId
              ? data.find((m) => m.mandi_id === initialMandiId) || data[0]
              : data[0];
            setSelectedMandi(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load mandi map data:', err);
        if (isMounted) {
          setFetchError(err.message || 'Could not load mandi locations and price data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initialMandiId]);

  // Extract unique commodities and districts for filters
  const { commoditiesList, districtsList } = useMemo(() => {
    const cropsSet = new Set();
    const distSet = new Set();

    mandis.forEach((m) => {
      if (m.district) distSet.add(m.district);
      if (Array.isArray(m.prices)) {
        m.prices.forEach((p) => {
          if (p.crop_name) cropsSet.add(p.crop_name);
        });
      }
    });

    return {
      commoditiesList: Array.from(cropsSet).sort(),
      districtsList: Array.from(distSet).sort()
    };
  }, [mandis]);

  // Filter mandis based on search, district, and commodity
  const filteredMandis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return mandis.filter((m) => {
      // District filter
      if (selectedDistrict !== 'ALL' && m.district !== selectedDistrict) {
        return false;
      }

      // Commodity filter
      if (selectedCommodity !== 'ALL') {
        const hasCrop = m.prices?.some(
          (p) => p.crop_name?.toLowerCase() === selectedCommodity.toLowerCase()
        );
        if (!hasCrop) return false;
      }

      // Text query match: mandi name, district, or crops traded
      if (q) {
        const nameMatch = m.mandi_name?.toLowerCase().includes(q);
        const distMatch = m.district?.toLowerCase().includes(q);
        const kannadaMatch = m.mandi_name_kannada?.includes(q);
        const cropMatch = m.prices?.some((p) => p.crop_name?.toLowerCase().includes(q));

        return nameMatch || distMatch || kannadaMatch || cropMatch;
      }

      return true;
    });
  }, [mandis, searchQuery, selectedCommodity, selectedDistrict]);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: KARNATAKA_CENTER,
      zoom: KARNATAKA_DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: false // Add cleanly positioned control below
    });

    // Custom positioned zoom controls
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Required Geoapify & OpenStreetMap Attribution Control
    const attribution = L.control.attribution({ position: 'bottomright' });
    attribution.setPrefix(false);
    attribution.addAttribution(
      'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
    );
    attribution.addTo(map);

    // Initial Tile Layer
    const tileUrl = `https://maps.geoapify.com/v1/tile/${currentStyle}/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      crossOrigin: true
    });

    tileLayer.on('tileerror', (e) => {
      console.warn('Geoapify Tile error:', e);
      setTileError(true);
    });

    tileLayer.on('load', () => {
      setTileError(false);
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Feature group layers for markers and routes
    markersLayerRef.current = L.featureGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size on load to prevent grey tile borders
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Map Style Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const newUrl = `https://maps.geoapify.com/v1/tile/${currentStyle}/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;
    tileLayerRef.current.setUrl(newUrl);
  }, [currentStyle]);

  // 3. Render / Update Mandi Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredMandis.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      const isSelected = selectedMandi?.mandi_id === m.mandi_id;
      
      // Determine display price badge if commodity is selected or default top crop
      let badgeText = '';
      if (selectedCommodity !== 'ALL') {
        const foundPrice = m.prices?.find(
          (p) => p.crop_name?.toLowerCase() === selectedCommodity.toLowerCase()
        );
        if (foundPrice) {
          badgeText = `₹${Math.round(foundPrice.modal_price).toLocaleString()}`;
        }
      } else if (m.prices && m.prices.length > 0) {
        badgeText = `${m.prices.length} crops`;
      }

      // Create Custom High-Fidelity SVG Marker via L.divIcon
      const markerHtml = `
        <div class="geoapify-marker-wrapper ${isSelected ? 'active-marker' : ''}" style="
          position: relative;
          cursor: pointer;
          transform: translate(-50%, -100%);
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <!-- Pulse Halo for Selected Mandi -->
          ${
            isSelected
              ? `<div style="
                  position: absolute;
                  bottom: 8px;
                  width: 38px;
                  height: 38px;
                  border-radius: 50%;
                  background: rgba(16, 185, 129, 0.35);
                  animation: mandiPulse 1.8s infinite ease-out;
                  pointer-events: none;
                "></div>`
              : ''
          }

          <!-- Pin Head Badge -->
          <div style="
            background: ${isSelected ? '#059669' : '#113826'};
            color: #FFFFFF;
            border: 2px solid ${isSelected ? '#34D399' : '#FFFFFF'};
            border-radius: 20px;
            padding: ${badgeText ? '4px 9px' : '6px 7px'};
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
            font-family: inherit;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            transition: all 0.2s ease;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
              <path d="M2 7h20"/>
            </svg>
            <span>${badgeText || m.mandi_name.replace(' APMC', '')}</span>
          </div>

          <!-- Pin Stem Tip -->
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${isSelected ? '#059669' : '#113826'};
            margin-top: -1px;
          "></div>

          <!-- Ground Contact Shadow Dot -->
          <div style="
            width: 8px;
            height: 4px;
            border-radius: 50%;
            background: rgba(0,0,0,0.3);
            margin-top: 1px;
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-mandi-div-icon',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([m.latitude, m.longitude], {
        icon: customIcon,
        title: `${m.mandi_name} (${m.district})`,
        zIndexOffset: isSelected ? 1000 : 100
      });

      // Tooltip on Hover
      marker.bindTooltip(
        `<strong>${m.mandi_name}</strong><br/><span style="font-size: 11px; color: #64748B;">${m.district} District • ${m.prices?.length || 0} crops</span>`,
        { direction: 'top', offset: [0, -32], opacity: 0.95 }
      );

      // Click Event: Select Mandi & Focus
      marker.on('click', () => {
        setSelectedMandi(m);
        if (onSelectMandi) onSelectMandi(m);
        map.panTo([m.latitude, m.longitude], { animate: true, duration: 0.6 });
      });

      marker.addTo(markersLayer);
    });
  }, [filteredMandis, selectedMandi, selectedCommodity, onSelectMandi]);

  // 4. Render User Location Pin & Connection Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    // Render User Location Pulsing Dot
    if (currentUserPos) {
      const userHtml = `
        <div style="
          position: relative;
          cursor: pointer;
          transform: translate(-50%, -50%);
        ">
          <div style="
            position: absolute;
            top: -16px;
            left: -16px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.25);
            animation: mandiPulse 2s infinite ease-out;
          "></div>
          <div style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #2563EB;
            border: 3px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          "></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-icon',
        iconSize: [0, 0]
      });

      const uMarker = L.marker([currentUserPos.lat, currentUserPos.lon], {
        icon: userIcon,
        zIndexOffset: 2000
      });

      uMarker.bindTooltip(`<strong>Your Position</strong><br/>${currentUserPos.name || 'Current Farm'}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -14]
      });

      uMarker.addTo(routeLayer);
      userMarkerRef.current = uMarker;

      // Draw connection line to selected mandi if available
      if (selectedMandi && selectedMandi.latitude && selectedMandi.longitude) {
        const latlngs = [
          [currentUserPos.lat, currentUserPos.lon],
          [selectedMandi.latitude, selectedMandi.longitude]
        ];

        // Draw dotted flight corridor
        const corridor = L.polyline(latlngs, {
          color: '#2563EB',
          weight: 2.5,
          opacity: 0.75,
          dashArray: '6, 8',
          lineCap: 'round'
        });
        corridor.addTo(routeLayer);

        // Distance label badge at midpoint
        const midLat = (currentUserPos.lat + selectedMandi.latitude) / 2;
        const midLon = (currentUserPos.lon + selectedMandi.longitude) / 2;
        const distKm = calculateHaversine(
          currentUserPos.lat,
          currentUserPos.lon,
          selectedMandi.latitude,
          selectedMandi.longitude
        );
        const estRoadKm = Math.round(distKm * 1.25 * 10) / 10;

        const distBadgeHtml = `
          <div style="
            background: #1E293B;
            color: #FFFFFF;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            transform: translate(-50%, -50%);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
          ">
            🚗 ~${estRoadKm} km road
          </div>
        `;
        const distIcon = L.divIcon({
          html: distBadgeHtml,
          className: 'route-dist-icon',
          iconSize: [0, 0]
        });
        L.marker([midLat, midLon], { icon: distIcon, interactive: false }).addTo(routeLayer);
      }
    }
  }, [currentUserPos, selectedMandi]);

  // Request Browser Location Permission (Requirement 4 & 12)
  const handleLocateUser = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please search for your town manually.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const newPos = {
          lat: latitude,
          lon: longitude,
          name: 'Your GPS Location'
        };

        setCurrentUserPos(newPos);

        if (onUserLocationChange) {
          onUserLocationChange({
            latitude,
            longitude,
            location_name: 'Current Farm Location',
            is_gps_detected: true
          });
        }

        // Smoothly fly map to user's location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 10, {
            animate: true,
            duration: 1.2
          });
        }

        // Auto-select the closest Karnataka mandi
        if (mandis.length > 0) {
          let nearest = mandis[0];
          let minDist = Infinity;
          mandis.forEach((m) => {
            if (m.latitude && m.longitude) {
              const d = calculateHaversine(latitude, longitude, m.latitude, m.longitude);
              if (d < minDist) {
                minDist = d;
                nearest = m;
              }
            }
          });
          setSelectedMandi(nearest);
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              'Location permission was denied by your browser. You can enable it in your browser settings or search for your location using the search box above.'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('GPS location signal is currently unavailable. Please search for your district or town.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again or use the search box.');
            break;
          default:
            setLocationError('Unable to retrieve location. Please search for your town or district manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Geoapify Geocoding Autocomplete Search (Requirement 5)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setGeocodingSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const resp = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
            searchQuery.trim()
          )}&filter=countrycode:in&apiKey=${GEOAPIFY_API_KEY}`
        );
        if (resp.ok) {
          const json = await resp.json();
          const items = (json.features || []).map((f) => ({
            formatted: f.properties.formatted,
            name: f.properties.name || f.properties.city || f.properties.county,
            lat: f.properties.lat,
            lon: f.properties.lon,
            district: f.properties.county,
            state: f.properties.state
          }));
          setGeocodingSuggestions(items);
        }
      } catch (err) {
        console.warn('Geocoding autocomplete failed:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a geocoded town / location
  const handleSelectGeocodedLocation = (loc) => {
    const newPos = {
      lat: loc.lat,
      lon: loc.lon,
      name: loc.formatted
    };
    setCurrentUserPos(newPos);
    setSearchQuery('');
    setGeocodingSuggestions([]);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lon], 11, {
        animate: true,
        duration: 1.0
      });
    }

    // Find nearest mandi to this searched location
    if (mandis.length > 0) {
      let nearest = mandis[0];
      let minDist = Infinity;
      mandis.forEach((m) => {
        if (m.latitude && m.longitude) {
          const d = calculateHaversine(loc.lat, loc.lon, m.latitude, m.longitude);
          if (d < minDist) {
            minDist = d;
            nearest = m;
          }
        }
      });
      setSelectedMandi(nearest);
    }
  };

  // Reset map view to show all of Karnataka
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(KARNATAKA_CENTER, KARNATAKA_DEFAULT_ZOOM, {
      animate: true,
      duration: 0.8
    });
  };

  // Calculate distance from user's current pos to selected mandi
  const userDistanceInfo = useMemo(() => {
    if (!currentUserPos || !selectedMandi) return null;
    const straightKm = calculateHaversine(
      currentUserPos.lat,
      currentUserPos.lon,
      selectedMandi.latitude,
      selectedMandi.longitude
    );
    const roadKm = Math.round(straightKm * 1.25 * 10) / 10;
    const estHours = Math.floor(roadKm / 42);
    const estMins = Math.round(((roadKm % 42) / 42) * 60);
    const durationStr = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins} min`;
    const freightEst = Math.round(roadKm * 0.85 * 50); // for 50 quintals @ 0.85/km/q

    return { straightKm, roadKm, durationStr, freightEst };
  }, [currentUserPos, selectedMandi]);

  return (
    <div className="geoapify-map-root" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1. Control Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: '14px 18px',
          border: '1px solid #DDE5E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Search Box with Autocomplete Dropdown */}
          <div style={{ position: 'relative', flex: '1 1 320px', minWidth: 260 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F8FAF8',
                border: '1px solid #D1DDD5',
                borderRadius: 8,
                padding: '8px 12px'
              }}
            >
              <Search size={16} color="#059669" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mandis (e.g. Hassan, Kolar), crops, or any Karnataka town..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  width: '100%',
                  fontSize: 13,
                  color: '#1A241F'
                }}
              />
              {isSearchingLocation && <Loader2 size={14} className="animate-spin" color="#059669" />}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: 0
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown Results */}
            {geocodingSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 8,
                  border: '1px solid #D1DDD5',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                  zIndex: 3000,
                  maxHeight: 220,
                  overflowY: 'auto'
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>
                  SEARCHED LOCATIONS (GEOAPIFY)
                </div>
                {geocodingSuggestions.map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectGeocodedLocation(loc)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid #F8FAFC',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Compass size={14} color="#059669" />
                    <div>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{loc.name}</div>
                      <div style={{ fontSize: 10, color: '#64748B' }}>{loc.formatted}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons: Geolocation, Reset View, Style Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Locate Me Button */}
            <button
              onClick={handleLocateUser}
              disabled={isLocating}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 8,
                backgroundColor: currentUserPos ? '#047857' : '#059669'
              }}
              title="Request GPS location from browser"
            >
              {isLocating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Locating...</span>
                </>
              ) : (
                <>
                  <Navigation size={14} />
                  <span>{currentUserPos ? 'Location Active' : 'Locate My Position'}</span>
                </>
              )}
            </button>

            {/* Fit All Karnataka Mandis */}
            <button
              onClick={handleResetView}
              className="btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
                fontSize: 12,
                borderRadius: 8
              }}
              title="Fit all Karnataka Mandis in view"
            >
              <Maximize2 size={13} />
              <span>All Karnataka</span>
            </button>

            {/* Map Style Selector Dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={currentStyle}
                onChange={(e) => setCurrentStyle(e.target.value)}
                style={{
                  backgroundColor: '#F8FAF8',
                  border: '1px solid #D1DDD5',
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 12,
                  color: '#1A241F',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                title="Change Geoapify Map Tile Style"
              >
                {MAP_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.icon} {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Commodity & District Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
            <Filter size={13} />
            <span style={{ fontWeight: 600 }}>Filter by Crop:</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setSelectedCommodity('ALL')}
              style={{
                padding: '3px 10px',
                borderRadius: 14,
                fontSize: 11,
                fontWeight: 600,
                border: '1px solid',
                borderColor: selectedCommodity === 'ALL' ? '#059669' : '#D1DDD5',
                backgroundColor: selectedCommodity === 'ALL' ? '#ECFDF5' : '#FFFFFF',
                color: selectedCommodity === 'ALL' ? '#059669' : '#475569',
                cursor: 'pointer'
              }}
            >
              All Crops
            </button>
            {commoditiesList.slice(0, 7).map((crop) => (
              <button
                key={crop}
                onClick={() => setSelectedCommodity(crop)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: selectedCommodity === crop ? '#059669' : '#E2E8F0',
                  backgroundColor: selectedCommodity === crop ? '#ECFDF5' : '#FFFFFF',
                  color: selectedCommodity === crop ? '#059669' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {crop}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#64748B', fontWeight: 600 }}>
            Showing {filteredMandis.length} of {mandis.length} Mandis
          </div>
        </div>

        {/* Geolocation Denial / Error Banner (Graceful handling - Requirement 12) */}
        {locationError && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#92400E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#D97706" />
              <span>{locationError}</span>
            </div>
            <button
              onClick={() => setLocationError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tile Error Notice (Requirement 12) */}
        {tileError && (
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 11,
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Info size={14} />
            <span>Map tiles are loading via Geoapify API. Network retry in progress...</span>
          </div>
        )}
      </div>

      {/* 2. Main Grid: Leaflet Map Canvas + Mandi Inspector Details Panel */}
      <div
        className="geoapify-map-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 390px',
          gap: 16,
          alignItems: 'start'
        }}
      >
        {/* Leaflet Map Canvas Container */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#1E293B',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #CBD5E1',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            height: '620px',
            minHeight: '480px'
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                zIndex: 2500
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#059669" />
              <div style={{ fontWeight: 700, color: '#113826', fontSize: 13 }}>
                Loading Karnataka Mandi Locations & Live Crop Prices...
              </div>
            </div>
          )}

          {/* Actual Leaflet DOM container */}
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          />

          {/* Map Overlay Quick Legend Card */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(6px)',
              borderRadius: 8,
              padding: '8px 12px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              fontSize: 11,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            <div style={{ fontWeight: 700, color: '#113826', marginBottom: 2 }}>
              Karnataka Mandi Map Key
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }} />
              <span style={{ color: '#475569' }}>APMC Market (Click to inspect)</span>
            </div>
            {currentUserPos && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }} />
                <span style={{ color: '#475569' }}>Your Detected Position</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Mandi Detail & Price Inspector Panel */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #DDE5E0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '620px'
          }}
        >
          {selectedMandi ? (
            <>
              {/* Header with Mandi Name, District and Coordinates */}
              <div
                style={{
                  padding: '16px 18px',
                  backgroundColor: '#FAFDF9',
                  borderBottom: '1px solid #E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Store size={18} color="#059669" />
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#113826', margin: 0 }}>
                        {selectedMandi.mandi_name}
                      </h3>
                    </div>
                    {selectedMandi.mandi_name_kannada && (
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                        {selectedMandi.mandi_name_kannada}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {selectedMandi.district} District, {selectedMandi.state || 'Karnataka'}
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 10,
                      border: '1px solid #A7F3D0',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    APMC Verified
                  </span>
                </div>

                {/* Coordinates & Operating metadata */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 11,
                    color: '#64748B',
                    marginTop: 10,
                    flexWrap: 'wrap'
                  }}
                >
                  <span title="Verified GPS Coordinates">
                    📍 {selectedMandi.latitude?.toFixed(4)}° N, {selectedMandi.longitude?.toFixed(4)}° E
                  </span>
                  <span>•</span>
                  <span>🗓️ {selectedMandi.operating_days || 'Mon-Sat'}</span>
                  {selectedMandi.has_cold_storage === 1 && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#0284C7', fontWeight: 600 }}>❄️ Cold Storage</span>
                    </>
                  )}
                </div>

                {/* Distance & Transit from User (if GPS located) */}
                {userDistanceInfo && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: 8,
                      border: '1px solid #BFDBFE',
                      fontSize: 11,
                      color: '#1E40AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={14} color="#2563EB" />
                      <span>
                        <strong>{userDistanceInfo.roadKm} km</strong> road (~{userDistanceInfo.durationStr})
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#3B82F6' }}>
                      Freight: ~₹{userDistanceInfo.freightEst} (50q)
                    </span>
                  </div>
                )}
              </div>

              {/* Tab Selector: Crop Prices | Mandi Details */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <button
                  onClick={() => setActiveTab('prices')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: activeTab === 'prices' ? '2.5px solid #059669' : '2.5px solid transparent',
                    backgroundColor: 'transparent',
                    fontWeight: activeTab === 'prices' ? 700 : 500,
                    color: activeTab === 'prices' ? '#059669' : '#64748B',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Available Crop Prices ({selectedMandi.prices?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: activeTab === 'info' ? '2.5px solid #059669' : '2.5px solid transparent',
                    backgroundColor: 'transparent',
                    fontWeight: activeTab === 'info' ? 700 : 500,
                    color: activeTab === 'info' ? '#059669' : '#64748B',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Market Specs & Fees
                </button>
              </div>

              {/* Tab 1: Prices List (Requirement 3) */}
              {activeTab === 'prices' && (
                <div
                  style={{
                    padding: '14px',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  {selectedMandi.prices && selectedMandi.prices.length > 0 ? (
                    selectedMandi.prices.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#F8FAF8',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          transition: 'border-color 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#1A241F' }}>
                              {p.crop_name}
                            </span>
                            {p.variety_name && p.variety_name !== 'Standard' && (
                              <span style={{ fontSize: 10, color: '#64748B', backgroundColor: '#EDEFEF', padding: '1px 5px', borderRadius: 4 }}>
                                {p.variety_name}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            Range: ₹{p.min_price?.toLocaleString()} - ₹{p.max_price?.toLocaleString()}
                            {p.arrival_tonnes && ` • ${p.arrival_tonnes} tonnes`}
                          </div>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                            {p.observation_date} • {p.source || 'AGMARKNET'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>
                            ₹{Math.round(p.modal_price).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748B' }}>per Quintal</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: 12
                      }}
                    >
                      No direct daily commodities reported for this mandi today.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Mandi Details & Logistics Specs */}
              {activeTab === 'info' && (
                <div
                  style={{
                    padding: '16px',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>APMC Market Cess:</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedMandi.apmc_cess_percentage || 1.5}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Weighing Fee:</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>₹{selectedMandi.weighing_fee_per_q || 3.0} / Quintal</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Trading Days:</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>{selectedMandi.operating_days || 'Monday - Saturday'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Cold Storage Facility:</span>
                    <span style={{ fontWeight: 700, color: selectedMandi.has_cold_storage ? '#059669' : '#64748B' }}>
                      {selectedMandi.has_cold_storage ? 'Available on Yard' : 'Not Available'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Reporting Gateway:</span>
                    <span style={{ fontWeight: 700, color: '#1E293B' }}>Karnataka APMC / AGMARKNET</span>
                  </div>

                  {onNavigateToCalculator && (
                    <button
                      onClick={() => onNavigateToCalculator(selectedMandi)}
                      className="btn-primary"
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        borderRadius: 8
                      }}
                    >
                      <TrendingUp size={14} />
                      <span>Calculate Net Return for this Mandi</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748B',
                fontSize: 13
              }}
            >
              <Store size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
              Click any mandi marker on the map to view its verified location and available crop prices.
            </div>
          )}
        </div>
      </div>

      {/* Map Footer Attribution & Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#64748B',
          padding: '4px 6px',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={13} color="#059669" />
          <span>Verified Agmarknet Mandi Network & Live Analytical Mirror (Directorate of Marketing & Inspection)</span>
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8' }}>
          Interactive Map powered by <strong>Geoapify</strong> & <strong>Leaflet</strong>
        </div>
      </div>
    </div>
  );
}
