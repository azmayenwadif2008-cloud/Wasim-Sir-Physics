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

    // YouTube standard, short, or embed URLs (0-cost Unlisted streaming)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';
      if (host.includes('youtu.be')) {
        videoId = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.replace('/embed/', '').split('/')[0] ?? '';
      } else if (url.pathname.startsWith('/live/')) {
        videoId = url.pathname.replace('/live/', '').split('/')[0] ?? '';
      } else {
        videoId = url.searchParams.get('v') ?? '';
      }

      if (videoId) {
        return {
          kind: 'iframe',
          src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
          providerLabel: 'YouTube Unlisted Stream',
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
          providerLabel: 'Google Drive Classroom Stream',
        };
      }
      const idParam = url.searchParams.get('id');
      if (idParam) {
        return {
          kind: 'iframe',
          src: `https://drive.google.com/file/d/${idParam}/preview`,
          providerLabel: 'Google Drive Classroom Stream',
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
          providerLabel: 'Vimeo Stream',
        };
      }
    }

    // Direct MP4 / WebM
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url.pathname)) {
      return {
        kind: 'video',
        src: trimmed,
        providerLabel: 'Direct MP4 Stream',
      };
    }

    return {
      kind: 'iframe',
      src: trimmed,
      providerLabel: 'Embedded Lecture Stream',
    };
  } catch {
    return {
      kind: 'external',
      src: trimmed,
      providerLabel: 'External Link',
    };
  }
}

export function slugifyId(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || `item-${Date.now()}`;
}
