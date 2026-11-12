const productionOrigins = [
  'https://map-analytics-frontend-btb1.vercel.app',
  'https://map-analytics-frontend-sooty.vercel.app'
];

export function allowedFrontendOrigins(configuredOrigins = '') {
  return new Set([
    ...productionOrigins,
    'http://localhost:3000',
    'http://localhost:5173',
    ...configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  ]);
}

export function createCorsOptions(configuredOrigins) {
  const allowed = allowedFrontendOrigins(configuredOrigins);
  return {
    origin(origin, callback) {
      // Requests without Origin are server-to-server and do not need CORS headers.
      callback(null, origin && allowed.has(origin) ? origin : false);
    }
  };
}
