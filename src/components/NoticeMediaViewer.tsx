import { useState } from 'react';
import { ExternalLink, Maximize2, Play, X } from 'lucide-react';
import { parseVideoUrl, sanitizeNoticeImageUrl, sanitizeNoticeVideoUrl } from '../lib/videoUtils';

interface NoticeMediaViewerProps {
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  compact?: boolean;
}

export function NoticeMediaViewer({
  title,
  imageUrl,
  videoUrl,
  compact = false,
}: NoticeMediaViewerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeImage = imageUrl ? sanitizeNoticeImageUrl(imageUrl) : '';
  const safeVideo = videoUrl ? sanitizeNoticeVideoUrl(videoUrl) : '';
  const parsedVideo = safeVideo ? parseVideoUrl(safeVideo) : null;

  if (!safeImage && !parsedVideo) {
    return null;
  }

  return (
    <div className={`mt-4 space-y-3 ${compact ? 'max-w-md' : 'max-w-2xl'}`}>
      {safeImage && (
        <div className="relative group inline-block max-w-full rounded-xl overflow-hidden border border-[#2D3340] bg-[#111318]">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full text-left cursor-pointer focus:outline-none"
            aria-label={`${title} — ছবি বড় করে দেখো`}
          >
            <img
              src={safeImage}
              alt={title}
              loading="lazy"
              className={`w-full ${
                compact ? 'max-h-48' : 'max-h-[420px]'
              } object-contain bg-[#0C0E13]`}
            />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-[#0C0E13]/95 border-t border-[#262B36] w-full justify-between">
              <span>নোটিশের সংযুক্ত ছবি</span>
              <span className="inline-flex items-center gap-1 text-pink-300">
                <Maximize2 className="w-3 h-3" />
                <span>বড় করে দেখো</span>
              </span>
            </span>
          </button>
        </div>
      )}

      {parsedVideo && parsedVideo.src && (
        <div className="rounded-xl overflow-hidden border border-[#2D3340] bg-[#111318]">
          {parsedVideo.kind === 'iframe' ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={parsedVideo.src}
                title={`${title} — ভিডিও নোটিশ`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : parsedVideo.kind === 'video' ? (
            <div className="aspect-video w-full bg-black">
              <video
                src={parsedVideo.src}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full"
              />
            </div>
          ) : (
            <a
              href={parsedVideo.src}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-4 hover:bg-[#1F2430] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-sky-950/70 border border-sky-800/80 text-sky-300 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-sky-300">
                    {parsedVideo.providerLabel}
                  </div>
                  <div className="text-xs text-slate-300 truncate">
                    ভিডিও নোটিশ দেখতে এখানে ট্যাপ করো
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
            </a>
          )}
        </div>
      )}

      {lightboxOpen && safeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="fixed top-4 right-4 p-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-100 hover:bg-slate-800 cursor-pointer"
            aria-label="বন্ধ করো"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={safeImage}
            alt={title}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-lg border border-slate-700"
          />
        </div>
      )}
    </div>
  );
}
