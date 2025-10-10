import axios from 'axios';

import logger from '@/lib/logger';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (reader.result !== null) {
        resolve(reader.result as string);
      } else {
        reject(new Error('FileReader result is null'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

export async function uploadToCloudinary(
  file: any,
  folder: 'earn-pfp' | 'earn-sponsor' | 'listing-description',
  type = 'pfp',
) {
  try {
    const base64Image = await fileToBase64(file);
    const base64Content = base64Image.split(',')[1];

    const response = await axios.post('/api/upload-image', {
      imageBase64: base64Content,
      type,
      folder,
    });

    if (!response.data.url) {
      throw new Error('Upload successful but no URL returned');
    }

    return response.data.url;
  } catch (error) {
    logger.error('Error uploading the image:', error);
    // Re-throw the error so the calling component can handle it
    throw new Error(
      error instanceof Error 
        ? `上传失败: ${error.message}` 
        : '图片上传失败，请重试'
    );
  }
}
