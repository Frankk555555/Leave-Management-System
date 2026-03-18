// Configuration for API URL
// Set VITE_API_URL in .env file or environment for production deployment

const config = {
  // Reads from .env file: VITE_API_URL=https://your-api.example.com
  // Falls back to localhost for local development
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
};

export default config;
