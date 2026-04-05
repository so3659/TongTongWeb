import { getPresignedUrl, getR2PublicUrl } from './r2Client';

/**
 * Unified R2 Upload Utility for the Frontend.
 * 
 * @param {File} file - The file to upload.
 * @param {string} destination - The path/name of the file in the R2 bucket (e.g., 'profiles/user_id/avatar.jpg').
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
export async function uploadToR2(file, destination) {
  try {
    // 1. Get Presigned URL
    // In a real production environment, you would call a backend/Edge Function here
    // instead of calling r2Client directly on the client side.
    const uploadUrl = await getPresignedUrl(destination, file.type);

    // 2. Upload file directly to R2 using the Presigned URL (PUT method)
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`R2 Upload Failed: ${response.statusText}`);
    }

    // 3. Return the Public URL
    return getR2PublicUrl(destination);
  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw error;
  }
}
