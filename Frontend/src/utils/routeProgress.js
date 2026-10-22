const EARTH_RADIUS_METERS = 6371000;

export const toCoordinate = (latValue, lngValue) => {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

export const normalizePoint = (point) => {
  if (!point) return null;
  const lat = typeof point.lat === 'function' ? point.lat() : point.lat;
  const lng = typeof point.lng === 'function' ? point.lng() : point.lng;
  return toCoordinate(lat, lng);
};

export const distanceBetweenMeters = (a, b) => {
  const first = normalizePoint(a);
  const second = normalizePoint(b);
  if (!first || !second) return Infinity;

  const lat1 = first.lat * Math.PI / 180;
  const lat2 = second.lat * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLng = (second.lng - first.lng) * Math.PI / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const projectToSegment = (point, start, end) => {
  const latitudeScale = Math.cos(point.lat * Math.PI / 180);
  const toXY = (item) => ({
    x: (item.lng - point.lng) * latitudeScale * 111320,
    y: (item.lat - point.lat) * 110540
  });

  const p = { x: 0, y: 0 };
  const a = toXY(start);
  const b = toXY(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const rawT = lengthSquared === 0
    ? 0
    : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const projected = {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t
  };

  return {
    t,
    projected,
    distanceMeters: distanceBetweenMeters(point, projected)
  };
};

const getRoutePoints = (route) => {
  const steps = route?.legs?.[0]?.steps || [];
  const stepPoints = steps.flatMap(step => Array.isArray(step.path) ? step.path : []);
  const source = stepPoints.length > 1 ? stepPoints : (route?.overview_path || []);
  const points = [];

  source.forEach((point) => {
    const normalized = normalizePoint(point);
    if (!normalized) return;
    const previous = points[points.length - 1];
    if (!previous || distanceBetweenMeters(previous, normalized) > 0.5) {
      points.push(normalized);
    }
  });

  return points;
};

export const buildRouteProgress = ({
  route,
  path,
  distanceText = '',
  distanceValue = 0,
  durationText = '',
  durationValue = 0,
  origin = null,
  destination = null
} = {}) => {
  const points = (path || getRoutePoints(route)).map(normalizePoint).filter(Boolean);
  if (points.length < 2) return null;

  const segmentLengths = [];
  const cumulativeDistances = [0];
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = distanceBetweenMeters(points[index], points[index + 1]);
    segmentLengths.push(length);
    cumulativeDistances.push(cumulativeDistances[index] + length);
  }

  return {
    path: points,
    segmentLengths,
    cumulativeDistances,
    totalDistanceMeters: Number(distanceValue) > 0 ? Number(distanceValue) : cumulativeDistances[cumulativeDistances.length - 1],
    totalDistanceText: distanceText,
    totalDurationSeconds: Number(durationValue) > 0 ? Number(durationValue) : 0,
    totalDurationText: durationText,
    origin: normalizePoint(origin),
    destination: normalizePoint(destination)
  };
};

export const serializeRouteProgress = (routeProgress) => {
  if (!routeProgress?.path?.length) return null;
  return {
    path: routeProgress.path,
    distanceText: routeProgress.totalDistanceText || '',
    distanceValue: routeProgress.totalDistanceMeters || 0,
    durationText: routeProgress.totalDurationText || '',
    durationValue: routeProgress.totalDurationSeconds || 0,
    origin: routeProgress.origin,
    destination: routeProgress.destination,
    timestamp: Date.now()
  };
};

export const hydrateRouteSnapshot = (snapshot) => {
  if (!snapshot?.path || !Array.isArray(snapshot.path) || snapshot.path.length < 2) return null;
  return buildRouteProgress({
    path: snapshot.path,
    distanceText: snapshot.distanceText,
    distanceValue: snapshot.distanceValue,
    durationText: snapshot.durationText,
    durationValue: snapshot.durationValue,
    origin: snapshot.origin,
    destination: snapshot.destination
  });
};

export const matchRouteProgress = (routeProgress, location, previousProgressMeters = 0, accuracyMeters = 50) => {
  if (!routeProgress?.path?.length || !normalizePoint(location)) return null;
  const current = normalizePoint(location);
  const previousIndex = routeProgress.cumulativeDistances.findIndex(value => value >= previousProgressMeters);
  const startIndex = Math.max(0, (previousIndex < 0 ? 0 : previousIndex) - 2);
  const minimumAllowedProgress = Math.max(0, previousProgressMeters - Math.max(accuracyMeters, 20));
  const candidates = [];

  for (let index = startIndex; index < routeProgress.path.length - 1; index += 1) {
    const projection = projectToSegment(current, routeProgress.path[index], routeProgress.path[index + 1]);
    const progressMeters = routeProgress.cumulativeDistances[index] + projection.t * routeProgress.segmentLengths[index];
    if (progressMeters + Math.max(accuracyMeters, 20) < minimumAllowedProgress) continue;
    candidates.push({
      segmentIndex: index,
      progressMeters: Math.max(previousProgressMeters, progressMeters),
      projected: projection.projected,
      distanceToRouteMeters: projection.distanceMeters
    });
  }

  if (!candidates.length) return null;
  return candidates.reduce((best, candidate) => {
    if (!best) return candidate;
    const candidateScore = candidate.distanceToRouteMeters + Math.max(0, previousProgressMeters - candidate.progressMeters) * 3;
    const bestScore = best.distanceToRouteMeters + Math.max(0, previousProgressMeters - best.progressMeters) * 3;
    return candidateScore < bestScore ? candidate : best;
  }, null);
};

export const getRemainingPath = (routeProgress, match) => {
  if (!routeProgress?.path?.length || !match) return routeProgress?.path || [];
  return [
    match.projected,
    ...routeProgress.path.slice(match.segmentIndex + 1)
  ];
};

export const formatDistanceMeters = (meters) => {
  const value = Math.max(0, Number(meters) || 0);
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
};

export const formatRemainingDuration = (routeProgress, remainingMeters) => {
  if (!routeProgress?.totalDurationSeconds || !routeProgress.totalDistanceMeters) {
    return routeProgress?.totalDurationText || '';
  }

  const seconds = Math.max(0, Math.round(
    routeProgress.totalDurationSeconds * (Math.max(0, remainingMeters) / routeProgress.totalDistanceMeters)
  ));
  if (seconds < 60) return '< 1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
};
