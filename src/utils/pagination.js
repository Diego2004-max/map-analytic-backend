export function parsePagination(query = {}) {
  const rawLimit = Number.parseInt(query.limit, 10);
  const rawOffset = Number.parseInt(query.offset, 10);
  return {
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 100,
    offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0
  };
}
