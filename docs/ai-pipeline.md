# Map Analytic AI pipeline

## Radar

`AnomalyMonitorService` requests the official USGS GeoJSON feed for the last day, validates coordinates and magnitudes, and separates events inside the Colombia bounding box from international events. The frontend renders the returned events and links each one to its USGS source.

## Community reports

The report endpoint accepts a description, coordinates, and optional image or audio evidence. Audio is sent to the configured Gemini model for transcription. The resulting text and the user description are passed to the classification service, which returns a category, severity, keywords, and actionability. The report and binary evidence are stored together in PostgreSQL.

## Retention and ownership

Reports older than one hour are removed by the scheduled retention service. Authenticated users own reports created during their session; only the owner or an administrator can delete one manually.

## Provider failures

Gemini failures are translated into Spanish client errors. Exhausted credits, invalid credentials, unavailable models, and quota responses are logged with their provider status without exposing secrets.
