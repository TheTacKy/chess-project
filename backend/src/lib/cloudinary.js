import { v2 as cloudinary } from 'cloudinary';

// Note: dotenv is loaded in server.js with 'dotenv/config'
// Environment variables should be available here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Log configuration status (without exposing secrets)
if (process.env.NODE_ENV === 'development') {
  console.log('Cloudinary configured:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗',
    api_key: process.env.CLOUDINARY_API_KEY ? '✓' : '✗',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '✓' : '✗'
  });
}

export default cloudinary;

