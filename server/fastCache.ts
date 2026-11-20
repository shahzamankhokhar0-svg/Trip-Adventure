import crypto from 'crypto';
import zlib from 'zlib';
import type { DataStore } from './store.ts';
import type {
  AdminAnalyticsData,
  BookingTrendPoint,
  CachePerformanceStats,
  CategoryBreakdownStat,
  PopularTourStat,
} from '../src/types.ts';

interface SerializedSnapshot {
  json: string;
  rawBuffer: Buffer;
  gzipBuffer: Buffer;
  etag: string;
  builtAt: string;
}

let bootstrapSnapshot: SerializedSnapshot | null = null;
let toursSnapshot: SerializedSnapshot | null = null;
let cacheHits = 0;
let cacheMisses = 0;
let lastBuildMs = 0;
let lastRebuiltAt: string | null = null;

function createSnapshot(payload: unknown): SerializedSnapshot {
  const start = performance.now();
  const json = JSON.stringify(payload);
  const rawBuffer = Buffer.from(json, 'utf8');
  const gzipBuffer = zlib.gzipSync(rawBuffer, { level: zlib.constants.Z_BEST_SPEED });
  const hash = crypto.createHash('sha1').update(rawBuffer).digest('hex').slice(0, 16);
  const etag = `"ta-${hash}"`;
  const builtAt = new Date().toISOString();
  lastBuildMs = Number((performance.now() - start).toFixed(2));
  lastRebuiltAt = builtAt;
  return { json, rawBuffer, gzipBuffer, etag, builtAt };
}

export function invalidateFastCache(): void {
  bootstrapSnapshot = null;
  toursSnapshot = null;
}

export function getFastBootstrapSnapshot(
  store: DataStore,
  mapsApiKey: string
): { snapshot: SerializedSnapshot; cacheStatus: 'HIT-MEM' | 'MISS-BUILT' } {
  if (bootstrapSnapshot) {
    cacheHits += 1;
    return { snapshot: bootstrapSnapshot, cacheStatus: 'HIT-MEM' };
  }

  cacheMisses += 1;
  const payload = {
    tours: [...store.tours].sort((a, b) => a.sortOrder - b.sortOrder),
    attractions: store.attractions,
    reviews: store.reviews.filter((r) => r.status === 'approved'),
    gallery: store.gallery,
    settings: store.settings,
    cms: store.cms,
    mapsApiKey,
  };
  bootstrapSnapshot = createSnapshot(payload);
  return { snapshot: bootstrapSnapshot, cacheStatus: 'MISS-BUILT' };
}

export function getFastToursSnapshot(
  store: DataStore
): { snapshot: SerializedSnapshot; cacheStatus: 'HIT-MEM' | 'MISS-BUILT' } {
  if (toursSnapshot) {
    cacheHits += 1;
    return { snapshot: toursSnapshot, cacheStatus: 'HIT-MEM' };
  }

  cacheMisses += 1;
  const sortedTours = [...store.tours].sort((a, b) => a.sortOrder - b.sortOrder);
  toursSnapshot = createSnapshot({
    count: sortedTours.length,
    tours: sortedTours,
  });
  return { snapshot: toursSnapshot, cacheStatus: 'MISS-BUILT' };
}

export function getFastCacheStats(): CachePerformanceStats {
  const totalReq = cacheHits + cacheMisses;
  const hitRatioPercent = totalReq > 0 ? Math.round((cacheHits / totalReq) * 100) : 100;
  const rawBytes = bootstrapSnapshot?.rawBuffer.length ?? 0;
  const gzipBytes = bootstrapSnapshot?.gzipBuffer.length ?? 0;
  const savingsPercent =
    rawBytes > 0 ? Math.max(0, Math.round(((rawBytes - gzipBytes) / rawBytes) * 100)) : 0;

  return {
    cached: Boolean(bootstrapSnapshot),
    cacheHits,
    cacheMisses,
    hitRatioPercent,
    rawBytes,
    gzipBytes,
    savingsPercent,
    lastBuildMs,
    lastRebuiltAt,
    etag: bootstrapSnapshot?.etag ?? null,
  };
}

