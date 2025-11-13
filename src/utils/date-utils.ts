/**
 * CENTRALIZED DATE UTILITIES FOR TIMEZONE-NAIVE DATETIME HANDLING
 *
 * This file is the SINGLE SOURCE OF TRUTH for all date/time operations in the backend.
 * All date parsing and formatting MUST use these utilities to ensure end-to-end timezone-naivety.
 *
 * CRITICAL RULES:
 * 1. NEVER use `new Date(stringWithSpaces)` directly - use parseTimezoneNaiveDateString() instead
 * 2. NEVER manually format dates - use formatToTimezoneNaiveString() instead
 * 3. The database stores DATETIME as timezone-naive strings (YYYY-MM-DD HH:mm:ss)
 * 4. The database returns DATETIME as strings (thanks to dateStrings: true in db.ts)
 * 5. For comparisons, convert to Date objects using parseTimezoneNaiveDateString()
 * 6. Before sending to frontend, convert back to strings using formatToTimezoneNaiveString()
 */

/**
 * Parses a timezone-naive datetime string into a JavaScript Date object.
 *
 * This function EXPLICITLY interprets the string as local server time,
 * avoiding browser inconsistencies with `new Date("YYYY-MM-DD HH:mm:ss")`.
 *
 * @param dateTimeString - Datetime string in "YYYY-MM-DD HH:mm:ss" format
 * @returns Date object representing the local server time
 *
 * @example
 * parseTimezoneNaiveDateString("2025-11-13 14:30:00")
 * // Returns a Date object for 14:30 local server time on Nov 13, 2025
 */
export function parseTimezoneNaiveDateString(dateTimeString: string | null | undefined): Date | null {
  if (!dateTimeString || typeof dateTimeString !== 'string') {
    return null;
  }

  // Split the datetime string into date and time parts
  const parts = dateTimeString.trim().split(' ');
  if (parts.length !== 2) {
    console.warn(`[date-utils] Invalid datetime format: ${dateTimeString}`);
    return null;
  }

  const [datePart, timePart] = parts;
  const dateComponents = datePart.split('-');
  const timeComponents = timePart.split(':');

  if (dateComponents.length !== 3 || timeComponents.length !== 3) {
    console.warn(`[date-utils] Invalid datetime components: ${dateTimeString}`);
    return null;
  }

  const year = parseInt(dateComponents[0], 10);
  const month = parseInt(dateComponents[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(dateComponents[2], 10);
  const hours = parseInt(timeComponents[0], 10);
  const minutes = parseInt(timeComponents[1], 10);
  const seconds = parseInt(timeComponents[2], 10);

  // Create Date object using individual components (interpreted as local time)
  const date = new Date(year, month, day, hours, minutes, seconds);

  if (isNaN(date.getTime())) {
    console.warn(`[date-utils] Invalid date created from: ${dateTimeString}`);
    return null;
  }

  return date;
}

/**
 * Formats a Date object into a timezone-naive datetime string.
 *
 * This function extracts the local date/time components from the Date object
 * and returns them as a string suitable for database storage.
 *
 * @param date - JavaScript Date object
 * @returns Datetime string in "YYYY-MM-DD HH:mm:ss" format, or empty string if date is null
 *
 * @example
 * const now = new Date(2025, 10, 13, 14, 30, 0); // Nov 13, 2025, 14:30:00
 * formatToTimezoneNaiveString(now)
 * // Returns "2025-11-13 14:30:00"
 */
export function formatToTimezoneNaiveString(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Generates a timezone-naive timestamp string representing the current moment.
 *
 * This is a convenience function that combines Date creation and formatting.
 * Use this for activity logs, audit trails, or any "created_at" timestamps.
 *
 * @returns Current timestamp in "YYYY-MM-DD HH:mm:ss" format
 *
 * @example
 * getCurrentTimezoneNaiveTimestamp()
 * // Returns "2025-11-13 14:30:00" (current server time)
 */
export function getCurrentTimezoneNaiveTimestamp(): string {
  return formatToTimezoneNaiveString(new Date());
}
