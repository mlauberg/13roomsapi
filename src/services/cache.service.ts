// It is okay to define the interface here for this fix.
interface RoomWithBookingInfo {
  id: number;
  name: string;
  capacity: number;
  status: string;
  location: string | null;
  amenities: string[] | null;
  icon: string | null;
  currentBooking: any | null;
  nextBooking: any | null;
  allBookingsToday: any[];
}

export let cachedRoomsData: RoomWithBookingInfo[] | null = null;
export let cacheTimestamp: number = 0;
export const CACHE_TTL_MS = 45000;

export function invalidateRoomsCache() {
  console.log('[CACHE INVALIDATION] The rooms cache has been cleared due to a data change.');
  cachedRoomsData = null;
  cacheTimestamp = 0;
}

export function updateRoomsCache(data: RoomWithBookingInfo[]) {
  cachedRoomsData = data;
  cacheTimestamp = Date.now();
}