const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchCrops() {
  const res = await fetch(`${API_BASE}/crops`);
  return res.json();
}

export async function fetchVarieties(cropId) {
  const res = await fetch(`${API_BASE}/crops/${cropId}/varieties`);
  return res.json();
}

export async function fetchMandis(includePrices = false) {
  const url = includePrices ? `${API_BASE}/mandis?include_prices=true` : `${API_BASE}/mandis`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchMandisMapData() {
  const res = await fetch(`${API_BASE}/mandis/map-data`);
  if (!res.ok) throw new Error('Failed to fetch mandis map data');
  return res.json();
}

export async function fetchMandiDetails(mandiId) {
  const res = await fetch(`${API_BASE}/mandis/${encodeURIComponent(mandiId)}`);
  if (!res.ok) throw new Error('Failed to fetch mandi details');
  return res.json();
}


export async function fetchMarketComparison(payload) {
  const res = await fetch(`${API_BASE}/market-comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to compare markets');
  }
  return res.json();
}

export async function fetchNetReturnCalculation(payload) {
  const res = await fetch(`${API_BASE}/calculate-net-return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Calculation failed');
  }
  return res.json();
}

export async function fetchMarketTrends(cropId, varietyId, mandiId, compareMandiId, aggregation = 'daily', timeframe = '3months') {
  const params = new URLSearchParams({
    crop_id: cropId || 'CROP_TOMATO',
    aggregation: aggregation || 'daily',
    timeframe: timeframe || '3months'
  });
  if (varietyId) params.append('variety_id', varietyId);
  if (mandiId) params.append('mandi_id', mandiId);
  if (compareMandiId) params.append('compare_mandi_id', compareMandiId);

  const res = await fetch(`${API_BASE}/market-trends?${params.toString()}`);
  return res.json();
}

export async function fetchPriceTrendSignal(cropId, mandiId) {
  const params = new URLSearchParams({
    crop_id: cropId || 'CROP_TOMATO',
    mandi_id: mandiId || 'MND_HASSAN'
  });
  const res = await fetch(`${API_BASE}/market-trends/detect-trend?${params.toString()}`);
  return res.json();
}

export async function fetchDailyPrices(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.mandi_id) params.append('mandi_id', filters.mandi_id);
  if (filters.crop_id) params.append('crop_id', filters.crop_id);
  if (filters.search_query) params.append('search_query', filters.search_query);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.page) params.append('page', filters.page);
  if (filters.page_size) params.append('page_size', filters.page_size);

  const res = await fetch(`${API_BASE}/daily-prices?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load daily prices');
  }
  return res.json();
}

export async function exportDailyPricesCsv(cropId, mandiId) {
  const params = new URLSearchParams();
  if (cropId) params.append('crop_id', cropId);
  if (mandiId) params.append('mandi_id', mandiId);

  const res = await fetch(`${API_BASE}/daily-prices/export-csv?${params.toString()}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Agmarknet_Daily_Prices_${cropId || 'All'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function fetchForecast(payload) {
  const res = await fetch(`${API_BASE}/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Forecasting failed');
  }
  return res.json();
}

export async function fetchWeather(lat = 13.0033, lon = 76.1004, locationName = 'Hassan, Karnataka') {
  const locParam = locationName ? `&location_name=${encodeURIComponent(locationName)}` : '';
  const res = await fetch(`${API_BASE}/weather/current?latitude=${lat}&longitude=${lon}${locParam}`);
  if (!res.ok) throw new Error(`Weather error: ${res.status}`);
  return res.json();
}

export async function fetchCurrentWeather(lat = 13.0033, lon = 76.1004, locationName = '') {
  const locParam = locationName ? `&location_name=${encodeURIComponent(locationName)}` : '';
  const res = await fetch(`${API_BASE}/weather/current?latitude=${lat}&longitude=${lon}${locParam}`);
  if (!res.ok) throw new Error(`Weather error: ${res.status}`);
  return res.json();
}

export async function fetchWeatherForecast(lat = 13.0033, lon = 76.1004, locationName = '', cropName = 'Tomato') {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    crop_name: cropName
  });
  if (locationName) params.append('location_name', locationName);
  const res = await fetch(`${API_BASE}/weather/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Forecast error: ${res.status}`);
  return res.json();
}

export async function searchWeatherLocations(query) {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`${API_BASE}/weather/location-search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  return res.json();
}

export async function reverseGeocodeLocation(lat, lon) {
  const res = await fetch(`${API_BASE}/weather/reverse-geocode?latitude=${lat}&longitude=${lon}`);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  return res.json();
}

export async function fetchPreferredFarmLocation(token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/weather/preferred-location`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function savePreferredFarmLocation(payload, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/weather/preferred-location`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Save location error: ${res.status}`);
  return res.json();
}

export async function fetchWeatherImpact(cropName = 'Tomato', district = 'Hassan', lat = 13.0033, lon = 76.1004) {
  const params = new URLSearchParams({
    crop_name: cropName,
    district: district,
    latitude: lat,
    longitude: lon
  });
  const res = await fetch(`${API_BASE}/weather/impact?${params.toString()}`);
  return res.json();
}

export async function fetchSnowflakeHealth() {
  const res = await fetch(`${API_BASE}/health/snowflake`);
  return res.json();
}

export async function fetchDataSources() {
  const res = await fetch(`${API_BASE}/data/sources`);
  return res.json();
}

export async function fetchDataFreshness() {
  const res = await fetch(`${API_BASE}/data/freshness`);
  return res.json();
}

export async function fetchDataQuality() {
  const res = await fetch(`${API_BASE}/data/quality`);
  return res.json();
}

export async function fetchMarketPrices(filters = {}) {
  const params = new URLSearchParams();
  if (filters.crop_id) params.append('crop_id', filters.crop_id);
  if (filters.mandi_id) params.append('mandi_id', filters.mandi_id);
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.page) params.append('page', filters.page);
  if (filters.page_size) params.append('page_size', filters.page_size);

  const res = await fetch(`${API_BASE}/market/prices?${params.toString()}`);
  return res.json();
}

export async function fetchLatestPrices(cropId, mandiId) {
  const params = new URLSearchParams();
  if (cropId) params.append('crop_id', cropId);
  if (mandiId) params.append('mandi_id', mandiId);
  const res = await fetch(`${API_BASE}/market/prices/latest?${params.toString()}`);
  return res.json();
}

export async function fetchPriceHistory(cropId, mandiId, timeframe = '90days') {
  const params = new URLSearchParams({
    crop_id: cropId || 'CROP_TOMATO',
    mandi_id: mandiId || 'MND_HASSAN',
    timeframe: timeframe
  });
  const res = await fetch(`${API_BASE}/market/prices/history?${params.toString()}`);
  return res.json();
}

export async function fetchArrivals(cropId, mandiId, days = 30) {
  const params = new URLSearchParams({ days });
  if (cropId) params.append('crop_id', cropId);
  if (mandiId) params.append('mandi_id', mandiId);
  const res = await fetch(`${API_BASE}/market/arrivals?${params.toString()}`);
  return res.json();
}

export async function fetchCommodities() {
  const res = await fetch(`${API_BASE}/market/commodities`);
  return res.json();
}

export async function fetchLocations() {
  const res = await fetch(`${API_BASE}/market/locations`);
  return res.json();
}
export async function loginPublic(payload) {
  const res = await fetch(`${API_BASE}/auth/public-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Public login failed');
  }
  return res.json();
}



export async function fetchCurrentSession(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/auth/me`, { headers });
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}

export async function toggleAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/toggle/${alertId}`, { method: 'POST' });
  return res.json();
}

export async function downloadReport(type, payload) {
  const endpoint = type === 'pdf' ? `${API_BASE}/reports/export-pdf` : `${API_BASE}/reports/export-csv`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FarmPrice_Report_${payload.crop_id}.${type}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// User Profile & Settings API
export async function fetchUserProfile(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/profile`, { headers });
  return res.json();
}

export async function updateUserProfile(payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}

export async function uploadProfilePhoto(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/profile-photo`, {
    method: 'POST',
    headers,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload profile photo' }));
    throw new Error(err.detail || 'Failed to upload profile photo');
  }
  return res.json();
}

export async function removeProfilePhoto(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/profile-photo`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to remove profile photo' }));
    throw new Error(err.detail || 'Failed to remove profile photo');
  }
  return res.json();
}

export async function fetchUserPreferences(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/preferences`, { headers });
  return res.json();
}

export async function updateUserPreferences(payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/preferences`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update preferences');
  }
  return res.json();
}

export async function fetchUserNotifications(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/notifications`, { headers });
  return res.json();
}

