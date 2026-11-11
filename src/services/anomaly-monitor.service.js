export class AnomalyMonitorService {
  async scanTerritorialAnomalies() {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);
    const payload = await response.json(); const national = []; const international = [];
    for (const feature of payload.features || []) {
      const [longitude, latitude, depth] = feature.geometry?.coordinates || []; const magnitude = Number(feature.properties?.mag);
      if (![longitude, latitude, depth].every(Number.isFinite) || !Number.isFinite(magnitude)) continue;
      const inColombia = latitude >= -4.23 && latitude <= 12.46 && longitude >= -79 && longitude <= -66.85;
      const event = { id: feature.id, title: feature.properties.place || 'Ubicación no especificada', description: `Magnitud ${magnitude}. Profundidad ${depth} km.`, latitude, longitude, magnitude, severity: magnitude >= 5 ? 'HIGH' : magnitude >= 3 ? 'MEDIUM' : 'LOW', category: inColombia ? 'Sismo nacional' : 'Sismo internacional', source: 'USGS', sourceUrl: feature.properties.url, timestamp: new Date(feature.properties.time).toISOString() };
      (inColombia ? national : international).push(event);
    }
    return { national, international: international.slice(0, 5), source: 'USGS', fetchedAt: new Date().toISOString() };
  }
}
