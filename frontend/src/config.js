// API Configuration for different environments
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'; // changed to 5001 for testing purpose 

export const config = {
  apiBaseUrl: API_URL,
  timeout: 10000, // 10 seconds
};

export default config;