export async function updateUserNotifications(payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/notifications`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update notifications');
  }
  return res.json();
}

export async function fetchActiveSessions(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/sessions`, { headers });
  return res.json();
}

export async function terminateOtherSessions(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/sessions/terminate-others`, { method: 'POST', headers });
  return res.json();
}

export async function changeUserPassword(payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/change-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Password change failed');
  }
  return res.json();
}

export async function exportUserDataBundle(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/user/export-data`, { headers });
  return res.json();
}

export async function deleteUserAccount(confirmation, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/delete-account`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirmation })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Account deletion failed');
  }
  return res.json();
}

export async function submitUserFeedback(payload, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE}/user/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to submit feedback');
  }
  return res.json();
}

export async function fetchSystemAbout() {
  const res = await fetch(`${API_BASE}/user/system-about`);
  return res.json();
}



// =====================================================================
// ALL-CROPS MANDI PRICES & DYNAMIC AGMARKNET FILTERS
// =====================================================================

export async function fetchMandiPrices(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.market) params.append('market', filters.market);
  if (filters.commodity && filters.commodity !== 'ALL_CROPS' && filters.commodity !== 'All Crops') {
    params.append('commodity', filters.commodity);
  }
  if (filters.variety) params.append('variety', filters.variety);
  if (filters.grade) params.append('grade', filters.grade);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.page) params.append('page', filters.page);
  if (filters.page_size) params.append('page_size', filters.page_size);

  const res = await fetch(`${API_BASE}/mandi-prices?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load Mandi Prices');
  }
  return res.json();
}

