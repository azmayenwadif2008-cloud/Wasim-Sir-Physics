import { useState } from 'react';
import { Atom } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel = 'Wasim Sir Physics · HSC 28',
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-900 text-slate-200 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Atom className="w-10 h-10 text-sky-400 mb-3" />
        <p className="text-xs font-mono tracking-tight text-slate-300 text-center">
          {fallbackLabel}
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
