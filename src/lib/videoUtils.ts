export interface ParsedVideoEmbed {
  kind: 'iframe' | 'video' | 'external';
  src: string;
  providerLabel: string;
}

export function parseVideoUrl(rawUrl: string): ParsedVideoEmbed {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { kind: 'external', src: '', providerLabel: 'Unknown' };
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    // YouTube standard, short, shorts, live, or embed URLs (0-cost Unlisted streaming)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.replace('/embed/', '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.replace('/shorts/', '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/live/')) {
        videoId = url.pathname.replace('/live/', '').split('/')[0] ?? '';
      } else {
        videoId = url.searchParams.get('v') ?? '';
      }

      if (videoId) {
        return {
          kind: 'iframe',
          src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
          providerLabel: 'YouTube Video',
        };
      }
    }

    // Google Drive file preview URLs (0-cost Drive video hosting)
    if (host.includes('drive.google.com')) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match?.[1]) {
        return {
          kind: 'iframe',
          src: `https://drive.google.com/file/d/${match[1]}/preview`,
          providerLabel: 'Google Drive Video',
        };
      }
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return {
          kind: 'iframe',
          src: `https://drive.google.com/file/d/${idParam}/preview`,
          providerLabel: 'Google Drive Video',
        };
      }
    }

    // Vimeo embed
    if (host.includes('vimeo.com')) {
      const segments = url.pathname.split('/').filter(Boolean);
      const id = segments[segments.length - 1];
      if (id && /^\d+$/.test(id)) {
        return {
          kind: 'iframe',
          src: `https://player.vimeo.com/video/${id}`,
          providerLabel: 'Vimeo Video',
        };
      }
    }

    // Facebook / Instagram / TikTok block iframe embedding; open directly in a clean card
    if (host.includes('facebook.com') || host.includes('fb.watch')) {
      return {
        kind: 'external',
        src: trimmed,
        providerLabel: 'Facebook Video',
      };
    }

    if (host.includes('instagram.com') || host.includes('tiktok.com')) {
      return {
        kind: 'external',
        src: trimmed,
        providerLabel: 'Social Video Link',
      };
    }

    // Direct MP4 / WebM
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url.pathname)) {
      return {
        kind: 'video',
        src: trimmed,
        providerLabel: 'Direct Video',
      };
    }

    return {
      kind: 'iframe',
      src: trimmed,
      providerLabel: 'Embedded Video',
    };
  } catch {
    return {
      kind: 'external',
      src: trimmed,
      providerLabel: 'External Video Link',
    };
  }
}

export function sanitizeNoticeImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed.length <= 500000 ? trimmed : '';
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    // Convert Google Drive share links to direct viewable image URLs
    if (url.hostname.toLowerCase().includes('drive.google.com')) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match?.[1] ?? url.searchParams.get('id');
      if (id) {
        return `https://lh3.googleusercontent.com/d/${id}`;
      }
    }
    return trimmed.slice(0, 500);
  } catch {
    return '';
  }
}

export function sanitizeNoticeVideoUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    return trimmed.slice(0, 500);
  } catch {
    return '';
  }
}

export async function compressNoticeImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে একটি বৈধ ছবি (JPG, PNG বা WebP) নির্বাচন করুন।');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('ছবিটি পড়া যায়নি।'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('ছবিটি প্রসেস করা যায়নি।'));
    image.src = dataUrl;
  });

  const maxSide = 1280;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxSide || height > maxSide) {
    const scale = maxSide / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ব্রাউজার ইমেজ কম্প্রেশন সাপোর্ট করছে না।');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const qualities = [0.82, 0.72, 0.6, 0.48, 0.36];
  for (const q of qualities) {
    const result = canvas.toDataURL('image/jpeg', q);
    if (result.length <= 460000) {
      return result;
    }
  }

  // Final smaller resize pass for ultra-detailed photos
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = Math.max(1, Math.round(width * 0.65));
  smallCanvas.height = Math.max(1, Math.round(height * 0.65));
  const sCtx = smallCanvas.getContext('2d');
  if (sCtx) {
    sCtx.fillStyle = '#FFFFFF';
    sCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
    sCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
    const smallResult = smallCanvas.toDataURL('image/jpeg', 0.65);
    if (smallResult.length <= 460000) {
      return smallResult;
    }
  }

  throw new Error('ছবির সাইজ অনেক বড়। অনুগ্রহ করে ছোট বা ক্রপ করা ছবি দিন।');
}

export function slugifyId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || `item-${Date.now()}`;
}
