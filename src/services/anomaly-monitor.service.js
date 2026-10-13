export class AnomalyMonitorService {
  constructor() {
    this.apiUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
  }

  async scanTerritorialAnomalies() {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      const national = [];
      const global = [];

      for (const feature of data.features || []) {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties;
        const mag = props.mag || 0;

        // Bounding Box aproximado de Colombia
        const isColombia = (lat >= -4.5 && lat <= 13.5) && (lng >= -82.0 && lng <= -66.8);

        const event = {
          title: props.place,
          description: `Magnitud: ${mag} Richter. Profundidad: ${feature.geometry.coordinates[2]} km.`,
          latitude: lat,
          longitude: lng,
          severity: mag >= 5.0 ? 'HIGH' : 'MEDIUM',
          category: isColombia ? 'Sismo Nacional (Colombia)' : 'Sismo Internacional',
          source: 'USGS_LIVE_API',
          timestamp: new Date(props.time)
        };

        if (isColombia) national.push(event);
        else global.push(event);
      }

      if (national.length === 0) {
        national.push({
          title: "Estado Nacional: Sin sismos recientes en Colombia",
          description: "La red sismológica no registra sismos de consideración en el territorio colombiano en este momento.",
          latitude: 4.5708,
          longitude: -74.2973,
          severity: "LOW",
          category: "Vigilancia Colombia",
          source: "RADAR_SECURE",
          timestamp: new Date()
        });
      }

      return [...national, ...global.slice(0, 2)];
    } catch (error) {
      console.error("[Monitor] Error conectando con API externa:", error);
      return [];
    }
  }
}