// API Configuration for different environments
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'; // Changed backend port from 5000 to 5001 for local setup

export const config = {
  apiBaseUrl: API_URL,
  timeout: 10000, // 10 seconds
};

export default config;
