const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const { IMAGE_CONFIG } = require('../constants/mailConstants');
dotenv.config();

class CLOUDINARY_HELPER {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }

    async uploadBuffer(buffer, contentType) {
        const base64 = buffer.toString('base64');
        const dataUri = `data:${contentType};base64,${base64}`;

        const publicId = IMAGE_CONFIG.filename + '_' + Date.now();

        try {
            const result = await cloudinary.uploader.upload(dataUri, {
                folder: IMAGE_CONFIG.folder,
                public_id: publicId,
                resource_type: contentType.includes('image') ? 'image' : 'raw'
            });
            return result.secure_url;
        } catch (error) {
            console.error('Err', error);
            throw error;
        }
    }
}
module.exports = new CLOUDINARY_HELPER();;
