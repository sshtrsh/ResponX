// Enterprise-grade application constants

// Report submission limits
export const REPORT_CONSTANTS = {
  MAX_IMAGES: 4,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 2000,
  AUTO_SAVE_DEBOUNCE_MS: 1000,
  DRAFT_KEY_PREFIX: '@responx:draft:',
} as const;

// Location settings
export const LOCATION_CONSTANTS = {
  MAX_BARANGAY_DISTANCE_KM: 25,
  SOS_GPS_ACCURACY_METERS: 10,
  NORMAL_GPS_ACCURACY_METERS: 50,
  GEOCODING_TIMEOUT_MS: 10000,
} as const;

// Authentication settings
export const AUTH_CONSTANTS = {
  PASSWORD_MIN_LENGTH: 8,
  SESSION_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

// API and network settings
export const NETWORK_CONSTANTS = {
  REQUEST_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// UI/UX constants
export const UI_CONSTANTS = {
  ANIMATION_DURATION_MS: 300,
  TOAST_DURATION_MS: 3000,
  MODAL_ANIMATION_MS: 250,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'No internet connection. Please check your network and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UPLOAD_FAILED: 'Failed to upload media. Please try again.',
  LOCATION_DENIED: 'Location access denied. Please enable location services.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  REPORT_SUBMITTED: 'Report submitted successfully! Authorities have been notified.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
} as const;

export default {
  REPORT_CONSTANTS,
  LOCATION_CONSTANTS,
  AUTH_CONSTANTS,
  NETWORK_CONSTANTS,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
