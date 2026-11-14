import { Bookmark, Heart, MapPin, Share2, Star } from 'lucide-react';
import type { PhotoSpot } from '../types';
import { computeAverageRating, formatINR } from '../lib/geo';
import { ResilientPhoto } from './ResilientPhoto';

interface GalleryCardProps {
  spot: PhotoSpot;
  onOpenSpot: (spot: PhotoSpot) => void;
  onToggleLike: (spotId: string) => void;
  onToggleSave: (spotId: string) => void;
  onShareSpot: (spot: PhotoSpot) => void;
}

export function GalleryCard({
  spot,
  onOpenSpot,
  onToggleLike,
  onToggleSave,
  onShareSpot,
}: GalleryCardProps) {
  const avgRating = computeAverageRating(spot.reviews);
  const lowestPrice = Math.min(
    ...spot.licenseOptions.map((l) => l.price),
    ...spot.printOptions.map((p) => p.price)
  );

  return (
    <article className="group flex flex-col border border-zinc-800 bg-[#141821] rounded-xl overflow-hidden transition-colors duration-200 hover:border-zinc-700">
      <button
        type="button"
        onClick={() => onOpenSpot(spot)}
        className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-900 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <ResilientPhoto
          src={spot.coverUrl}
          alt={`${spot.title} — ${spot.locationName}, ${spot.country}`}
          titleFallback={spot.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      </button>

      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1.5">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {spot.locationName} · {spot.country}
              </span>
            </span>
            {avgRating > 0 && (
              <span className="inline-flex items-center gap-1 text-zinc-200 font-medium tabular-nums shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {avgRating.toFixed(1)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenSpot(spot)}
            className="text-left block w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <h3 className="text-base font-semibold text-zinc-100 tracking-tight leading-snug group-hover:text-blue-400 transition-colors">
              {spot.title}
            </h3>
          </button>

          <p className="mt-1 text-xs text-zinc-400 truncate">
            {spot.photographer.name} · {spot.exif.focalLength} {spot.exif.aperture} · {spot.category}
          </p>
        </div>

        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(spot.id)}
              aria-label={spot.likedByMe ? `Unlike ${spot.title}` : `Like ${spot.title}`}
              aria-pressed={Boolean(spot.likedByMe)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-blue-500 ${
                spot.likedByMe
                  ? 'text-rose-300 bg-rose-950/70'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${spot.likedByMe ? 'fill-rose-400 text-rose-400' : ''}`}
                aria-hidden="true"
              />
              <span>{spot.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(spot.id)}
              aria-label={spot.savedByMe ? `Remove ${spot.title} from saved` : `Save ${spot.title}`}
              aria-pressed={Boolean(spot.savedByMe)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-blue-500 ${
                spot.savedByMe
                  ? 'text-blue-300 bg-blue-950/70'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${spot.savedByMe ? 'fill-blue-400 text-blue-400' : ''}`}
                aria-hidden="true"
              />
              <span>{spot.savesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onShareSpot(spot)}
              aria-label={`Share ${spot.title}`}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenSpot(spot)}
            className="text-xs font-mono font-medium text-zinc-200 hover:text-blue-400 tabular-nums whitespace-nowrap shrink-0 cursor-pointer px-2 py-2"
          >
            From {formatINR(lowestPrice)}
          </button>
        </div>
      </div>
    </article>
  );
}
