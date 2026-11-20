import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Maximize2,
  MessageCircle,
  Minus,
  X,
} from 'lucide-react';
import type { TourPackage } from '../types.ts';
import { buildWhatsAppUrl } from '../lib/whatsapp.ts';
import { getTourPricingDisplay } from '../lib/currency.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import { SafeImage } from './SafeImage.tsx';

interface TourDetailModalProps {
  tour: TourPackage | null;
  whatsappNumber: string;
  onClose: () => void;
  onBookOnline: (tour: TourPackage) => void;
}

function getFocalClass(src: string): string {
  if (src.includes('8.53.30_AM') || src.includes('8.53.31_AM')) return 'object-bottom';
  return 'object-center';
}

export const TourDetailModal: React.FC<TourDetailModalProps> = ({
  tour,
  whatsappNumber,
  onClose,
  onBookOnline,
}) => {
  const { currency, formatText } = usePreferences();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [fullHdOpen, setFullHdOpen] = useState(false);

  const photos = useMemo(() => {
    if (!tour) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const url of [tour.imageUrl, ...(tour.galleryImages || [])]) {
      if (url && !seen.has(url)) {
        seen.add(url);
        list.push(url);
      }
    }
    return list;
  }, [tour]);

  useEffect(() => {
    setActivePhotoIndex(0);
    setFullHdOpen(false);
  }, [tour?.id]);

  if (!tour) return null;

  const pricing = getTourPricingDisplay(tour, currency);
  const safeIndex = photos.length > 0 ? activePhotoIndex % photos.length : 0;
  const activePhotoUrl = photos[safeIndex] || tour.imageUrl;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length <= 1) return;
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-detail-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#111114]">
          <SafeImage
            src={activePhotoUrl}
            alt={`${tour.title} – Full HD Photo ${safeIndex + 1}`}
            className={`h-full w-full object-cover transition-all duration-300 ${getFocalClass(
              activePhotoUrl
            )}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/25" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullHdOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black"
            >
              <Maximize2 className="h-3.5 w-3.5 text-[#C59B38]" />
              <span>View Full HD</span>
              {photos.length > 1 && (
                <span className="font-mono-num text-[#F5E4B8]">
                  ({safeIndex + 1}/{photos.length})
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour details"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous tour photo"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next tour photo"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="pointer-events-none absolute bottom-5 left-6 right-6 text-white">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#F5E4B8]">
              <span>{tour.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {tour.duration}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {pricing.hasRange && pricing.priceRange
                  ? `${pricing.fromLabel} (${pricing.priceRange})`
                  : pricing.modalHeadline}
              </span>
            </div>
            <h2
              id="tour-detail-title"
              className="mt-1.5 font-display text-3xl font-semibold sm:text-4xl"
            >
              {tour.title}
            </h2>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="border-b border-neutral-200 bg-[#FAF9F6] px-6 py-3">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#8B6816]">
                <Camera className="h-3.5 w-3.5" />
                Full HD Tour Photos ({photos.length})
              </span>
              <button
                type="button"
                onClick={() => setFullHdOpen(true)}
                className="font-semibold text-[#111114] hover:text-[#8B6816]"
              >
                Expand Fullscreen →
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {photos.map((imgUrl, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`Select photo ${idx + 1}`}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-[#111114] transition-all ${
                      isActive
                        ? 'border-[#C59B38] ring-2 ring-[#C59B38]/30'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={`${tour.title} thumbnail ${idx + 1}`}
                      className={`h-full w-full object-cover ${getFocalClass(imgUrl)}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-8 p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <h3 className="font-display text-2xl font-semibold text-[#111114]">
                Tour Overview
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-700">
                {tour.description}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#8B6816]">
                  Pricing &amp; Availability
                </p>
                <span className="text-[11px] font-medium text-neutral-500">
                  {pricing.rateTypeLabel}
                </span>
              </div>

              {pricing.hasRange && pricing.priceRange ? (
                <>
                  <p className="mt-1.5 font-mono-num text-base font-semibold text-[#111114]">
                    {pricing.priceRange}
                  </p>
                  <p className="mt-0.5 font-mono-num text-xs font-medium text-neutral-700">
                    {pricing.modalHeadline} · varies by tier &amp; option
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1.5 font-mono-num text-base font-semibold text-[#111114]">
                    {pricing.modalHeadline}
                  </p>
                  {pricing.isVariablePricing && (
                    <p className="mt-0.5 text-xs font-medium text-neutral-700">
                      Final price varies with custom itinerary options
                    </p>
                  )}
                </>
              )}

              {tour.priceNote && (
                <p className="font-mono-num mt-1.5 text-xs font-semibold text-[#8B6816]">
                  {formatText(tour.priceNote)}
                </p>
              )}
              <p className="mt-1.5 text-xs text-neutral-600">{tour.availabilityNote}</p>
              <div className="mt-4 border-t border-neutral-200 pt-3">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-700">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8B6816]" />
                  <span>{tour.pickupInfo}</span>
                </p>
              </div>
            </div>
          </div>

          {tour.itinerary.length > 0 && (
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="font-display text-2xl font-semibold text-[#111114]">
                Tour Itinerary
              </h3>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {tour.itinerary.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-neutral-200/80 bg-[#FAF9F6] p-3.5 text-sm text-neutral-800"
                  >
                    <span className="font-mono-num flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0B0B0D] text-xs font-semibold text-[#C59B38]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid gap-6 border-t border-neutral-200 pt-6 md:grid-cols-2">
            <div>
              <h4 className="font-display text-xl font-semibold text-[#111114]">
                Included Services
              </h4>
              <ul className="mt-3 space-y-2">
                {tour.included.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{formatText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-display text-xl font-semibold text-[#111114]">
                Excluded Services
              </h4>
              <ul className="mt-3 space-y-2">
                {tour.excluded.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    <span>{formatText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {tour.bookingOptions.length > 0 && (
            <div className="border-t border-neutral-200 pt-6">
              <p className="text-xs font-semibold text-neutral-500">Available Booking Options</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#111114]">
                {tour.bookingOptions.map((opt, idx) => (
                  <React.Fragment key={opt}>
                    {idx > 0 && <span aria-hidden="true" className="text-neutral-400">·</span>}
                    <span className="font-medium">{formatText(opt)}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 pt-6">
            <a
              href={buildWhatsAppUrl(whatsappNumber, { tourTitle: tour.title })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6]"
            >
              <MessageCircle className="h-4 w-4 text-[#15803D]" />
              Book on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                onClose();
                onBookOnline(tour);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E1E24]"
            >
              Request Online Booking
            </button>
          </div>
        </div>
      </div>

      {fullHdOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            setFullHdOpen(false);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFullHdOpen(false);
            }}
            aria-label="Close Full HD photo viewer"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative flex max-h-[90vh] max-w-6xl flex-col items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={activePhotoUrl}
              alt={`${tour.title} – Full HD View (${safeIndex + 1})`}
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            {photos.length > 1 && (
              <div className="flex items-center gap-4 text-xs text-neutral-300">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="font-mono-num">
                  {safeIndex + 1} / {photos.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/20"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
