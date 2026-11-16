const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Ensure local uploads directory exists for fallback storage
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

/**
 * Upload an image buffer directly to Cloudinary (with automatic local disk fallback if Cloudinary credentials lack write permissions)
 * @param {Buffer} fileBuffer - Image buffer from Multer memoryStorage
 * @param {Object} options - Optional upload settings (folder, public_id, originalName)
 * @returns {Promise<{ url: string, publicId: string, source: 'cloudinary' | 'local' }>}
 */
const uploadImageBuffer = (fileBuffer, options = {}) => {
  return new Promise((resolve) => {
    const uploadOptions = {
      folder: options.folder || env.cloudinary.folder || 'stock',
      resource_type: 'image',
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (!error && result) {
        console.log(`[CLOUDINARY] Uploaded successfully: ${result.secure_url} (publicId: ${result.public_id})`);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          source: 'cloudinary',
        });
      }

      // If Cloudinary returned 403 (missing permissions) or network error, fallback to local storage
      console.warn(`[CLOUDINARY WARNING] Cloudinary upload returned error (${error?.message || 'unknown'}). Saving locally to /uploads...`);
      const extension = options.originalName ? path.extname(options.originalName) : '.png';
      const filename = `prod-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}${extension}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, fileBuffer);
      const localUrl = `/uploads/${filename}`;

      resolve({
        url: localUrl,
        publicId: `local:${filename}`,
        source: 'local',
      });
    });

    stream.end(fileBuffer);
  });
};

/**
 * Delete an image asset from Cloudinary or local disk
 * @param {string} publicId - Cloudinary publicId (e.g. "stock/xyz") or "local:filename.png"
 * @returns {Promise<any>}
 */
const deleteImage = async (publicId) => {
  if (!publicId) return null;

  // 1. If stored locally in uploads folder
  if (publicId.startsWith('local:')) {
    const filename = publicId.replace('local:', '');
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[LOCAL STORAGE] Deleted local image: ${filename}`);
      } catch (err) {
        console.error(`[LOCAL STORAGE] Failed to delete local image ${filename}:`, err.message);
      }
    }
    return { result: 'ok', source: 'local' };
  }

  // 2. If stored in Cloudinary
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`[CLOUDINARY] Image deleted from Cloudinary: ${publicId}`, result);
    return result;
  } catch (error) {
    console.error(`[CLOUDINARY ERROR] Failed to delete Cloudinary image ${publicId}:`, error.message);
    return null;
  }
};

/**
 * Extract Cloudinary public_id from a secure URL
 * Example: https://res.cloudinary.com/ds7w2aznz/image/upload/v12345/stock/item.jpg -> stock/item
 */
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  if (url.startsWith('/uploads/')) {
    return `local:${url.replace('/uploads/', '')}`;
  }

  if (!url.includes('cloudinary.com')) return null;

  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    let publicIdParts = parts.slice(uploadIndex + 1);
    if (publicIdParts[0] && publicIdParts[0].startsWith('v')) {
      publicIdParts = publicIdParts.slice(1);
    }
    const filenameWithExt = publicIdParts.join('/');
    const dotIndex = filenameWithExt.lastIndexOf('.');
    return dotIndex !== -1 ? filenameWithExt.substring(0, dotIndex) : filenameWithExt;
  } catch (err) {
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadImageBuffer,
  deleteImage,
  extractPublicIdFromUrl,
};
