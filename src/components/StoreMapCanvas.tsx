/// <reference types="google.maps" />
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ArrowUpRight, Check, MapPin, Navigation, Search } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { StoreSettings } from '../types';

interface StoreMapCanvasProps {
  settings: StoreSettings;
  onSelectDeliveryAddress: (address: string) => void;
}

interface ResolvedPlace {
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
}

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

interface InnerMapProps {
  settings: StoreSettings;
  onSelectDeliveryAddress: (address: string) => void;
}

function InnerMapContent({ settings, onSelectDeliveryAddress }: InnerMapProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const loadingStatus = useApiLoadingStatus();

  const [storePlace, setStorePlace] = useState<ResolvedPlace | null>(null);
  const [storeInfoOpen, setStoreInfoOpen] = useState(true);
  const [storeMarkerRef, storeMarker] = useAdvancedMarkerRef();

  // Delivery Drop-off Autocomplete State (Modern Places API New + Session Token)
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [dropoffPlace, setDropoffPlace] = useState<ResolvedPlace | null>(null);
  const [dropoffInfoOpen, setDropoffInfoOpen] = useState(false);
  const [dropoffMarkerRef, dropoffMarker] = useAdvancedMarkerRef();
  const [copiedSpot, setCopiedSpot] = useState(false);

  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const storeFetchedRef = useRef(false);

  // Locate Jl. Pamulang Permai 1 / Bundaran Tugu Pamulang via Places API (New) searchByText
  useEffect(() => {
    if (!placesLib || !map || storeFetchedRef.current) return;
    storeFetchedRef.current = true;

    const locateStoreArea = async () => {
      try {
        const { Place } = placesLib;
        const { places } = await Place.searchByText({
          textQuery: 'Bundaran Tugu Pamulang Jl. Pamulang Permai 1 Tangerang Selatan',
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
          maxResultCount: 1,
        });

        const match = places?.[0];
        if (match?.location) {
          const coords = match.location.toJSON();
          setStorePlace({
            name: settings.storeName,
            address: settings.addressNote || match.formattedAddress || '',
            location: coords,
          });
          map.panTo(coords);
          map.setZoom(16);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        } else {
          console.error('Places searchByText failed:', err);
        }
      }
    };

    void locateStoreArea();
  }, [placesLib, map, settings.storeName, settings.addressNote]);

  // Fetch Autocomplete Suggestions with AutocompleteSessionToken
  useEffect(() => {
    if (!placesLib) return;

    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current ?? undefined,
          includedRegionCodes: ['id'],
          locationBias: storePlace?.location,
        };
        const res =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled) {
          setSuggestions(res.suggestions ?? []);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        } else {
          console.error('AutocompleteSuggestion error:', err);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, searchInput, storePlace?.location]);

  const handleSuggestionSelect = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;

      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });

        // Reset session token immediately after fetchFields consumes it
        sessionTokenRef.current = null;
        setSuggestions([]);
        setSearchInput('');

        if (place.location) {
          const coords = place.location.toJSON();
          const resolved: ResolvedPlace = {
            name: place.displayName || 'Titik Antar Pilihan',
            address: place.formattedAddress || place.displayName || '',
            location: coords,
          };
          setDropoffPlace(resolved);
          setDropoffInfoOpen(true);
          setStoreInfoOpen(false);
          if (map) {
            map.panTo(coords);
            map.setZoom(16);
          }
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        } else {
          console.error('Place.fetchFields error:', err);
        }
      }
    },
    [placesLib, map]
  );

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    setSearchInput((e.target as HTMLInputElement).value);
  };

  const handleUseDropoff = () => {
    if (!dropoffPlace) return;
    onSelectDeliveryAddress(
      `${dropoffPlace.name} — ${dropoffPlace.address}`.slice(0, 180)
    );
    setCopiedSpot(true);
    setTimeout(() => setCopiedSpot(false), 2500);
  };

  if (
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-[#443A37] bg-[#332C29] p-6 text-center sm:h-[400px]">
        <MapPin className="h-8 w-8 text-[#E53E22]" aria-hidden="true" />
        <p className="mt-3 font-display text-base font-bold text-[#F6F2EC]">
          Peta Interaktif Tidak Dapat Dimuat
        </p>
        <p className="mt-1 max-w-sm text-xs text-[#C5BCB4]">
          Gunakan tombol di bawah untuk membuka lokasi langsung di aplikasi Google Maps.
        </p>
        <a
          href={settings.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#E53E22] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C93218]"
        >
          <span>Buka Google Maps</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Delivery Point Search using Places API (New) AutocompleteSuggestion */}
      <div className="relative">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A79E96]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchInput}
            onInput={handleInput}
            placeholder="Cari titik antar / gedung kampus / kos sekitar UNPAM..."
            aria-label="Cari titik pengantaran di peta Google Maps"
            className="h-11 w-full rounded-xl border border-[#443A37] bg-[#332C29] pl-10 pr-4 text-sm text-[#F6F2EC] placeholder:text-[#9A9088] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
          />
        </div>

        {(suggestions.length > 0 || searching) && (
          <div className="absolute left-0 right-0 top-12 z-20 max-h-60 overflow-y-auto rounded-xl border border-[#483E3A] bg-[#2B2523] shadow-2xl">
            {searching && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[#C5BCB4]">
                Mencari lokasi...
              </div>
            ) : (
              <ul className="divide-y divide-[#3F3633]">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-2.5 text-left text-xs text-[#F6F2EC] transition-colors hover:bg-[#38302D]"
                    >
                      <MapPin
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E53E22]"
                        aria-hidden="true"
                      />
                      <span>{suggestion.placePrediction?.text.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Interactive Google Map Container with Explicit Height (CF2) */}
      <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-[#443A37] bg-[#221D1C] sm:h-[400px]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={{ lat: 0, lng: 0 }}
          defaultZoom={2}
          gestureHandling="cooperative"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="h-full w-full"
        >
          {storePlace && (
            <>
              <AdvancedMarker
                ref={storeMarkerRef}
                position={storePlace.location}
                title={storePlace.name}
                onClick={() => setStoreInfoOpen((prev) => !prev)}
              >
                <Pin
                  background="#E53E22"
                  borderColor="#FFFFFF"
                  glyphColor="#FFFFFF"
                  scale={1.15}
                />
              </AdvancedMarker>

              {storeInfoOpen && storeMarker && (
                <InfoWindow
                  anchor={storeMarker}
                  maxWidth={240}
                  onCloseClick={() => setStoreInfoOpen(false)}
                >
                  <div className="p-1 text-slate-900">
                    <p className="text-xs font-bold">{storePlace.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {storePlace.address}
                    </p>
                    <a
                      href={settings.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E53E22] hover:underline"
                    >
                      <span>Buka Rute Google Maps</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {dropoffPlace && (
            <>
              <AdvancedMarker
                ref={dropoffMarkerRef}
                position={dropoffPlace.location}
                title={dropoffPlace.name}
                onClick={() => setDropoffInfoOpen((prev) => !prev)}
              >
                <Pin
                  background="#16A34A"
                  borderColor="#FFFFFF"
                  glyphColor="#FFFFFF"
                  scale={1.1}
                />
              </AdvancedMarker>

              {dropoffInfoOpen && dropoffMarker && (
                <InfoWindow
                  anchor={dropoffMarker}
                  maxWidth={240}
                  onCloseClick={() => setDropoffInfoOpen(false)}
                >
                  <div className="p-1 text-slate-900">
                    <p className="text-xs font-bold">Titik Antar Pilihan</p>
                    <p className="mt-0.5 text-[11px] font-medium">
                      {dropoffPlace.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {dropoffPlace.address}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </GoogleMap>
      </div>

      {/* Selected Dropoff Action Bar */}
      {dropoffPlace && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-400">
              Titik Antar Dipilih
            </p>
            <p className="truncate text-xs text-[#F6F2EC]">
              {dropoffPlace.name} · {dropoffPlace.address}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseDropoff}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#16A34A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#15803D] whitespace-nowrap shrink-0"
          >
            {copiedSpot ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Masuk ke Form Keranjang</span>
              </>
            ) : (
              <>
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pakai Titik Ini untuk Pesan WA</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function StoreMapCanvas({
  settings,
  onSelectDeliveryAddress,
}: StoreMapCanvasProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <div className="flex h-[340px] w-full flex-col items-center justify-center rounded-xl border border-[#443A37] bg-[#332C29] p-6 text-center sm:h-[400px]">
        <MapPin className="h-8 w-8 text-[#E53E22]" aria-hidden="true" />
        <p className="mt-3 font-display text-base font-bold text-[#F6F2EC]">
          Lokasi Dimsum Mentai 77 UNPAM
        </p>
        <p className="mt-1 max-w-sm text-xs text-[#C5BCB4]">
          {settings.addressNote}
        </p>
        <a
          href={settings.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#E53E22] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C93218]"
        >
          <span>Buka di Google Maps</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="id" region="ID" libraries={['places', 'marker']}>
      <InnerMapContent
        settings={settings}
        onSelectDeliveryAddress={onSelectDeliveryAddress}
      />
    </APIProvider>
  );
}
