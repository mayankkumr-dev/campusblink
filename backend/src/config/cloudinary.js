const cloudinaryLib = require('cloudinary').v2;

const cloudinary = cloudinaryLib;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Missing Cloudinary environment variables');
} else {
  console.warn('Cloudinary not configured - development mode');
}

module.exports = cloudinary;
