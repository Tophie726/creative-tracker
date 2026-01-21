import { supabase } from '../lib/supabase';

export async function generateVideoThumbnail(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const timeout = setTimeout(() => {
      video.src = '';
      resolve(null);
    }, 10000); // 10 second timeout

    video.onloadeddata = () => {
      video.currentTime = 0.5; // Seek to 0.5 seconds for better frame
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        // Use smaller dimensions for thumbnails (max 400px width)
        const scale = Math.min(1, 400 / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              video.src = '';
              resolve(blob);
            },
            'image/jpeg',
            0.8
          );
        } else {
          video.src = '';
          resolve(null);
        }
      } catch (e) {
        // CORS or other error
        console.log('Could not capture video thumbnail:', e);
        video.src = '';
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      video.src = '';
      resolve(null);
    };

    video.src = videoUrl;
  });
}

export async function uploadThumbnail(
  assetId: string,
  blob: Blob,
  userId: string
): Promise<string | null> {
  const fileName = `${userId}/${assetId}.jpg`;

  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading thumbnail:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('thumbnails')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function generateAndUploadThumbnail(
  assetId: string,
  videoUrl: string,
  userId: string
): Promise<string | null> {
  const blob = await generateVideoThumbnail(videoUrl);
  if (!blob) return null;

  return uploadThumbnail(assetId, blob, userId);
}
