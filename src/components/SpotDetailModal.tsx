import { useEffect, useState, type FormEvent } from 'react';
import {
  Bookmark,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Share2,
  Star,
  X,
} from 'lucide-react';
import type { CartItem, PhotoSpot } from '../types';
import { computeAverageRating, formatCoordinates, formatINR } from '../lib/geo';
import { submitSpotReview } from '../lib/api';
import { ResilientPhoto } from './ResilientPhoto';

interface SpotDetailModalProps {
  spot: PhotoSpot;
  onClose: () => void;
  onToggleLike: (spotId: string) => void;
  onToggleSave: (spotId: string) => void;
  onShareSpot: (spot: PhotoSpot) => void;
  onViewOnMap: (spotId: string) => void;
  onSpotUpdated: (updated: PhotoSpot) => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCart: () => void;
}

export function SpotDetailModal({
  spot,
  onClose,
  onToggleLike,
  onToggleSave,
  onShareSpot,
  onViewOnMap,
  onSpotUpdated,
  onAddToCart,
  onOpenCart,
}: SpotDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [purchaseKind, setPurchaseKind] = useState<'print' | 'license'>('print');
  const [selectedPrintId, setSelectedPrintId] = useState(spot.printOptions[0]?.id ?? '');
  const [selectedLicenseId, setSelectedLicenseId] = useState(spot.licenseOptions[0]?.id ?? 'editorial');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewCondition, setReviewCondition] = useState('Clear Light');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    setPhotoIndex(0);
    setSelectedPrintId(spot.printOptions[0]?.id ?? '');
    setSelectedLicenseId(spot.licenseOptions[0]?.id ?? 'editorial');
    setAddedFeedback(false);
  }, [spot.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const photos = spot.photos.length
    ? spot.photos
    : [{ id: 'cover', url: spot.coverUrl, caption: spot.title, aspectRatio: spot.aspectRatio }];
  const activePhoto = photos[Math.min(photoIndex, photos.length - 1)];
  const avgRating = computeAverageRating(spot.reviews);

  const activePrint =
    spot.printOptions.find((p) => p.id === selectedPrintId) ?? spot.printOptions[0];
  const activeLicense =
    spot.licenseOptions.find((l) => l.id === selectedLicenseId) ?? spot.licenseOptions[0];

  const handleAdd = () => {
    if (purchaseKind === 'print' && activePrint) {
      onAddToCart({
        id: `${spot.id}::print::${activePrint.id}`,
        spotId: spot.id,
        spotTitle: spot.title,
        photographerName: spot.photographer.name,
        coverUrl: spot.coverUrl,
        kind: 'print',
        optionId: activePrint.id,
        optionLabel: `${activePrint.label} (${activePrint.dimensions})`,
        unitPrice: activePrint.price,
        quantity: 1,
      });
    } else if (purchaseKind === 'license' && activeLicense) {
      onAddToCart({
        id: `${spot.id}::license::${activeLicense.id}`,
        spotId: spot.id,
        spotTitle: spot.title,
        photographerName: spot.photographer.name,
        coverUrl: spot.coverUrl,
        kind: 'license',
        optionId: activeLicense.id,
        optionLabel: activeLicense.label,
        unitPrice: activeLicense.price,
        quantity: 1,
      });
    }
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 2600);
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    setReviewError('');
    if (!reviewAuthor.trim() || !reviewComment.trim()) {
      setReviewError('Please enter your name and field observations.');
      return;
    }
    try {
      setSubmittingReview(true);
      const updated = await submitSpotReview(spot.id, {
        authorName: reviewAuthor.trim(),
        rating: reviewRating,
        conditionTag: reviewCondition,
        comment: reviewComment.trim(),
        visitedDate: reviewDate,
      });
      onSpotUpdated(updated);
      setReviewAuthor('');
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to post review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={spot.title}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#141821] text-zinc-100 w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 my-auto max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0 bg-[#141821]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-mono">{formatCoordinates(spot.lat, spot.lng)}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {spot.locationName}, {spot.country}
              </span>
            </div>
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-zinc-100 truncate">
              {spot.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleLike(spot.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer tabular-nums ${
                spot.likedByMe
                  ? 'border-rose-800 bg-rose-950/70 text-rose-300'
                  : 'border-zinc-700 bg-[#1A1F2B] text-zinc-300 hover:bg-zinc-800'
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
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer tabular-nums ${
                spot.savedByMe
                  ? 'border-blue-700 bg-blue-950/70 text-blue-300'
                  : 'border-zinc-700 bg-[#1A1F2B] text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${spot.savedByMe ? 'fill-blue-400 text-blue-400' : ''}`}
                aria-hidden="true"
              />
              <span>{spot.savedByMe ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => onShareSpot(spot)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-zinc-700 bg-[#1A1F2B] text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 bg-[#090B0E] flex flex-col justify-between">
            <div className="relative flex-1 min-h-[340px] sm:min-h-[460px] flex items-center justify-center bg-[#090B0E]">
              <ResilientPhoto
                src={activePhoto.url}
                alt={activePhoto.caption || spot.title}
                titleFallback={spot.title}
                className="w-full h-full max-h-[600px] object-contain"
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous gallery photo"
                    onClick={() =>
                      setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next gallery photo"
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-[#0F1218] text-zinc-300 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-300">
                {activePhoto.caption || spot.title}
                {photos.length > 1 ? ` (${photoIndex + 1} / ${photos.length})` : ''}
              </p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 tabular-nums shrink-0">
                <span>{spot.exif.camera}</span>
                <span aria-hidden="true">·</span>
                <span>{spot.exif.focalLength}</span>
                <span aria-hidden="true">·</span>
                <span>{spot.exif.aperture}</span>
                <span aria-hidden="true">·</span>
                <span>{spot.exif.shutterSpeed}</span>
                <span aria-hidden="true">·</span>
                <span>ISO {spot.exif.iso}</span>
              </div>
            </div>

            {photos.length > 1 && (
              <div className="px-6 py-3 bg-[#090B0E] flex items-center gap-2 overflow-x-auto border-t border-zinc-800">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    className={`w-16 h-12 rounded-md overflow-hidden border-2 transition-opacity shrink-0 cursor-pointer ${
                      idx === photoIndex
                        ? 'border-blue-500 opacity-100'
                        : 'border-transparent opacity-55 hover:opacity-90'
                    }`}
                  >
                    <ResilientPhoto
                      src={p.url}
                      alt={p.caption}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 space-y-8 bg-[#141821] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-xs text-zinc-400">
                  Photographed by{' '}
                  <span className="font-semibold text-zinc-100">{spot.photographer.name}</span>{' '}
                  <span className="text-zinc-500">({spot.photographer.homeBase})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewOnMap(spot.id);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:underline shrink-0 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Show on Atlas</span>
                </button>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">{spot.description}</p>

              <dl className="mt-5 grid grid-cols-2 gap-4 pt-5 border-t border-zinc-800 text-xs">
                <div>
                  <dt className="text-zinc-500 mb-0.5">Best Light Window</dt>
                  <dd className="font-medium text-zinc-100">{spot.bestTimeToShoot}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 mb-0.5">Elevation &amp; Region</dt>
                  <dd className="font-medium text-zinc-100 tabular-nums">
                    {spot.elevationMeters} m · {spot.region}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-zinc-500 mb-0.5">Trail &amp; Access Notes</dt>
                  <dd className="text-zinc-300 leading-relaxed">{spot.accessNotes}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-zinc-500 mb-0.5">Camera &amp; Lens</dt>
                  <dd className="font-mono text-zinc-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                    <span>
                      {spot.exif.camera} · {spot.exif.lens}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-5 rounded-xl bg-[#1A1F2B] border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Collect Print or License
                </h3>
                <span className="text-[11px] text-zinc-400">85% direct to artist</span>
              </div>

              <div className="grid grid-cols-2 p-1 bg-[#11151D] rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPurchaseKind('print')}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    purchaseKind === 'print'
                      ? 'bg-[#252D3D] text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Fine Art Print
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseKind('license')}
                  className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    purchaseKind === 'license'
                      ? 'bg-[#252D3D] text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  Digital License
                </button>
              </div>

              {purchaseKind === 'print' ? (
                <div className="space-y-2">
                  {spot.printOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedPrintId(opt.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        selectedPrintId === opt.id
                          ? 'bg-[#1D2535] border-blue-500'
                          : 'bg-[#141821] border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100">{opt.label}</p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {opt.dimensions} · {opt.paper}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-zinc-100 tabular-nums shrink-0">
                        {formatINR(opt.price)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {spot.licenseOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedLicenseId(opt.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                        selectedLicenseId === opt.id
                          ? 'bg-[#1D2535] border-blue-500'
                          : 'bg-[#141821] border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100">{opt.label}</p>
                        <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                          {opt.terms}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-zinc-100 tabular-nums shrink-0">
                        {formatINR(opt.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <span>
                      Add to Cart ·{' '}
                      {formatINR(
                        (purchaseKind === 'print' ? activePrint?.price : activeLicense?.price) ?? 0
                      )}
                    </span>
                  )}
                </button>
                {addedFeedback && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCart();
                    }}
                    className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Checkout
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Field Reviews ({spot.reviews.length})
                </h3>
                {avgRating > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-200 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {avgRating.toFixed(1)} average
                  </span>
                )}
              </div>

              {spot.reviews.length > 0 ? (
                <div className="space-y-4">
                  {spot.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="pb-4 border-b border-zinc-800/80 last:border-none last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-zinc-100">{rev.authorName}</span>
                        <span className="text-zinc-400 tabular-nums">
                          {rev.rating}/5 · {rev.conditionTag}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{rev.comment}</p>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                        Visited {rev.visitedDate}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  No field reports yet. Share light conditions or tripod access notes below.
                </p>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-zinc-200">Add a Field Review</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="Your name"
                    className="px-3 py-2 text-xs bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={reviewCondition}
                    onChange={(e) => setReviewCondition(e.target.value)}
                    aria-label="Shooting conditions"
                    className="px-3 py-2 text-xs bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Clear Light">Clear Light</option>
                    <option value="Calm Mirror Water">Calm Mirror Water</option>
                    <option value="Dawn Mist">Dawn Mist</option>
                    <option value="Drifting Clouds">Drifting Clouds</option>
                    <option value="Windy / Exposed">Windy / Exposed</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1" role="group" aria-label="Spot rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        aria-label={`Rate ${star} stars`}
                        className="p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= reviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    aria-label="Date visited"
                    className="px-2.5 py-1.5 text-xs font-mono bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share vantage point tips, trail access, or optimal timing..."
                  className="w-full px-3 py-2 text-xs bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                />

                {reviewError && <p className="text-xs text-rose-400">{reviewError}</p>}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  {submittingReview ? 'Posting Review...' : 'Post Field Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
