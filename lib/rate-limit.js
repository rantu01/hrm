// Simple in-memory fixed-window rate limiter.
// Suitable for single-instance deployments (e.g. the current Vercel/Hostinger
// single-server setup); swap the Map for a shared store (Upstash/Redis) when
// running multiple instances.

const buckets = new Map();

const MAX_BUCKETS = 5000;

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    buckets.set(key, bucket);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  if (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}
