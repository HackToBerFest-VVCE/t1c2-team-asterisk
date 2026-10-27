import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  X,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  Compass
} from 'lucide-react';
import { searchWeatherLocations, reverseGeocodeLocation, savePreferredFarmLocation } from '../services/api';

const QUICK_LOCATIONS = [
  { name: 'Hassan', district: 'Hassan', lat: 13.0033, lon: 76.1004 },
  { name: 'Channarayapatna', district: 'Hassan', lat: 12.9064, lon: 76.3888 },
  { name: 'Alur', district: 'Hassan', lat: 12.9842, lon: 75.9864 },
  { name: 'Sakleshpur', district: 'Hassan', lat: 12.9439, lon: 75.7865 },
  { name: 'Arsikere', district: 'Hassan', lat: 13.3148, lon: 76.2570 },
  { name: 'Mysore (Bandipalya)', district: 'Mysore', lat: 12.2858, lon: 76.6698 },
  { name: 'Mandya', district: 'Mandya', lat: 12.5218, lon: 76.8951 },
  { name: 'Bengaluru (Yeshwanthpur)', district: 'Bengaluru Urban', lat: 13.0280, lon: 77.5408 },
  { name: 'Shivamogga', district: 'Shivamogga', lat: 13.9299, lon: 75.5681 },
  { name: 'Kolar', district: 'Kolar', lat: 13.1367, lon: 78.1292 }
];