function formatDayLabel(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatMonthLabel(yearMonth: string): string {
  const dt = new Date(`${yearMonth}-01T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return yearMonth;
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function buildAdminAnalytics(
  store: DataStore,
  range: '14d' | '30d' | 'monthly' = '14d'
): AdminAnalyticsData {
  const bookings = store.bookings || [];
  const tours = store.tours || [];
  const tourById = new Map(tours.map((t) => [t.id, t]));

  // Summary metrics
  let totalGuests = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let pendingBookings = 0;
  let rejectedBookings = 0;
  let estimatedConfirmedRevenueAed = 0;

  for (const b of bookings) {
    const pax = (Number(b.adults) || 0) + (Number(b.children) || 0);
    totalGuests += pax;
    if (b.status === 'confirmed' || b.status === 'completed') {
      if (b.status === 'completed') completedBookings += 1;
      else confirmedBookings += 1;
      const tour = tourById.get(b.tourId);
      if (tour && typeof tour.startingPriceAed === 'number' && tour.startingPriceAed > 0) {
        estimatedConfirmedRevenueAed += tour.startingPriceAed;
      }
    } else if (b.status === 'rejected') {
      rejectedBookings += 1;
    } else {
      pendingBookings += 1;
    }
  }

  const approvedTotal = confirmedBookings + completedBookings;
  const decided = approvedTotal + rejectedBookings;
  const approvalRatePercent =
    decided > 0 ? Math.round((approvedTotal / decided) * 100) : 0;

  // Booking trends over time
  const bookingTrends: BookingTrendPoint[] = [];
  const now = new Date();

  if (range === 'monthly') {
    const monthsMap = new Map<string, BookingTrendPoint>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, {
        date: key,
        label: formatMonthLabel(key),
        total: 0,
        confirmed: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
        guests: 0,
      });
    }

    for (const b of bookings) {
      const srcDate = (b.createdAt || b.travelDate || '').slice(0, 7);
      if (!srcDate) continue;
      if (!monthsMap.has(srcDate)) {
        monthsMap.set(srcDate, {
          date: srcDate,
          label: formatMonthLabel(srcDate),
          total: 0,
          confirmed: 0,
          completed: 0,
          pending: 0,
          rejected: 0,
          guests: 0,
        });
      }
      const pt = monthsMap.get(srcDate)!;
      pt.total += 1;
      pt.guests += (Number(b.adults) || 0) + (Number(b.children) || 0);
      if (b.status === 'confirmed') pt.confirmed += 1;
      else if (b.status === 'completed') pt.completed += 1;
      else if (b.status === 'rejected') pt.rejected += 1;
      else pt.pending += 1;
    }

    const sortedKeys = Array.from(monthsMap.keys()).sort();
    for (const k of sortedKeys) {
      bookingTrends.push(monthsMap.get(k)!);
    }
  } else {
    const daysCount = range === '30d' ? 30 : 14;
    const daysMap = new Map<string, BookingTrendPoint>();
    for (let i = daysCount - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const key = d.toISOString().slice(0, 10);
      daysMap.set(key, {
        date: key,
        label: formatDayLabel(key),
        total: 0,
        confirmed: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
        guests: 0,
      });
    }

    for (const b of bookings) {
      const key = (b.createdAt || b.travelDate || '').slice(0, 10);
      if (!key) continue;
      const pt = daysMap.get(key);
      if (pt) {
        pt.total += 1;
        pt.guests += (Number(b.adults) || 0) + (Number(b.children) || 0);
        if (b.status === 'confirmed') pt.confirmed += 1;
        else if (b.status === 'completed') pt.completed += 1;
        else if (b.status === 'rejected') pt.rejected += 1;
        else pt.pending += 1;
      }
    }

    for (const pt of daysMap.values()) {
      bookingTrends.push(pt);
    }
  }

  // Most Popular Tour Packages
  const tourStatsMap = new Map<string, PopularTourStat>();
  for (const tour of tours) {
    tourStatsMap.set(tour.id, {
      tourId: tour.id,
      tourTitle: tour.title,
      category: tour.category,
      bookingsCount: 0,
      confirmedCount: 0,
      totalGuests: 0,
      estimatedRevenueAed: 0,
      startingPriceAed: tour.startingPriceAed,
    });
  }

  for (const b of bookings) {
    const existing = tourStatsMap.get(b.tourId) || {
      tourId: b.tourId,
      tourTitle: b.tourTitle,
      category: 'Custom Package',
      bookingsCount: 0,
      confirmedCount: 0,
      totalGuests: 0,
      estimatedRevenueAed: 0,
      startingPriceAed: null,
    };
    const pax = (Number(b.adults) || 0) + (Number(b.children) || 0);
    existing.bookingsCount += 1;
    existing.totalGuests += pax;
    if (b.status === 'confirmed' || b.status === 'completed') {
      existing.confirmedCount += 1;
      if (typeof existing.startingPriceAed === 'number' && existing.startingPriceAed > 0) {
        existing.estimatedRevenueAed += existing.startingPriceAed;
      }
    }
    tourStatsMap.set(b.tourId, existing);
  }

  const popularTours = Array.from(tourStatsMap.values()).sort((a, b) => {
    if (b.bookingsCount !== a.bookingsCount) return b.bookingsCount - a.bookingsCount;
    if (b.totalGuests !== a.totalGuests) return b.totalGuests - a.totalGuests;
    const priceA = a.startingPriceAed ?? 0;
    const priceB = b.startingPriceAed ?? 0;
    return priceB - priceA;
  });

  // Category Breakdown
  const catMap = new Map<string, CategoryBreakdownStat>();
  for (const tour of tours) {
    const entry = catMap.get(tour.category) || {
      category: tour.category,
      toursCount: 0,
      bookingsCount: 0,
      guestsCount: 0,
    };
    entry.toursCount += 1;
    catMap.set(tour.category, entry);
  }

  for (const b of bookings) {
    const tour = tourById.get(b.tourId);
    const cat = tour?.category || 'Custom Package';
    const entry = catMap.get(cat) || {
      category: cat,
      toursCount: 0,
      bookingsCount: 0,
      guestsCount: 0,
    };
    entry.bookingsCount += 1;
    entry.guestsCount += (Number(b.adults) || 0) + (Number(b.children) || 0);
    catMap.set(cat, entry);
  }

  const categoryBreakdown = Array.from(catMap.values()).sort(
    (a, b) => b.bookingsCount - a.bookingsCount || b.toursCount - a.toursCount
  );

  return {
    range,
    summary: {
      totalBookings: bookings.length,
      totalGuests,
      confirmedBookings,
      completedBookings,
      pendingBookings,
      rejectedBookings,
      approvalRatePercent,
      estimatedConfirmedRevenueAed,
    },
    bookingTrends,
    popularTours,
    categoryBreakdown,
    cachePerformance: getFastCacheStats(),
  };
}
