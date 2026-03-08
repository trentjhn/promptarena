const windows = new Map<string, number[]>();

export function checkRateLimit(
  ip: string,
  limit = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const timestamps = (windows.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  windows.set(ip, timestamps);
  return true;
}