export default function LocationSearchModal({
  isOpen,
  onClose,
  currentLocation,
  onLocationSelected,
  authToken = null
}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [savingDefault, setSavingDefault] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setGeoError(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchWeatherLocations(query.trim());
        setSearchResults(results);
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Browser Geolocation flow
  const handleDetectGPS = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Browser Geolocation is not supported on this device. Please search manually below.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const resolved = await reverseGeocodeLocation(lat, lon);
          
          const locObj = {
            location_name: resolved.formatted_address || `${resolved.village_town || 'Farm'}, ${resolved.district}`,
            village_town: resolved.village_town,
            district: resolved.district,
            state: resolved.state,
            pincode: resolved.pincode,
            latitude: lat,
            longitude: lon,
            is_gps_detected: true
          };

          if (saveAsDefault) {
            try {
              await savePreferredFarmLocation(locObj, authToken);
            } catch (e) {
              console.warn('Could not save preferred location:', e);
            }
          }

          onLocationSelected(locObj);
          onClose();
        } catch (err) {
          setGeoError('Location coordinates obtained, but could not resolve address. Using coordinates.');
          onLocationSelected({
            location_name: `GPS (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            district: 'Karnataka',
            is_gps_detected: true
          });
          onClose();
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location permission was denied. You can easily search for your village, town, or PIN code below.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('GPS location signal is currently unavailable. Please pick a nearby town.');
            break;
          case error.TIMEOUT:
            setGeoError('Location detection timed out. Please select your town from the list below.');
            break;
          default:
            setGeoError('Unable to detect location. Please use manual search.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectLocation = async (loc) => {
    setSavingDefault(true);
    const locObj = {
      location_name: loc.formatted_address || `${loc.name}, ${loc.district}, ${loc.state}`,
      village_town: loc.village_town || loc.name,
      district: loc.district,
      state: loc.state || 'Karnataka',
      pincode: loc.pincode,
      latitude: loc.latitude || loc.lat,
      longitude: loc.longitude || loc.lon,
      is_gps_detected: false
    };

    if (saveAsDefault) {
      try {
        await savePreferredFarmLocation(locObj, authToken);
      } catch (e) {
        console.warn('Could not save preferred location:', e);
      }
    }

    setSavingDefault(false);
    onLocationSelected(locObj);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(10, 25, 18, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 24px 48px -12px rgba(10, 37, 24, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5EBE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F4F8F5 0%, #FFFFFF 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(27, 94, 60, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1B5E3C'
              }}
            >
              <Compass size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#113826', margin: 0 }}>
                Select Farm Location
              </h3>
              <p style={{ fontSize: 12, color: '#6A7D72', margin: '2px 0 0 0' }}>
                Detect GPS or search village, town, district or PIN code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8A9990',
              padding: 4,
              borderRadius: 6
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Automatic Geolocation Option */}
          <div
            style={{
              padding: '16px',
              borderRadius: 12,
              backgroundColor: '#F0F7F2',
              border: '1px solid #D5E7DC',
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#1B5E3C',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#113826', marginBottom: 2 }}>
                  Detect Field Location via Device GPS
                </div>
                <p style={{ fontSize: 12, color: '#4B6355', lineHeight: 1.45, margin: '0 0 10px 0' }}>
                  Accurate hyper-local weather: rain probabilities, optimal field-plucking hours, and haulage road alerts for your exact farm plot.
                </p>
                <button
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  style={{
                    backgroundColor: '#1B5E3C',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isLocating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(27, 94, 60, 0.25)'
                  }}
                >
                  {isLocating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Requesting Permission...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} />
                      <span>Detect My Location</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Privacy Explanation Note */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#557262',
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed #CDE2D5'
              }}
            >
              <ShieldCheck size={14} color="#1B5E3C" />
              <span>We never track your background movement. Coordinates are only requested upon click.</span>
            </div>
          </div>

          {/* Geo Error Alert */}
          {geoError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 12,
                marginBottom: 16
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{geoError}</span>
            </div>
          )}

          {/* Manual Search Bar */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: '#113826',
                marginBottom: 6
              }}
            >
              Or Search by Village, Town, District or PIN Code
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="#7A8D82"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="e.g. Alur, Channarayapatna, Hassan, 573201..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 16px 11px 40px',
                  borderRadius: 10,
                  border: '1px solid #C8D8CF',
                  fontSize: 14,
                  color: '#113826',
                  outline: 'none',
                  backgroundColor: '#FAFCFA'
                }}
              />
              {isSearching && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  color="#1B5E3C"
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}
                />
              )}
            </div>
          </div>

          {/* Search Autocomplete Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                border: '1px solid #D8E5DD',
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 16,
                maxHeight: 180,
                overflowY: 'auto'
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectLocation(item)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #EFF4F1' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: '#FFFFFF',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F9F6')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={16} color="#1B5E3C" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#113826' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#6A7D72' }}>
                        {item.district ? `${item.district}, ` : ''}{item.state}
                        {item.pincode ? ` • PIN: ${item.pincode}` : ''}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      backgroundColor: '#E8F3ED',
                      color: '#1B5E3C',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontWeight: 600
                    }}
                  >
                    Select
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Production Corridors Chips */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7A8D82', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
              Key Agricultural Mandi Hubs
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_LOCATIONS.map((qLoc) => {
                const isSelected = currentLocation?.district === qLoc.district && currentLocation?.name?.includes(qLoc.name);
                return (
                  <button
                    key={qLoc.name}
                    onClick={() => handleSelectLocation(qLoc)}
                    style={{
                      backgroundColor: isSelected ? '#1B5E3C' : '#F2F6F3',
                      color: isSelected ? '#FFFFFF' : '#2A4D3B',
                      border: '1px solid',
                      borderColor: isSelected ? '#1B5E3C' : '#DDE8E1',
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Building2 size={12} />
                    <span>{qLoc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Persist in profile checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#3B5748',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '8px 0',
              borderTop: '1px solid #EBF1ED'
            }}
          >
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              style={{ accentColor: '#1B5E3C', width: 16, height: 16 }}
            />
            <span>Save as preferred farm location for future visits (no repeated GPS popups)</span>
          </label>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FAFCFA',
            borderTop: '1px solid #EAEFEA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#52665B',
              border: '1px solid #D3DFD8',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
