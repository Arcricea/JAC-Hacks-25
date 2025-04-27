// Global application configuration

export const API_URL = 'http://localhost:5000/api';

// Environment-specific configuration
export const isProduction = process.env.NODE_ENV === 'production';

// API timeout settings
export const API_TIMEOUT = 30000; // 30 seconds 