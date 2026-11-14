import { useState } from 'react';
import { Camera } from 'lucide-react';
import { resolvePhotoUrl } from '../lib/seedAssets';

interface ResilientPhotoProps {
  src: string;
  alt: string;
  className?: string;
  titleFallback?: string;
}

export function ResilientPhoto({
  src,
  alt,
  className = 'w-full h-full object-cover',
  titleFallback,
}: ResilientPhotoProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolvePhotoUrl(src);

  if (failed || !resolved) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
        <Camera className="w-6 h-6 mb-2 text-zinc-500" aria-hidden="true" />
        <span className="text-xs font-medium tracking-tight text-zinc-300">
          {titleFallback || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
