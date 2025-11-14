// Defines the structure of a booking object, using string types for datetimes
// to ensure timezone-naive handling throughout the application.
interface Booking {
  id: number;
  room_id: number;
  title: string;
  start_time: string;
  end_time: string;
  comment: string | null;
}

// It is okay to define the interface here for this fix.
interface RoomWithBookingInfo {
  id: number;
  name: string;
  capacity: number;
  status: string;
  location: string | null;
  amenities: string[] | null;
  icon: string | null;
  currentBooking: Booking | null;
  nextBooking: Booking | null;
  allBookingsToday: Booking[];
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