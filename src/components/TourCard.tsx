import React from 'react';
import { ArrowUpRight, Camera, Clock, MessageCircle } from 'lucide-react';
import type { TourPackage } from '../types.ts';
import { buildWhatsAppUrl } from '../lib/whatsapp.ts';
import { getTourPricingDisplay } from '../lib/currency.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import { SafeImage } from './SafeImage.tsx';

interface TourCardProps {
  tour: TourPackage;
  whatsappNumber: string;
  onViewDetails: (tour: TourPackage) => void;
  onBookOnline: (tour: TourPackage) => void;
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  whatsappNumber,
  onViewDetails,
  onBookOnline,
}) => {
  const { currency, formatText, t } = usePreferences();

  const pricing = getTourPricingDisplay(tour, currency);

  const isTransfer =
    tour.category === 'Airport Transfers' || tour.category === 'Inter-Hotel Transfers';

  const whatsappHref = buildWhatsAppUrl(whatsappNumber, {
    tourTitle: tour.title,
  });

  const extraPhotos = Array.isArray(tour.galleryImages)
    ? tour.galleryImages.filter((u) => u && u !== tour.imageUrl)
    : [];
  const totalPhotos = 1 + extraPhotos.length;
  const isBottomFramedPhoto =
    tour.imageUrl.includes('8.53.30_AM') || tour.imageUrl.includes('8.53.31_AM');

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white transition-colors duration-200 hover:border-[#C59B38]/60">
      <button
        type="button"
        onClick={() => onViewDetails(tour)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#141417] text-left focus-visible:outline-2 focus-visible:outline-[#C59B38]"
      >
        <SafeImage
          src={tour.imageUrl}
          alt={`${tour.title} – TRIP ADVENTURE Dubai`}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            isBottomFramedPhoto ? 'object-bottom' : 'object-center'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        {totalPhotos > 1 && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
            <Camera className="h-3 w-3 text-[#C59B38]" />
            <span className="font-mono-num">{totalPhotos} HD</span>
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
          <span className="font-mono-num text-xs font-semibold text-[#F5E4B8]">
            {pricing.fromLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
            <Clock className="h-3.5 w-3.5 text-[#C59B38]" />
            {tour.duration}
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-[#8B6816]">
          <span>{tour.category}</span>
          <span aria-hidden="true">·</span>
          <span className="text-neutral-500">
            {isTransfer ? 'Private Transfer' : 'Guided Service'}
          </span>
        </div>

        <h3 className="mt-2 font-display text-2xl font-semibold leading-tight text-[#111114]">
          <button
            type="button"
            onClick={() => onViewDetails(tour)}
            className="text-left hover:text-[#8B6816] transition-colors"
          >
            {tour.title}
          </button>
        </h3>

        {(pricing.hasRange || pricing.isVariablePricing || tour.priceNote) && (
          <div className="mt-2.5 rounded-lg border border-neutral-200/80 bg-[#FAF9F6] px-3 py-2">
            {pricing.hasRange && pricing.priceRange ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-medium text-neutral-600">
                  Price range
                </span>
                <span className="font-mono-num text-xs font-semibold text-[#111114]">
                  {pricing.priceRange}
                </span>
              </div>
            ) : pricing.isVariablePricing ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-medium text-neutral-600">
                  {pricing.rateTypeLabel}
                </span>
                <span className="font-mono-num text-xs font-semibold text-[#111114]">
                  {pricing.fromLabel}
                </span>
              </div>
            ) : null}
            {tour.priceNote && (
              <p
                className={`font-mono-num text-xs font-semibold text-[#8B6816] ${
                  pricing.hasRange || pricing.isVariablePricing ? 'mt-0.5' : ''
                }`}
              >
                {formatText(tour.priceNote)}
              </p>
            )}
          </div>
        )}

        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {tour.description}
        </p>

        <div className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
          <p className="line-clamp-1">{tour.pickupInfo}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onBookOnline(tour)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B0B0D] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1F1F25] whitespace-nowrap min-h-[42px]"
          >
            {t.sections.bookOnlineBtn}
            <ArrowUpRight className="h-3.5 w-3.5 text-[#C59B38]" />
          </button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6] whitespace-nowrap min-h-[42px]"
          >
            <MessageCircle className="h-3.5 w-3.5 text-[#15803D]" />
            {t.sections.whatsAppShort}
          </a>
          <button
            type="button"
            onClick={() => onViewDetails(tour)}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-semibold text-[#8B6816] hover:bg-[#C59B38]/10 whitespace-nowrap min-h-[42px]"
          >
            {t.sections.itineraryBtn}
          </button>
        </div>
      </div>
    </article>
  );
};
