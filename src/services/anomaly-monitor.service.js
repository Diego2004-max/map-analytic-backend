/** Retrieves and classifies live earthquake events from the official USGS feed. */
export class AnomalyMonitorService {
  constructor() {
    this.sourceUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    this.cacheTtlMs = 30_000;
    this.cachedScan = null;
  }

  async scanTerritorialAnomalies() {
    if (this.cachedScan && Date.now() - Date.parse(this.cachedScan.fetchedAt) < this.cacheTtlMs) return this.cachedScan;
    try {
      const response = await fetch(this.sourceUrl, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);
      const payload = await response.json();
      const national = [];
      const international = [];

      for (const feature of payload.features || []) {
        const coordinates = feature.geometry?.coordinates;
        const magnitude = feature.properties?.mag;
        if (!Array.isArray(coordinates) || coordinates.length < 3 || !Number.isFinite(magnitude) || !coordinates.every(Number.isFinite) || !Number.isFinite(feature.properties?.time)) continue;

        const [longitude, latitude, depth] = coordinates;
        const inColombia = latitude >= -4.23 && latitude <= 12.46 && longitude >= -79.0 && longitude <= -66.85;
        const event = {
          id: feature.id,
          title: feature.properties.place || 'Ubicación no especificada',
          description: `Magnitud ${magnitude}. Profundidad ${depth} km.`,
          latitude,
          longitude,
          magnitude,
          severity: magnitude >= 5 ? 'HIGH' : magnitude >= 3 ? 'MEDIUM' : 'LOW',
          category: inColombia ? 'Sismo en Colombia' : 'Sismo internacional',
          source: 'USGS',
          sourceUrl: feature.properties.url,
          timestamp: new Date(feature.properties.time).toISOString()
        };
        if (inColombia) national.push(event);
        else international.push(event);
      }

      national.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
      international.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
      this.cachedScan = { national, international, source: 'USGS', fetchedAt: new Date().toISOString() };
      return this.cachedScan;
    } catch (error) {
      throw new Error(`Unable to retrieve live USGS data: ${error.message}`);
    }
  }

}