export async function fetchDynamicCommodities(state = 'Karnataka', district = '', market = '') {
  const params = new URLSearchParams({ state });
  if (district && district !== 'All Districts') params.append('district', district);
  if (market && market !== 'All Markets') params.append('market', market);

  const res = await fetch(`${API_BASE}/commodities?${params.toString()}`);
  if (!res.ok) return { commodities: [] };
  return res.json();
}

export async function fetchDynamicDistricts(state = 'Karnataka') {
  const params = new URLSearchParams({ state });
  const res = await fetch(`${API_BASE}/districts?${params.toString()}`);
  if (!res.ok) return { districts: [] };
  return res.json();
}

export async function fetchDynamicMarkets(state = 'Karnataka', district = '') {
  const params = new URLSearchParams({ state });
  if (district && district !== 'All Districts') params.append('district', district);

  const res = await fetch(`${API_BASE}/markets?${params.toString()}`);
  if (!res.ok) return { markets: [] };
  return res.json();
}

export async function fetchDynamicVarieties(state = 'Karnataka', commodity = '') {
  const params = new URLSearchParams({ state });
  if (commodity && commodity !== 'All Crops' && commodity !== 'ALL_CROPS') {
    params.append('commodity', commodity);
  }
  const res = await fetch(`${API_BASE}/varieties?${params.toString()}`);
  if (!res.ok) return { varieties: [] };
  return res.json();
}

export async function fetchDynamicGrades(state = 'Karnataka', commodity = '') {
  const params = new URLSearchParams({ state });
  if (commodity && commodity !== 'All Crops' && commodity !== 'ALL_CROPS') {
    params.append('commodity', commodity);
  }
  const res = await fetch(`${API_BASE}/grades?${params.toString()}`);
  if (!res.ok) return { grades: [] };
  return res.json();
}

