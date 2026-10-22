export const formatDistance = (value) => {
  if (value === null || value === undefined || value === '') return 'Distance unavailable';

  const distanceKm = typeof value === 'string'
    ? Number.parseFloat(value)
    : Number(value);

  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 'Distance unavailable';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

export default formatDistance;