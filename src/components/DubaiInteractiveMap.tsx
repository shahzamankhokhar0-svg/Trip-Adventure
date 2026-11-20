import React, { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';
import type { Attraction } from '../types.ts';

interface DubaiInteractiveMapProps {
  apiKey: string;
  attractions: Attraction[];
  selectedAttractionId?: string | null;
  onSelectAttraction?: (attraction: Attraction) => void;
  businessCenter?: { lat: number; lng: number; address: string; brandName: string };
  mode?: 'attractions' | 'contact';
  heightClass?: string;
}

interface AttractionMarkerProps {
  attraction: Attraction;
  isSelected: boolean;
  onSelect: (attraction: Attraction) => void;
  onCloseInfo: () => void;
}

const AttractionMarkerItem: React.FC<AttractionMarkerProps> = ({
  attraction,
  isSelected,
  onSelect,
  onCloseInfo,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: attraction.lat, lng: attraction.lng }}
        title={attraction.name}
        onClick={() => onSelect(attraction)}
      >
        <Pin
          background={isSelected ? '#0B0B0D' : '#C59B38'}
          borderColor={isSelected ? '#C59B38' : '#7C5D16'}
          glyphColor={isSelected ? '#C59B38' : '#0B0B0D'}
          scale={isSelected ? 1.25 : 1}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={260}>
          <div className="p-1 text-[#111114]">
            <h4 className="font-semibold text-sm text-[#111114]">{attraction.name}</h4>
            <p className="mt-1 text-xs text-neutral-600">{attraction.location}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">
              {attraction.shortIntro}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface OfficeMarkerProps {
  center: { lat: number; lng: number };
  brandName: string;
  address: string;
}

const OfficeMarkerItem: React.FC<OfficeMarkerProps> = ({ center, brandName, address }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={center}
        title={brandName}
        onClick={() => setOpen(true)}
      >
        <Pin background="#0B0B0D" borderColor="#C59B38" glyphColor="#C59B38" scale={1.25} />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} maxWidth={260}>
          <div className="p-1 text-[#111114]">
            <h4 className="font-semibold text-sm">{brandName}</h4>
            <p className="mt-1 text-xs text-neutral-600">{address}</p>
            <p className="mt-1 text-xs font-medium text-[#8B6816]">
              Personal Tour Guide Base · Dubai, UAE
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const MapCameraController: React.FC<{
  target: { lat: number; lng: number } | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (map && target) {
      map.panTo(target);
      map.setZoom(13);
    }
  }, [map, target]);

  return null;
};

const MapStatusFallback: React.FC<{
  center: { lat: number; lng: number };
  label: string;
}> = ({ center, label }) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#141417] p-6 text-center text-neutral-200">
        <MapPin className="h-8 w-8 text-[#C59B38]" />
        <p className="mt-3 text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-neutral-400">
          Interactive map preview unavailable. Open coordinates directly in Google Maps.
        </p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C59B38] px-4 py-2 text-xs font-semibold text-[#0B0B0D] hover:bg-[#D4AF37]"
        >
          <Navigation className="h-3.5 w-3.5" />
          Open in Google Maps
        </a>
      </div>
    );
  }

  return null;
};

export const DubaiInteractiveMap: React.FC<DubaiInteractiveMapProps> = ({
  apiKey,
  attractions,
  selectedAttractionId,
  onSelectAttraction,
  businessCenter = {
    lat: 25.1972,
    lng: 55.2744,
    address: 'Downtown Dubai, Dubai, United Arab Emirates',
    brandName: 'TRIP ADVENTURE',
  },
  mode = 'attractions',
  heightClass = 'h-[400px] md:h-[460px]',
}) => {
  const [activeId, setActiveId] = useState<string | null>(selectedAttractionId || null);

  useEffect(() => {
    if (selectedAttractionId !== undefined) {
      setActiveId(selectedAttractionId);
    }
  }, [selectedAttractionId]);

  const activeAttraction = attractions.find((a) => a.id === activeId) || null;
  const defaultCenter =
    mode === 'contact'
      ? { lat: businessCenter.lat, lng: businessCenter.lng }
      : { lat: 25.172, lng: 55.23 };

  const handleSelect = useCallback(
    (attr: Attraction) => {
      setActiveId(attr.id);
      onSelectAttraction?.(attr);
    },
    [onSelectAttraction]
  );

  if (!apiKey) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-[#141417] p-8 text-center text-white ${heightClass}`}
      >
        <MapPin className="h-9 w-9 text-[#C59B38]" />
        <h3 className="mt-3 font-display text-2xl font-semibold text-white">
          {mode === 'contact' ? businessCenter.brandName : 'Dubai Landmarks Map'}
        </h3>
        <p className="mt-2 max-w-md text-sm text-neutral-300">
          {mode === 'contact'
            ? businessCenter.address
            : 'Explore all 12 Dubai destinations across Downtown, Jumeirah, Palm Jumeirah, Marina, and Old Dubai.'}
        </p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${defaultCenter.lat},${defaultCenter.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#C59B38] px-5 py-2.5 text-xs font-semibold text-[#0B0B0D] hover:bg-[#D4AF37]"
        >
          <Navigation className="h-4 w-4" />
          Open Dubai Location in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417] ${heightClass}`}
    >
      <APIProvider apiKey={apiKey} libraries={['marker']} language="en" region="AE">
        <MapStatusFallback center={defaultCenter} label={businessCenter.address} />
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={defaultCenter}
          defaultZoom={mode === 'contact' ? 13 : 11}
          gestureHandling="cooperative"
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {mode === 'contact' ? (
            <OfficeMarkerItem
              center={{ lat: businessCenter.lat, lng: businessCenter.lng }}
              brandName={businessCenter.brandName}
              address={businessCenter.address}
            />
          ) : (
            <>
              <MapCameraController
                target={
                  activeAttraction
                    ? { lat: activeAttraction.lat, lng: activeAttraction.lng }
                    : null
                }
              />
              {attractions.map((attr) => (
                <AttractionMarkerItem
                  key={attr.id}
                  attraction={attr}
                  isSelected={attr.id === activeId}
                  onSelect={handleSelect}
                  onCloseInfo={() => setActiveId(null)}
                />
              ))}
            </>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
