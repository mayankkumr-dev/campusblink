// Wrapper for backward compatibility across all components migrating from Cloudinary to S3
export {
  uploadImage,
  uploadPDF,
  deleteFile,
  extractS3Key as extractCloudinaryPublicId,
  extractS3Key,
} from './s3';