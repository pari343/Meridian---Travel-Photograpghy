import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Compass, LocateFixed, MapPin, Search, Star } from 'lucide-react';
import type { PhotoSpot } from '../types';
import { computeAverageRating, formatCoordinates, haversineDistanceKm } from '../lib/geo';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import { ResilientPhoto } from './ResilientPhoto';

interface SpotMapViewProps {
  spots: PhotoSpot[];
  hasMapsKey: boolean;
  onOpenSpot: (spot: PhotoSpot) => void;
  initialFocusSpotId?: string | null;
}

interface SpotMarkerProps {
  spot: PhotoSpot;
  isSelected: boolean;
  onSelect: (spot: PhotoSpot) => void;
  onOpenSpot: (spot: PhotoSpot) => void;
  onClose: () => void;
}

function SpotMarker({
  spot,
  isSelected,
  onSelect,
  onOpenSpot,
  onClose,
}: SpotMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const avg = computeAverageRating(spot.reviews);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: spot.lat, lng: spot.lng }}
        onClick={() => onSelect(spot)}
        title={`${spot.title} — ${spot.locationName}`}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-md transition-transform duration-150 cursor-pointer ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-400 scale-110'
              : 'bg-[#141821] text-zinc-100 border-zinc-700 hover:border-zinc-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-85" aria-hidden="true" />
          <span className="text-xs font-medium whitespace-nowrap max-w-[130px] truncate">
            {spot.locationName.split(',')[0]}
          </span>
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={280}>
          <div className="p-1 bg-white text-zinc-950 font-sans">
            <div className="w-full h-32 rounded-lg overflow-hidden mb-2.5 bg-zinc-100">
              <ResilientPhoto
                src={spot.coverUrl}
                alt={spot.title}
                titleFallback={spot.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mb-1">
              {formatCoordinates(spot.lat, spot.lng)}
            </p>
            <h4 className="text-sm font-semibold text-zinc-950 leading-snug mb-1">
              {spot.title}
            </h4>
            <p className="text-xs text-zinc-600 mb-2.5">
              {spot.bestTimeToShoot}
              {avg > 0 ? ` · ${avg.toFixed(1)} ★ (${spot.reviews.length})` : ''}
            </p>
            <button
              type="button"
              onClick={() => onOpenSpot(spot)}
              className="w-full py-2 px-3 bg-zinc-950 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Inspect Spot &amp; Buy Print
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function PlacesSearchOverlay({
  onSelectCoordinates,
}: {
  onSelectCoordinates: (lat: number, lng: number, label: string, viewport?: google.maps.LatLngBounds) => void;
}) {
  const [query, setQuery] = useState('');
  const { suggestions, isLoading, selectSuggestion } = usePlacesAutocomplete(query);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, peak, or landmark..."
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1.5 w-full bg-[#1A1F2B] border border-zinc-700 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-zinc-800">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={async () => {
                  const res = await selectSuggestion(s);
                  if (res) {
                    setQuery(res.name);
                    onSelectCoordinates(res.lat, res.lng, res.name, res.viewport);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <span className="font-medium text-zinc-100 block truncate">
                  {s.placePrediction?.mainText?.text || s.placePrediction?.text.text}
                </span>
                {s.placePrediction?.secondaryText?.text && (
                  <span className="text-zinc-400 block truncate mt-0.5">
                    {s.placePrediction.secondaryText.text}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isLoading && query.trim().length >= 2 && (
        <span className="sr-only">Searching locations...</span>
      )}
    </div>
  );
}

function MapCameraSync({
  focusTarget,
}: {
  focusTarget: { lat: number; lng: number; zoom?: number; viewport?: google.maps.LatLngBounds } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !focusTarget) return;
    if (focusTarget.viewport) {
      map.fitBounds(focusTarget.viewport);
    } else {
      map.panTo({ lat: focusTarget.lat, lng: focusTarget.lng });
      if (focusTarget.zoom) {
        map.setZoom(focusTarget.zoom);
      }
    }
  }, [map, focusTarget]);

  return null;
}

export function SpotMapView({
  spots,
  hasMapsKey,
  onOpenSpot,
  initialFocusSpotId,
}: SpotMapViewProps) {
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(
    initialFocusSpotId ?? spots[0]?.id ?? null
  );
  const [anchorPoint, setAnchorPoint] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(0);
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [localFilterQuery, setLocalFilterQuery] = useState<string>('');
  const [cameraFocus, setCameraFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    viewport?: google.maps.LatLngBounds;
  } | null>(null);

  useEffect(() => {
    if (!initialFocusSpotId) return;
    const target = spots.find((s) => s.id === initialFocusSpotId);
    if (target) {
      setSelectedSpotId(target.id);
      setCameraFocus({ lat: target.lat, lng: target.lng, zoom: 11 });
    }
  }, [initialFocusSpotId, spots]);

  const filteredSpots = useMemo(() => {
    return spots
      .map((spot) => {
        const distanceKm = anchorPoint
          ? haversineDistanceKm(anchorPoint.lat, anchorPoint.lng, spot.lat, spot.lng)
          : null;
        return { spot, distanceKm };
      })
      .filter(({ spot, distanceKm }) => {
        if (radiusKm > 0 && distanceKm !== null && distanceKm > radiusKm) {
          return false;
        }
        if (localFilterQuery.trim()) {
          const q = localFilterQuery.toLowerCase();
          return (
            spot.title.toLowerCase().includes(q) ||
            spot.locationName.toLowerCase().includes(q) ||
            spot.country.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return b.spot.likesCount - a.spot.likesCount;
      });
  }, [spots, anchorPoint, radiusKm, localFilterQuery]);

  const selectedSpot = useMemo(
    () => spots.find((s) => s.id === selectedSpotId) ?? null,
    [spots, selectedSpotId]
  );

  const handleFindNearMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is unavailable in this browser.');
      return;
    }
    setGeoStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setAnchorPoint({ lat, lng, label: 'Your Current Location' });
        setRadiusKm(500);
        setCameraFocus({ lat, lng, zoom: 6 });
        setGeoStatus(`Centered near ${formatCoordinates(lat, lng)}`);
      },
      () => {
        setGeoStatus('Location access declined. Search a place or pick a spot below.');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <p className="text-xs font-medium text-blue-400 mb-1">Geotagged Field Atlas</p>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight text-balance">
            Find Photography Spots Around You
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFindNearMe}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-100 bg-[#1A1F2B] hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LocateFixed className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <span>Find Near Me</span>
          </button>

          <div className="inline-flex items-center p-1 bg-[#141821] border border-zinc-800 rounded-lg">
            {[
              { label: 'Global', value: 0 },
              { label: '250 km', value: 250 },
              { label: '500 km', value: 500 },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRadiusKm(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  radiusKm === opt.value
                    ? 'bg-[#252D3D] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <aside className="lg:col-span-4 flex flex-col gap-4 border border-zinc-800 rounded-xl bg-[#141821] p-4 h-[620px]">
          {hasMapsKey ? (
            <PlacesSearchOverlay
              onSelectCoordinates={(lat, lng, label, viewport) => {
                setAnchorPoint({ lat, lng, label });
                setCameraFocus({ lat, lng, zoom: 9, viewport });
                setGeoStatus(`Sorted by proximity to ${label}`);
              }}
            />
          ) : (
            <div className="relative">
              <Search
                className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={localFilterQuery}
                onChange={(e) => setLocalFilterQuery(e.target.value)}
                placeholder="Filter spots by region or landmark..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#1A1F2B] border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {geoStatus && (
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 px-1">
              <span className="truncate">{geoStatus}</span>
              {anchorPoint && (
                <button
                  type="button"
                  onClick={() => {
                    setAnchorPoint(null);
                    setRadiusKm(0);
                    setGeoStatus('');
                  }}
                  className="text-blue-400 hover:underline shrink-0 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredSpots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <Compass className="w-7 h-7 mb-2 text-zinc-500" aria-hidden="true" />
                <p className="text-sm font-medium text-zinc-200">No spots within this radius</p>
                <p className="text-xs mt-1 text-zinc-400">
                  Switch to Global view or upload your own geotagged spot here.
                </p>
                <button
                  type="button"
                  onClick={() => setRadiusKm(0)}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-950/70 rounded-lg cursor-pointer"
                >
                  Show Global Spots
                </button>
              </div>
            ) : (
              filteredSpots.map(({ spot, distanceKm }) => {
                const isSelected = spot.id === selectedSpotId;
                const avg = computeAverageRating(spot.reviews);
                return (
                  <div
                    key={spot.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D2433] border-blue-500'
                        : 'bg-[#181D27] border-zinc-800 hover:border-zinc-600'
                    }`}
                    onClick={() => {
                      setSelectedSpotId(spot.id);
                      setCameraFocus({ lat: spot.lat, lng: spot.lng, zoom: 11 });
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-20 h-16 rounded-md overflow-hidden shrink-0 bg-zinc-900">
                        <ResilientPhoto
                          src={spot.coverUrl}
                          alt={spot.title}
                          titleFallback={spot.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                          <span className="truncate">{spot.country}</span>
                          {distanceKm !== null && (
                            <span className="font-mono tabular-nums text-blue-400 shrink-0">
                              {Math.round(distanceKm)} km
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-100 truncate mt-0.5">
                          {spot.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2 mt-1 text-xs text-zinc-400">
                          <span className="font-mono text-[11px] truncate">
                            {formatCoordinates(spot.lat, spot.lng)}
                          </span>
                          {avg > 0 && (
                            <span className="inline-flex items-center gap-1 text-zinc-200 tabular-nums shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                              {avg.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-zinc-700/70 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-300 truncate">
                          Best light: {spot.bestTimeToShoot}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSpot(spot);
                          }}
                          className="text-xs font-medium text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Open Gallery
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className="lg:col-span-8 h-[620px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative">
          {hasMapsKey ? (
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={
                selectedSpot
                  ? { lat: selectedSpot.lat, lng: selectedSpot.lng }
                  : { lat: 23.5, lng: 78.9 }
              }
              defaultZoom={4}
              gestureHandling="greedy"
              mapTypeControl={true}
              streetViewControl={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraSync focusTarget={cameraFocus} />
              {filteredSpots.map(({ spot }) => (
                <SpotMarker
                  key={spot.id}
                  spot={spot}
                  isSelected={spot.id === selectedSpotId}
                  onSelect={(s) => setSelectedSpotId(s.id)}
                  onOpenSpot={onOpenSpot}
                  onClose={() => setSelectedSpotId(null)}
                />
              ))}
            </Map>
          ) : (
            <div className="w-full h-full flex flex-col justify-between p-8 bg-[#141821]">
              <div>
                <p className="text-xs font-mono text-zinc-400 mb-2">Interactive Coordinate Atlas</p>
                <h3 className="font-editorial text-2xl font-semibold text-zinc-100">
                  Geotagged Photography Viewpoints
                </h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                  Select any spot card on the left to inspect its exact GPS coordinates, elevation,
                  light window, and community field reviews.
                </p>
              </div>

              {selectedSpot && (
                <div className="bg-[#1A1F2B] border border-zinc-700 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-center">
                  <div className="w-full sm:w-56 h-40 rounded-lg overflow-hidden shrink-0">
                    <ResilientPhoto
                      src={selectedSpot.coverUrl}
                      alt={selectedSpot.title}
                      titleFallback={selectedSpot.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-mono text-blue-400 mb-1">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{formatCoordinates(selectedSpot.lat, selectedSpot.lng)}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-zinc-100">{selectedSpot.title}</h4>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                      {selectedSpot.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenSpot(selectedSpot)}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Open Gallery &amp; Field Reviews
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
