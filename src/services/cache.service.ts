// --- START: IN-MEMORY CACHE FOR GET /api/rooms ---
export let cachedRoomsData: any = null;
export let cacheTimestamp: number = 0;
export const CACHE_TTL_MS = 45000; // Cache lifetime: 45 seconds
// --- END: IN-MEMORY CACHE ---

/**
 * Invalidates the in-memory cache for GET /api/rooms.
 * MUST be called after any operation that changes room or booking data.
 */
export function invalidateRoomsCache() {
  console.log('[CACHE INVALIDATION] The rooms cache has been cleared due to a data change.');
  cachedRoomsData = null;
  cacheTimestamp = 0;
}

export function updateRoomsCache(data: any) {
  cachedRoomsData = data;
  cacheTimestamp = Date.now();
}
