const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return emailPattern.test(email) ? email : null;
}
