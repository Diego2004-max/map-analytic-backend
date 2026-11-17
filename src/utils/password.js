export function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 10 && !/\s/.test(value);
}
