/** Retrieves and classifies live earthquake events from the official USGS feed. */
export class AnomalyMonitorService {
  constructor() {
    this.sourceUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
  }

  async scanTerritorialAnomalies() {
    try {
      const response = await fetch(this.sourceUrl, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);
      const payload = await response.json();
      const national = [];
      const nearby = [];

      for (const feature of payload.features || []) {
        const coordinates = feature.geometry?.coordinates;
        const magnitude = Number(feature.properties?.mag);
        if (!Array.isArray(coordinates) || coordinates.length < 3 || !Number.isFinite(magnitude)) continue;

        const [longitude, latitude, depth] = coordinates;
        const inColombia = latitude >= -4.23 && latitude <= 12.46 && longitude >= -79.0 && longitude <= -66.85;
        const distanceToColombiaKm = Math.round(this.distanceInKm(latitude, longitude, 4.57, -74.30));
        const event = {
          id: feature.id,
          title: feature.properties.place || 'Ubicación no especificada',
          description: `Magnitud ${magnitude}. Profundidad ${depth} km.`,
          latitude,
          longitude,
          magnitude,
          severity: magnitude >= 5 ? 'HIGH' : magnitude >= 3 ? 'MEDIUM' : 'LOW',
          category: inColombia ? 'Sismo en Colombia' : 'Sismo cercano a Colombia',
          source: 'USGS',
          sourceUrl: feature.properties.url,
          timestamp: new Date(feature.properties.time).toISOString()
        };
        if (inColombia) national.push(event);
        else if (distanceToColombiaKm <= 900) nearby.push({ ...event, distanceToColombiaKm });
      }

      nearby.sort((left, right) => left.distanceToColombiaKm - right.distanceToColombiaKm);
      return { national, nearby: nearby.slice(0, 10), source: 'USGS', sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php', fetchedAt: new Date().toISOString() };
    } catch (error) {
      throw new Error(`Unable to retrieve live USGS data: ${error.message}`);
    }
  }

  distanceInKm(latitudeA, longitudeA, latitudeB, longitudeB) {
    const radians = (value) => (value * Math.PI) / 180;
    const deltaLatitude = radians(latitudeB - latitudeA);
    const deltaLongitude = radians(longitudeB - longitudeA);
    const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
