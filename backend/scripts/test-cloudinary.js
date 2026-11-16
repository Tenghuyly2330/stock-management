const { uploadImageBuffer, deleteImage } = require('../src/config/cloudinary');
const env = require('../src/config/env');

async function testCloudinaryIntegration() {
  console.log('====================================================');
  console.log(' Testing Cloudinary Image Storage & Deletion Engine');
  console.log(` Cloud Name: ${env.cloudinary.cloudName}`);
  console.log(` Target Folder: ${env.cloudinary.folder}`);
  console.log('====================================================');

  try {
    // 1. Create a tiny 1x1 transparent PNG buffer in memory
    const tinyPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    console.log('1. Uploading test image buffer to Cloudinary...');
    const uploadRes = await uploadImageBuffer(tinyPngBuffer, {
      public_id: `test_ping_${Date.now()}`,
    });

    console.log('  Upload Successful!');
    console.log(`   Secure URL: ${uploadRes.url}`);
    console.log(`   Public ID:  ${uploadRes.publicId}`);
    console.log(`   Bytes:      ${uploadRes.bytes}`);

    if (!uploadRes.url || !uploadRes.publicId) {
      throw new Error('Upload did not return expected URL or Public ID');
    }

    // 2. Test Deletion from Cloudinary
    console.log(`2. Deleting asset ${uploadRes.publicId} from Cloudinary...`);
    const deleteRes = await deleteImage(uploadRes.publicId);
    console.log('  Deletion Successful!', deleteRes);

    if (deleteRes.result !== 'ok') {
      throw new Error(`Deletion returned unexpected status: ${JSON.stringify(deleteRes)}`);
    }

    console.log('====================================================');
    console.log(' Cloudinary Upload & Deletion Verified 100%');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' Cloudinary Test Failed:', err.message);
    process.exit(1);
  }
}

testCloudinaryIntegration();
