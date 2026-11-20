import React, { useState } from 'react';
import { ArrowUpRight, Compass, MapPin, X } from 'lucide-react';
import type { Attraction, TourPackage } from '../types.ts';
import { DubaiInteractiveMap } from './DubaiInteractiveMap.tsx';
import { SafeImage } from './SafeImage.tsx';

interface AttractionsSectionProps {
  attractions: Attraction[];
  tours: TourPackage[];
  mapsApiKey: string;
  onSelectTourName: (tourTitle: string) => void;
}

export const AttractionsSection: React.FC<AttractionsSectionProps> = ({
  attractions,
  mapsApiKey,
  onSelectTourName,
}) => {
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(attractions[0]?.id || null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">Destination Discovery</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
            Iconic Dubai Attractions
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Explore 12 signature landmarks across Downtown Dubai, the coastline, and historic Dubai Creek. Select any marker or card to view facts and recommended private tours.
          </p>
        </div>
        <span className="font-mono-num text-xs font-medium text-neutral-500">
          {attractions.length} Featured Landmarks
        </span>
      </div>

      <DubaiInteractiveMap
        apiKey={mapsApiKey}
        attractions={attractions}
        selectedAttractionId={focusedId}
        onSelectAttraction={(attr) => setFocusedId(attr.id)}
        mode="attractions"
        heightClass="h-[400px] md:h-[460px]"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {attractions.map((attr) => {
          const isFocused = attr.id === focusedId;
          return (
            <article
              key={attr.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-colors duration-200 ${
                isFocused
                  ? 'border-[#C59B38]'
                  : 'border-neutral-200/90 hover:border-[#C59B38]/60'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setFocusedId(attr.id);
                  setSelectedAttraction(attr);
                }}
                className="relative aspect-[4/3] w-full overflow-hidden bg-[#141417] text-left"
              >
                <SafeImage
                  src={attr.imageUrl}
                  alt={`${attr.name} in Dubai`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs text-white/90">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#C59B38]" />
                    <span className="truncate">{attr.location}</span>
                  </span>
                </div>
              </button>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl font-semibold text-[#111114]">
                  {attr.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">
                  {attr.shortIntro}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setFocusedId(attr.id)}
                    className="text-xs font-semibold text-neutral-600 hover:text-[#111114]"
                  >
                    Locate on Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAttraction(attr)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B6816] hover:text-[#111114]"
                  >
                    Facts &amp; Tours
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selectedAttraction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attraction-modal-title"
          onClick={() => setSelectedAttraction(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/8] w-full bg-[#111114]">
              <SafeImage
                src={selectedAttraction.imageUrl}
                alt={selectedAttraction.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <button
                type="button"
                onClick={() => setSelectedAttraction(null)}
                aria-label="Close attraction details"
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute bottom-5 left-6 right-6 text-white">
                <p className="inline-flex items-center gap-1.5 text-xs text-[#F5E4B8]">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedAttraction.location}
                </p>
                <h3
                  id="attraction-modal-title"
                  className="mt-1 font-display text-3xl font-semibold sm:text-4xl"
                >
                  {selectedAttraction.name}
                </h3>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h4 className="font-display text-2xl font-semibold text-[#111114]">
                  About This Landmark
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {selectedAttraction.description}
                </p>
              </div>

              {selectedAttraction.facts.length > 0 && (
                <div className="border-t border-neutral-200 pt-5">
                  <h4 className="font-display text-xl font-semibold text-[#111114]">
                    Interesting Facts
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {selectedAttraction.facts.map((fact, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-700">
                        <Compass className="mt-0.5 h-4 w-4 shrink-0 text-[#C59B38]" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAttraction.recommendedTours.length > 0 && (
                <div className="border-t border-neutral-200 pt-5">
                  <h4 className="font-display text-xl font-semibold text-[#111114]">
                    Recommended Tours
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAttraction.recommendedTours.map((tourName) => (
                      <button
                        key={tourName}
                        type="button"
                        onClick={() => {
                          setSelectedAttraction(null);
                          onSelectTourName(tourName);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-[#FAF9F6] px-4 py-2 text-xs font-semibold text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-white"
                      >
                        {tourName}
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#8B6816]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
