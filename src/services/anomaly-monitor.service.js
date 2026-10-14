import fetch from 'node-fetch';

export class AnomalyMonitorService {
  async scanAnomalies() {
    try {
      const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
      const data = await response.json();

      if (!data || !data.features) {
        return { success: true, count: 0, anomalies: [] };
      }

      const realAnomalies = data.features.map(quake => {
        const [longitude, latitude, depth] = quake.geometry.coordinates;
        const place = quake.properties.place || 'Ubicación desconocida';
        const mag = quake.properties.mag;
        const time = new Date(quake.properties.time).toISOString();

        const isColombia = latitude >= -4.23 && latitude <= 12.46 && longitude >= -79.0 && longitude <= -66.85;

        return {
          title: `Sismo Real M${mag.toFixed(1)} - ${place}`,
          description: `Magnitud: ${mag.toFixed(1)} Richter. Profundidad: ${depth.toFixed(1)} km. Registrado el ${new Date(quake.properties.time).toLocaleString()}.`,
          latitude,
          longitude,
          category: mag >= 4.5 ? 'Actividad Sísmica Moderada' : 'Micro-sismicidad',
          severity: mag >= 5.0 ? 'Alta' : mag >= 4.0 ? 'Media' : 'Baja',
          timestamp: time,
          isColombia
        };
      });

      const filteredAnomalies = realAnomalies.filter(item => {
        return item.isColombia || item.description.includes('km');
      });

      return {
        success: true,
        count: filteredAnomalies.length,
        anomalies: filteredAnomalies.slice(0, 10)
      };

    } catch (error) {
      console.error("[AnomalyMonitorService] Error al obtener datos reales:", error);
      return { success: false, count: 0, anomalies: [], error: error.message };
    }
  }
}