export async function fetchMandiAnalytics(params = {}) {
  const q = new URLSearchParams();
  if (params.state) q.append('state', params.state);
  if (params.district && params.district !== 'All Districts') q.append('district', params.district);
  if (params.market && params.market !== 'All Markets') q.append('market', params.market);
  if (params.commodity && params.commodity !== 'All Crops' && params.commodity !== 'ALL_CROPS') {
    q.append('commodity', params.commodity);
  }

  const res = await fetch(`${API_BASE}/mandi-prices/analytics?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load Mandi analytics');
  return res.json();
}

export async function triggerAdminMandiPricesSync(payload = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const res = await fetch(`${API_BASE}/mandi-prices/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Mandi prices sync failed');
  }
  return res.json();
}

export async function exportAllCropsMandiPricesCsv(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.district && filters.district !== 'All Districts') params.append('district', filters.district);
  if (filters.market && filters.market !== 'All Markets') params.append('market', filters.market);
  if (filters.commodity && filters.commodity !== 'All Crops' && filters.commodity !== 'ALL_CROPS') {
    params.append('commodity', filters.commodity);
  }

  const res = await fetch(`${API_BASE}/mandi-prices/export-csv?${params.toString()}`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Karnataka_Mandi_Prices_${filters.commodity || 'All_Crops'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// =====================================================================
// CROP RECOMMENDATION & PROFIT PREDICTION ENGINE APIS
// =====================================================================

export async function fetchCropRecommendations(params = {}) {
  const q = new URLSearchParams();
  if (params.district) q.append('district', params.district);
  if (params.latitude != null) q.append('latitude', params.latitude);
  if (params.longitude != null) q.append('longitude', params.longitude);
  if (params.category && params.category !== 'All' && params.category !== 'All Crops') {
    q.append('category', params.category);
  }
  if (params.season && params.season !== 'All' && params.season !== 'All Seasons') {
    q.append('season', params.season);
  }
  if (params.water_availability && params.water_availability !== 'Any') {
    q.append('water_availability', params.water_availability);
  }
  if (params.budget_limit_per_acre) q.append('budget_limit_per_acre', params.budget_limit_per_acre);
  if (params.acres) q.append('acres', params.acres);

  const res = await fetch(`${API_BASE}/recommendations?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load crop recommendations');
  return res.json();
}

export async function fetchCropProfitEstimates(cropName, district = 'Hassan', acres = 1.0, lat = null, lon = null) {
  const q = new URLSearchParams({
    crop_name: cropName,
    district: district,
    acres: acres
  });
  if (lat != null) q.append('latitude', lat);
  if (lon != null) q.append('longitude', lon);

  const res = await fetch(`${API_BASE}/profit-estimates?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load crop profit estimates');
  return res.json();
}

export async function fetchCropSuitability(cropName, district = 'Hassan', lat = null, lon = null) {
  const q = new URLSearchParams({
    crop_name: cropName,
    district: district
  });
  if (lat != null) q.append('latitude', lat);
  if (lon != null) q.append('longitude', lon);

  const res = await fetch(`${API_BASE}/crops/suitability?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load crop suitability');
  return res.json();
}

export async function fetchRecommendationDistricts() {
  const res = await fetch(`${API_BASE}/recommendations/districts`);
  if (!res.ok) throw new Error('Failed to load districts');
  return res.json();
}

export async function fetchCropCategories() {
  const res = await fetch(`${API_BASE}/crops/categories`);
  if (!res.ok) throw new Error('Failed to load crop categories');
  return res.json();
}

export async function fetchRecommendationAuditLogs() {
  const res = await fetch(`${API_BASE}/recommendations/audit-logs`);
  if (!res.ok) throw new Error('Failed to load recommendation audit logs');
  return res.json();
}


export async function fetchStates() {
  const res = await fetch(`${API_BASE}/states`);
  if (!res.ok) return { states: [] };
  return res.json();
}

export async function fetchMarketData(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.market) params.append('market', filters.market);
  if (filters.commodity) params.append('commodity', filters.commodity);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.page_size) params.append('page_size', filters.page_size);

  const res = await fetch(`${API_BASE}/market-data?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load Snowflake market dataset');
  return res.json();
}

export async function fetchSnowflakeRealdata1(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.crop) params.append('crop', filters.crop);
  if (filters.limit) params.append('limit', filters.limit);
  const res = await fetch(`${API_BASE}/realdata1?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load REALDATA1 from Snowflake');
  return res.json();
}

export async function fetchSnowflakeRealdata2(crop = null) {
  const params = new URLSearchParams();
  if (crop) params.append('crop', crop);
  const res = await fetch(`${API_BASE}/realdata2?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load REALDATA2 from Snowflake');
  return res.json();
}

export async function fetchSnowflakeRealdata3(filters = {}) {
  const params = new URLSearchParams();
  if (filters.state) params.append('state', filters.state);
  if (filters.district) params.append('district', filters.district);
  if (filters.market) params.append('market', filters.market);
  if (filters.commodity) params.append('commodity', filters.commodity);
  if (filters.search) params.append('search', filters.search);
  if (filters.page) params.append('page', filters.page);
  if (filters.page_size) params.append('page_size', filters.page_size);

  const res = await fetch(`${API_BASE}/realdata3?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load REALDATA3 from Snowflake');
  return res.json();
}

export async function fetchSnowflakeInventory() {
  const res = await fetch(`${API_BASE}/snowflake/inventory`);
  if (!res.ok) throw new Error('Failed to load Snowflake inventory');
  return res.json();
}

export async function fetchSnowflakeTableData(params = {}) {
  const q = new URLSearchParams();
  if (params.table) q.append('table', params.table);
  if (params.search) q.append('search', params.search);
  if (params.page) q.append('page', params.page);
  if (params.page_size) q.append('page_size', params.page_size);
  if (params.sort_by) q.append('sort_by', params.sort_by);
  if (params.sort_dir) q.append('sort_dir', params.sort_dir);

  const res = await fetch(`${API_BASE}/snowflake/table-data?${q.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to query Snowflake table data');
  }
  return res.json();
}

// =====================================================================
// CROP LOSS & GOVERNMENT INSURANCE GUIDANCE
// =====================================================================

export async function submitCropLossReport(payload) {
  const res = await fetch(`${API_BASE}/insurance/crop-loss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit crop loss report');
  }
  return res.json();
}

export async function fetchCropLossReport(reportId) {
  const res = await fetch(`${API_BASE}/insurance/crop-loss/${encodeURIComponent(reportId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch crop loss report');
  }
  return res.json();
}

export async function fetchCropLossReports(phone = null, userId = null) {
  const params = new URLSearchParams();
  if (phone) params.append('phone', phone);
  if (userId) params.append('user_id', userId);
  const res = await fetch(`${API_BASE}/insurance/crop-loss?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to list crop loss reports');
  return res.json();
}

export async function fetchInsuranceSchemes() {
  const res = await fetch(`${API_BASE}/insurance/schemes`);
  if (!res.ok) throw new Error('Failed to load insurance schemes');
  return res.json();
}

export async function checkInsuranceEligibility(payload) {
  const res = await fetch(`${API_BASE}/insurance/eligibility-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Eligibility evaluation failed');
  }
  return res.json();
}

export async function fetchInsuranceChecklist(schemeId = null, damageType = null) {
  const params = new URLSearchParams();
  if (schemeId) params.append('scheme_id', schemeId);
  if (damageType) params.append('damage_type', damageType);
  const res = await fetch(`${API_BASE}/insurance/checklist?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load checklist');
  return res.json();
}

export async function uploadCropLossAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/insurance/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

// =====================================================================
// COMPLAINT REGISTRATION & TRACKING
// =====================================================================

export async function submitComplaint(payload) {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit complaint');
  }
  return res.json();
}

export async function trackComplaint(complaintId, phone = null, userId = null, isAdmin = false) {
  const params = new URLSearchParams();
  if (phone) params.append('phone', phone);
  if (userId) params.append('user_id', userId);
  if (isAdmin) params.append('is_admin', 'true');
  const res = await fetch(`${API_BASE}/complaints/track/${encodeURIComponent(complaintId)}?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Complaint lookup failed');
  }
  return res.json();
}

export async function fetchMyComplaints(phone = null, userId = null) {
  const params = new URLSearchParams();
  if (phone) params.append('phone', phone);
  if (userId) params.append('user_id', userId);
  const res = await fetch(`${API_BASE}/complaints/my-complaints?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load complaints');
  }
  return res.json();
}

export async function fetchAllComplaintsAdmin(status = null, category = null, search = null) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/complaints/admin/all?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load admin complaints');
  return res.json();
}

export async function updateComplaintStatus(complaintId, payload) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update complaint status');
  }
  return res.json();
}

export async function fetchComplaintCategories() {
  const res = await fetch(`${API_BASE}/complaints/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json();
}

export async function uploadComplaintAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/complaints/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

// =====================================================================
// PROFIT & LOSS CALCULATIONS AND REPORTING
// =====================================================================

export async function calculateProfitLoss(payload) {
  const res = await fetch(`${API_BASE}/profit-loss/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Profit/Loss calculation failed');
  }
  return res.json();
}

export async function fetchProfitLossHistory(userId = null, limit = 50) {
  const params = new URLSearchParams({ limit });
  if (userId) params.append('user_id', userId);
  const res = await fetch(`${API_BASE}/profit-loss/history?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load profit/loss history');
  return res.json();
}

// =====================================================================
// AGRI MARKETPLACE (SNOWFLAKE LIVE SOURCE OF TRUTH)
// =====================================================================

export async function fetchMarketplaceListings(filters = {}) {
  const params = new URLSearchParams();
  if (filters.crop_name) params.append('crop_name', filters.crop_name);
  if (filters.district) params.append('district', filters.district);
  if (filters.status) params.append('status', filters.status);
  if (filters.farmer_id) params.append('farmer_id', filters.farmer_id);
  if (filters.min_price) params.append('min_price', filters.min_price);
  if (filters.max_price) params.append('max_price', filters.max_price);
  if (filters.limit) params.append('limit', filters.limit);

  const res = await fetch(`${API_BASE}/marketplace/listings?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load marketplace listings from Snowflake');
  return res.json();
}

export async function fetchMarketplaceListingDetail(listingId) {
  const res = await fetch(`${API_BASE}/marketplace/listings/${encodeURIComponent(listingId)}`);
  if (!res.ok) throw new Error('Failed to load listing details');
  return res.json();
}

export async function createMarketplaceListing(payload) {
  const res = await fetch(`${API_BASE}/marketplace/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to publish produce listing to Snowflake');
  }
  return res.json();
}

export async function updateMarketplaceListing(listingId, payload, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/marketplace/listings/${encodeURIComponent(listingId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update produce listing in Snowflake');
  }
  return res.json();
}

export async function submitPurchaseEnquiry(listingId, payload) {
  const res = await fetch(`${API_BASE}/marketplace/listings/${encodeURIComponent(listingId)}/enquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit purchase enquiry to Snowflake');
  }
  return res.json();
}

export async function fetchPurchaseEnquiries(filters = {}) {
  const params = new URLSearchParams();
  if (filters.buyer_id) params.append('buyer_id', filters.buyer_id);
  if (filters.farmer_id) params.append('farmer_id', filters.farmer_id);
  if (filters.listing_id) params.append('listing_id', filters.listing_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);

  const res = await fetch(`${API_BASE}/marketplace/enquiries?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load purchase enquiries');
  return res.json();
}

export async function updatePurchaseEnquiryStatus(enquiryId, payload, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/marketplace/enquiries/${encodeURIComponent(enquiryId)}/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update enquiry status in Snowflake');
  }
  return res.json();
}

export async function fetchMarketplaceProfiles(role = null, district = null) {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (district) params.append('district', district);

  const res = await fetch(`${API_BASE}/marketplace/profiles?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load marketplace profiles');
  return res.json();
}





