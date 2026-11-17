const MAX_DATA_URL_LENGTH = 260_000;

/**
 * Compresses an uploaded image file directly in the browser using Canvas
 * into a lightweight WebP/JPEG data URL so it saves & loads instantaneously
 * in Cloud Firestore realtime listeners without external storage delays.
 */
export async function compressImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      el.src = objectUrl;
    });

    const attempts = [
      { maxDim: 900, mime: 'image/webp', quality: 0.82 },
      { maxDim: 800, mime: 'image/webp', quality: 0.72 },
      { maxDim: 700, mime: 'image/jpeg', quality: 0.72 },
      { maxDim: 560, mime: 'image/jpeg', quality: 0.62 },
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser tidak mendukung pemrosesan gambar.');
    }

    let lastDataUrl = '';
    for (const attempt of attempts) {
      const scale = Math.min(
        1,
        attempt.maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
      );
      const width = Math.max(1, Math.round((img.naturalWidth || 800) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 600) * scale));

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(attempt.mime, attempt.quality);
      lastDataUrl = dataUrl;
      if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }

    if (lastDataUrl.length <= 390_000) {
      return lastDataUrl;
    }

    throw new Error(
      'Ukuran foto masih terlalu besar setelah kompresi. Gunakan foto yang lebih kecil.'
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
