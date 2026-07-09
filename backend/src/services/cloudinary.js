const cloudinary = require('../config/cloudinary');
const { supabaseAdmin } = require('../config/supabase');

const cloudinaryService = {
  // Upload image
  uploadImage: async (file, folder, userId) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `campus-blink/${folder}/${userId}`,
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Failed to upload image: ${error.message}`));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      if (file.stream) {
        file.stream.pipe(uploadStream);
      } else {
        uploadStream.end(file.buffer);
      }
    });
  },

  // Upload PDF
  uploadPDF: async (file, folder, userId) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `campus-blink/${folder}/${userId}`,
          resource_type: 'raw',
          type: 'upload',
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Failed to upload PDF: ${error.message}`));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      if (file.stream) {
        file.stream.pipe(uploadStream);
      } else {
        uploadStream.end(file.buffer);
      }
    });
  },

  // Delete file
  deleteFile: async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  // Generate signed upload URL (for client-side uploads)
  generateSignedUrl: async (folder, userId, timestamp = Math.floor(Date.now() / 1000)) => {
    const uploadPreset = 'campus-blink-unsigned';
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    // For unsigned uploads, this is a simple URL
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      uploadPreset,
      folder: `campus-blink/${folder}/${userId}`,
    };
  },
};

module.exports = cloudinaryService;
