const API_BASE = '/api';

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

export async function fetchMandis() {
  const res = await fetch(`${API_BASE}/mandis`);
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

export async function fetchMarketTrends(cropId, varietyId, mandiId, timeframe) {
  const params = new URLSearchParams({
    crop_id: cropId || 'CROP_TOMATO',
    timeframe: timeframe || '3months'
  });
  if (varietyId) params.append('variety_id', varietyId);
  if (mandiId) params.append('mandi_id', mandiId);

  const res = await fetch(`${API_BASE}/market-trends?${params.toString()}`);
  return res.json();
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
  const res = await fetch(`${API_BASE}/weather?latitude=${lat}&longitude=${lon}&location_name=${encodeURIComponent(locationName)}`);
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
