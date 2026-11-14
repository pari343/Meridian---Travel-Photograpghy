import { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ArrowRight, Bookmark, Compass, Search, Upload } from 'lucide-react';
import type { CartItem, PhotoSpot } from './types';
import {
  fetchAppConfig,
  fetchSpots,
  recordShareSpot,
  toggleLikeSpot,
  toggleSaveSpot,
} from './lib/api';
import { computeAverageRating, formatCoordinates } from './lib/geo';
import { Header, type ActiveView } from './components/Header';
import { GalleryCard } from './components/GalleryCard';
import { SpotMapView } from './components/SpotMapView';
import { SpotDetailModal } from './components/SpotDetailModal';
import { UploadGalleryView } from './components/UploadGalleryView';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { ResilientPhoto } from './components/ResilientPhoto';

const REGIONS = ['All', 'India', 'Europe', 'Asia', 'South America', 'North Africa'] as const;
const CATEGORIES = ['All', 'Alpine', 'Coastal', 'Architectural', 'Woodland'] as const;

export default function App() {
  const [mapsApiKey, setMapsApiKey] = useState<string>('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [spots, setSpots] = useState<PhotoSpot[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'likes' | 'rating'>('featured');

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [mapFocusSpotId, setMapFocusSpotId] = useState<string | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('meridian_cart_v2_inr');
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('meridian_cart_v2_inr', JSON.stringify(cartItems));
    } catch {
      // Ignore storage quota issues
    }
  }, [cartItems]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? '' : curr));
    }, 3000);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAppConfig(), fetchSpots()])
      .then(([cfg, loadedSpots]) => {
        if (!active) return;
        setMapsApiKey(cfg.mapsApiKey);
        setConfigLoaded(true);
        setSpots(loadedSpots);
        setLoadingSpots(false);

        const hash = window.location.hash;
        if (hash.startsWith('#spot=')) {
          const targetId = decodeURIComponent(hash.slice('#spot='.length));
          if (loadedSpots.some((s) => s.id === targetId)) {
            setSelectedSpotId(targetId);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setConfigLoaded(true);
        setLoadingSpots(false);
        setLoadError(err instanceof Error ? err.message : 'Unable to load photography spots.');
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedSpot = useMemo(
    () => spots.find((s) => s.id === selectedSpotId) ?? null,
    [spots, selectedSpotId]
  );

  const savedSpots = useMemo(() => spots.filter((s) => s.savedByMe), [spots]);

  const totalReviewsCount = useMemo(
    () => spots.reduce((sum, s) => sum + s.reviews.length, 0),
    [spots]
  );

  const heroSpot = spots[0] ?? null;

  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = spots.filter((s) => {
      if (regionFilter !== 'All' && s.region !== regionFilter) return false;
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (q) {
        return (
          s.title.toLowerCase().includes(q) ||
          s.locationName.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.photographer.name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === 'likes') {
      return [...list].sort((a, b) => b.likesCount - a.likesCount);
    }
    if (sortBy === 'rating') {
      return [...list].sort(
        (a, b) => computeAverageRating(b.reviews) - computeAverageRating(a.reviews)
      );
    }
    return list;
  }, [spots, regionFilter, categoryFilter, searchQuery, sortBy]);

  const handleToggleLike = useCallback(async (spotId: string) => {
    try {
      const res = await toggleLikeSpot(spotId);
      setSpots((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? { ...s, likesCount: res.likesCount, likedByMe: res.likedByMe }
            : s
        )
      );
    } catch {
      showToast('Could not update like status.');
    }
  }, [showToast]);

  const handleToggleSave = useCallback(
    async (spotId: string) => {
      try {
        const res = await toggleSaveSpot(spotId);
        setSpots((prev) =>
          prev.map((s) =>
            s.id === spotId
              ? { ...s, savesCount: res.savesCount, savedByMe: res.savedByMe }
              : s
          )
        );
        showToast(res.savedByMe ? 'Saved to your travel collection.' : 'Removed from saved.');
      } catch {
        showToast('Could not update saved collection.');
      }
    },
    [showToast]
  );

  const handleShareSpot = useCallback(
    async (spot: PhotoSpot) => {
      const shareUrl = `${window.location.origin}/#spot=${encodeURIComponent(spot.id)}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(`Link copied for "${spot.title}"`);
      } catch {
        window.location.hash = `spot=${encodeURIComponent(spot.id)}`;
        showToast(`Share URL ready in address bar for "${spot.title}"`);
      }
      try {
        const res = await recordShareSpot(spot.id);
        setSpots((prev) =>
          prev.map((s) => (s.id === spot.id ? { ...s, sharesCount: res.sharesCount } : s))
        );
      } catch {
        // Non-blocking share counter
      }
    },
    [showToast]
  );

  const handleAddToCart = useCallback((newItem: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, newItem];
    });
  }, []);

  const handleUpdateCartQty = useCallback((itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const handleRemoveCartItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const hasMapsKey = configLoaded && Boolean(mapsApiKey);

  const content = (
    <div className="min-h-screen flex flex-col bg-[#0B0D11] text-zinc-100">
      {quotaExceeded && (
        <div className="bg-amber-950/95 border-b border-amber-800 text-amber-100 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-200 hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        savedCount={savedSpots.length}
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'home' && (
          <>
            <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                <div className="lg:col-span-5 flex flex-col justify-between py-2 sm:py-6">
                  <div className="space-y-5">
                    <p className="text-xs font-medium text-blue-400 tracking-wide">
                      Travel Photography &amp; Geotagged Field Atlas
                    </p>
                    <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold text-zinc-100 tracking-tight leading-[1.08] text-balance">
                      Discover the world through local lenses.
                    </h1>
                    <p className="text-base text-zinc-400 leading-relaxed max-w-md">
                      Explore high-resolution travel galleries pinned to exact coordinates, read
                      field notes from photographers on the ground, and collect archival prints or
                      instant commercial licenses.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveView('map')}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Compass className="w-4 h-4" aria-hidden="true" />
                      <span>Explore Spot Map</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('upload')}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#1A1F2B] hover:bg-zinc-800 text-zinc-100 border border-zinc-700 text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      <span>Upload Gallery</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  {heroSpot ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSpotId(heroSpot.id)}
                      className="group relative w-full h-[360px] sm:h-[440px] lg:h-full lg:min-h-[460px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 text-left block cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
                    >
                      <ResilientPhoto
                        src={heroSpot.coverUrl}
                        alt={heroSpot.title}
                        titleFallback={heroSpot.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
                        <div>
                          <p className="text-xs font-mono text-zinc-300 mb-1">
                            {formatCoordinates(heroSpot.lat, heroSpot.lng)} · {heroSpot.country}
                          </p>
                          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold tracking-tight">
                            {heroSpot.title}
                          </h2>
                          <p className="text-xs text-zinc-300 mt-1">
                            {heroSpot.photographer.name} · {heroSpot.exif.camera} ·{' '}
                            {heroSpot.exif.focalLength} {heroSpot.exif.aperture}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white shrink-0">
                          <span>Inspect Gallery</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-full h-[460px] rounded-2xl bg-[#141821] border border-zinc-800 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-b border-zinc-800 pb-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-zinc-400">Geotagged Spots</p>
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums mt-0.5">
                    {spots.length} Verified Viewpoints
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">EXIF &amp; Light Data</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-0.5">
                    Auto-Parsed GPS &amp; Optics
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Community Field Reports</p>
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums mt-0.5">
                    {totalReviewsCount} Traveller Reviews
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Prints &amp; Licensing</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-0.5">
                    85% Direct Artist Payout
                  </p>
                </div>
              </div>
            </section>

            <section
              id="galleries"
              className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#141821] border border-zinc-800 rounded-lg w-fit">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setRegionFilter(region)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        regionFilter === region
                          ? 'bg-[#252D3D] text-white shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search
                      className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search places, artists, titles..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#141821] border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by subject"
                    className="px-3 py-2 text-xs bg-[#141821] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Subjects' : cat}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'featured' | 'likes' | 'rating')
                    }
                    aria-label="Sort galleries"
                    className="px-3 py-2 text-xs bg-[#141821] border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="featured">Featured</option>
                    <option value="likes">Most Liked</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>

              {loadingSpots ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-80 rounded-xl border border-zinc-800 bg-[#141821] animate-pulse"
                    />
                  ))}
                </div>
              ) : loadError ? (
                <div className="mt-8 p-6 rounded-xl border border-rose-800 bg-rose-950/70 text-sm text-rose-200">
                  {loadError}
                </div>
              ) : filteredSpots.length === 0 ? (
                <div className="mt-10 py-16 text-center border border-zinc-800 rounded-xl bg-[#141821]">
                  <p className="text-sm font-medium text-zinc-100">
                    No matching travel galleries found
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRegionFilter('All');
                      setCategoryFilter('All');
                      setSearchQuery('');
                    }}
                    className="mt-3 px-4 py-2 text-xs font-medium text-blue-300 bg-blue-950/60 border border-blue-900/60 hover:bg-blue-950 rounded-lg cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filteredSpots.map((spot) => (
                    <GalleryCard
                      key={spot.id}
                      spot={spot}
                      onOpenSpot={(s) => setSelectedSpotId(s.id)}
                      onToggleLike={handleToggleLike}
                      onToggleSave={handleToggleSave}
                      onShareSpot={handleShareSpot}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="border-t border-zinc-800 bg-[#0F1218] mt-8">
              <SpotMapView
                spots={spots}
                hasMapsKey={hasMapsKey}
                onOpenSpot={(s) => setSelectedSpotId(s.id)}
                initialFocusSpotId={mapFocusSpotId}
              />
            </div>
          </>
        )}

        {activeView === 'map' && (
          <SpotMapView
            spots={spots}
            hasMapsKey={hasMapsKey}
            onOpenSpot={(s) => setSelectedSpotId(s.id)}
            initialFocusSpotId={mapFocusSpotId}
          />
        )}

        {activeView === 'saved' && (
          <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="pb-6 border-b border-zinc-800 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-blue-400 mb-1">Personal Fieldbook</p>
                <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
                  Saved Photography Spots
                </h1>
              </div>
              <span className="text-xs font-mono text-zinc-400 tabular-nums">
                {savedSpots.length} saved
              </span>
            </div>

            {savedSpots.length === 0 ? (
              <div className="mt-10 py-20 text-center border border-zinc-800 rounded-xl bg-[#141821]">
                <Bookmark className="w-7 h-7 mx-auto mb-3 text-zinc-500" aria-hidden="true" />
                <p className="text-base font-medium text-zinc-100">
                  No saved photography spots yet
                </p>
                <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                  Bookmark galleries and viewpoints as you plan your next expedition.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('home')}
                  className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Browse Galleries
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {savedSpots.map((spot) => (
                  <GalleryCard
                    key={spot.id}
                    spot={spot}
                    onOpenSpot={(s) => setSelectedSpotId(s.id)}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                    onShareSpot={handleShareSpot}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeView === 'upload' && (
          <UploadGalleryView
            hasMapsKey={hasMapsKey}
            onSpotCreated={(created) => {
              setSpots((prev) => [created, ...prev]);
              setActiveView('home');
              setSelectedSpotId(created.id);
              showToast(`Published "${created.title}" to the Meridian Atlas.`);
            }}
            onCancel={() => setActiveView('home')}
          />
        )}
      </main>

      <footer className="border-t border-zinc-800 bg-[#0B0D11] mt-12">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-base font-semibold text-zinc-100">Meridian</span>
            <span aria-hidden="true">·</span>
            <span>Travel Photography &amp; Geotagged Spot Atlas</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('map')}
              className="hover:text-zinc-100 cursor-pointer"
            >
              Spot Map
            </button>
            <button
              type="button"
              onClick={() => setActiveView('upload')}
              className="hover:text-zinc-100 cursor-pointer"
            >
              Submit Gallery
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="hover:text-zinc-100 cursor-pointer"
            >
              Prints &amp; Licensing Cart
            </button>
          </div>
        </div>
      </footer>

      {selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot}
          onClose={() => {
            setSelectedSpotId(null);
            if (window.location.hash.startsWith('#spot=')) {
              history.replaceState(null, '', window.location.pathname);
            }
          }}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onShareSpot={handleShareSpot}
          onViewOnMap={(id) => {
            setMapFocusSpotId(id);
            setActiveView('map');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSpotUpdated={(updated) => {
            setSpots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
          onAddToCart={handleAddToCart}
          onOpenCart={() => setCartOpen(true)}
        />
      )}

      <CartCheckoutDrawer
        isOpen={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-[#1D2433] border border-zinc-700 text-zinc-100 text-xs font-medium rounded-lg shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );

  if (hasMapsKey) {
    return (
      <APIProvider apiKey={mapsApiKey} libraries={['places', 'marker']} language="en">
        {content}
      </APIProvider>
    );
  }

  return content;
}
