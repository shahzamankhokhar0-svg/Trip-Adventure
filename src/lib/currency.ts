export type CurrencyCode = 'AED' | 'USD';

// Official UAE Dirham to US Dollar peg (1 USD = 3.6725 AED)
export const AED_PER_USD = 3.6725;

export function convertAedToUsd(amountAed: number): number {
  return Math.round(amountAed / AED_PER_USD);
}

export function formatPriceAmount(amountAed: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    return `$${convertAedToUsd(amountAed).toLocaleString()} USD`;
  }
  return `${amountAed.toLocaleString()} AED`;
}

export function formatStartingPrice(
  amountAed: number | null,
  fallbackNote: string,
  currency: CurrencyCode,
  prefix = 'From'
): string {
  if (amountAed !== null) {
    if (currency === 'USD') {
      return `${prefix} $${convertAedToUsd(amountAed).toLocaleString()} USD`;
    }
    return `${prefix} AED ${amountAed.toLocaleString()}`;
  }
  return formatPriceText(fallbackNote || `Custom Quote (${currency})`, currency);
}

export function formatPriceText(text: string, currency: CurrencyCode): string {
  if (!text || currency === 'AED') return text;

  return text
    .replace(/\bAED\s+(\d[\d,]*)/gi, (_match, numStr: string) => {
      const n = Number(numStr.replace(/,/g, ''));
      if (!Number.isFinite(n)) return _match;
      return `$${convertAedToUsd(n).toLocaleString()} USD`;
    })
    .replace(/(\d[\d,]*)\s*AED\b/gi, (_match, numStr: string) => {
      const n = Number(numStr.replace(/,/g, ''));
      if (!Number.isFinite(n)) return _match;
      return `$${convertAedToUsd(n).toLocaleString()} USD`;
    });
}

export interface TourPricingInput {
  startingPriceAed: number | null;
  priceNote: string;
  bookingOptions: string[];
}

export interface TourPricingDisplay {
  minAed: number | null;
  maxAed: number | null;
  hasRange: boolean;
  isVariablePricing: boolean;
  priceRange: string | null;
  fromLabel: string;
  modalHeadline: string;
  rateTypeLabel: string;
}

function extractAedAmounts(text: string): number[] {
  if (!text) return [];
  const matches: number[] = [];
  const patterns = [/\bAED\s+(\d[\d,]*)/gi, /(\d[\d,]*)\s*AED\b/gi];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const n = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0) {
        matches.push(n);
      }
    }
  }
  return matches;
}

export function formatPriceRange(
  minAed: number,
  maxAed: number,
  currency: CurrencyCode
): string {
  if (currency === 'USD') {
    const minUsd = convertAedToUsd(minAed).toLocaleString();
    const maxUsd = convertAedToUsd(maxAed).toLocaleString();
    return minUsd === maxUsd ? `$${minUsd} USD` : `$${minUsd} – $${maxUsd} USD`;
  }
  return minAed === maxAed
    ? `${minAed.toLocaleString()} AED`
    : `${minAed.toLocaleString()} – ${maxAed.toLocaleString()} AED`;
}

export function getTourPricingDisplay(
  tour: TourPricingInput,
  currency: CurrencyCode
): TourPricingDisplay {
  const collected = [
    ...(tour.startingPriceAed !== null && tour.startingPriceAed > 0
      ? [tour.startingPriceAed]
      : []),
    ...extractAedAmounts(tour.priceNote),
    ...tour.bookingOptions.flatMap((opt) => extractAedAmounts(opt)),
  ];

  const minAed = collected.length > 0 ? Math.min(...collected) : null;
  const maxAed = collected.length > 0 ? Math.max(...collected) : null;
  const hasRange = minAed !== null && maxAed !== null && maxAed > minAed;
  const hasCustomOption = tour.bookingOptions.some((opt) =>
    /custom|quote|tailor/i.test(opt)
  );
  const isVariablePricing = hasRange || (minAed !== null && hasCustomOption);

  if (minAed === null) {
    const fallback = tour.priceNote
      ? formatPriceText(tour.priceNote, currency)
      : 'Custom quote upon inquiry';
    return {
      minAed: null,
      maxAed: null,
      hasRange: false,
      isVariablePricing: true,
      priceRange: null,
      fromLabel: tour.priceNote ? formatPriceText(tour.priceNote, currency) : 'Custom Quote',
      modalHeadline: fallback,
      rateTypeLabel: 'Custom Quote',
    };
  }

  const formattedMin = formatPriceAmount(minAed, currency);
  const priceRange =
    hasRange && maxAed !== null ? formatPriceRange(minAed, maxAed, currency) : null;

  return {
    minAed,
    maxAed,
    hasRange,
    isVariablePricing,
    priceRange,
    fromLabel: isVariablePricing ? `From ${formattedMin}` : formattedMin,
    modalHeadline: isVariablePricing ? `Starting from ${formattedMin}` : formattedMin,
    rateTypeLabel: hasRange
      ? 'Variable Pricing'
      : isVariablePricing
        ? 'From Base Rate'
        : 'Fixed Rate',
  };
}

