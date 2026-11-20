import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import type { GalleryItem } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface GallerySectionProps {
  gallery: GalleryItem[];
}

function getGalleryFocalClass(imageUrl: string): string {
  if (imageUrl.includes('8.53.30_AM') || imageUrl.includes('8.53.31_AM')) {
    return 'object-bottom';
  }
  if (
    imageUrl.includes('8.20.10_AM') ||
    imageUrl.includes('10.06.42_AM') ||
    imageUrl.includes('10.20.26_AM') ||
    imageUrl.includes('10.25.24_AM') ||
    imageUrl.includes('9.33.24_AM') ||
    imageUrl.includes('9.33.25_AM') ||
    imageUrl.includes('9.33.18_AM') ||
    imageUrl.includes('9.33.08_AM_7effb360')
  ) {
    return 'object-top';
  }
  return 'object-center';
}

export const GallerySection: React.FC<GallerySectionProps> = ({ gallery }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(gallery.map((g) => g.category)));
    return ['All', ...unique];
  }, [gallery]);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return gallery;
    return gallery.filter((g) => g.category === selectedCategory);
  }, [gallery, selectedCategory]);

  const activeLightboxIdx = lightboxItem
    ? filtered.findIndex((g) => g.id === lightboxItem.id)
    : -1;

  const stepLightbox = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (filtered.length <= 1 || activeLightboxIdx === -1) return;
    const nextIdx = (activeLightboxIdx + delta + filtered.length) % filtered.length;
    setLightboxItem(filtered[nextIdx]);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">Visual Showcase · Full HD</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
            Dubai &amp; UAE Photo Gallery
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Browse real Full HD guest tour moments alongside Dubai’s skyline, Arabian desert dunes, Palm Jumeirah overlooks, Marina waterfront, and Abu Dhabi highlights.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100 p-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#0B0B0D] text-white'
                : 'text-neutral-600 hover:text-[#111114]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightboxItem(item)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417] text-left focus-visible:outline-2 focus-visible:outline-[#C59B38]"
          >
            <SafeImage
              src={item.imageUrl}
              alt={item.title}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${getGalleryFocalClass(
                item.imageUrl
              )}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
            <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </div>
            <div className="absolute bottom-3.5 left-4 right-4 text-white">
              <p className="text-[11px] font-medium text-[#F5E4B8]">{item.category}</p>
              <h3 className="mt-0.5 text-sm font-semibold leading-snug">{item.title}</h3>
            </div>
          </button>
        ))}
      </div>

      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0B0B0D] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              aria-label="Close image preview"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex min-h-[45vh] max-h-[75vh] w-full items-center justify-center bg-black p-2">
              <SafeImage
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain"
              />
              {filtered.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => stepLightbox(-1, e)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => stepLightbox(1, e)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-5">
              <div>
                <p className="text-xs font-medium text-[#C59B38]">{lightboxItem.category}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{lightboxItem.title}</h3>
                {lightboxItem.caption && (
                  <p className="mt-1 text-sm text-neutral-300">{lightboxItem.caption}</p>
                )}
              </div>
              {filtered.length > 1 && activeLightboxIdx !== -1 && (
                <span className="font-mono-num text-xs text-neutral-400">
                  {activeLightboxIdx + 1} / {filtered.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
