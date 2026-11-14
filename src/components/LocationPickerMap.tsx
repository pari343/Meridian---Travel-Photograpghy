import { useEffect, useState } from 'react';
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import { formatCoordinates } from '../lib/geo';

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  hasMapsKey: boolean;
  onChange: (coords: { lat: number; lng: number; locationHint?: string }) => void;
}

function PickerCameraSync({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  hasMapsKey,
  onChange,
}: LocationPickerMapProps) {
  const [searchText, setSearchText] = useState('');
  const { suggestions, selectSuggestion } = usePlacesAutocomplete(searchText);

  if (!hasMapsKey) {
    return (
      <div className="p-4 border border-zinc-800 rounded-lg bg-[#141821] text-xs text-zinc-400">
        Enter exact decimal latitude and longitude coordinates below or upload a JPEG with embedded GPS EXIF data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search photography location to drop pin..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-[#141821] border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full bg-[#1A1F2B] border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-zinc-800">
            {suggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={async () => {
                    const place = await selectSuggestion(s);
                    if (place) {
                      setSearchText(place.name);
                      onChange({
                        lat: Number(place.lat.toFixed(5)),
                        lng: Number(place.lng.toFixed(5)),
                        locationHint: place.formattedAddress || place.name,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-800 cursor-pointer"
                >
                  <span className="font-medium text-zinc-100 block truncate">
                    {s.placePrediction?.text.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="w-full h-56 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat, lng }}
          defaultZoom={5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          streetViewControl={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          onClick={(e) => {
            if (e.detail.latLng) {
              onChange({
                lat: Number(e.detail.latLng.lat.toFixed(5)),
                lng: Number(e.detail.latLng.lng.toFixed(5)),
              });
            }
          }}
        >
          <PickerCameraSync lat={lat} lng={lng} />
          <AdvancedMarker position={{ lat, lng }} />
        </Map>
      </div>
      <p className="text-xs font-mono text-zinc-400">
        Click anywhere on the map to refine pin: {formatCoordinates(lat, lng)}
      </p>
    </div>
  );
}
