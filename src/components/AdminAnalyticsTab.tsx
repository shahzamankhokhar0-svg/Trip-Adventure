import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Compass,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminAnalyticsData } from '../types.ts';

interface AdminAnalyticsTabProps {
  onShowToast?: (msg: string) => void;
}

const STATUS_COLORS = {
  confirmed: '#15803D',
  completed: '#1E3A8A',
  pending: '#D97706',
  rejected: '#B91C1C',
};

const GOLD_PALETTE = [
  '#C59B38',
  '#0B0B0D',
  '#15803D',
  '#8B6816',
  '#374151',
  '#B45309',
  '#1E3A8A',
  '#6B7280',
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function truncateLabel(text: string, maxLen = 24): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ onShowToast }) => {
  const [range, setRange] = useState<'14d' | '30d' | 'monthly'>('14d');
  const [trendMetric, setTrendMetric] = useState<'bookings' | 'guests'>('bookings');
  const [tourChartMode, setTourChartMode] = useState<'bookings' | 'pricing'>('bookings');
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (selectedRange: '14d' | '30d' | 'monthly') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load analytics.');
      }
      setAnalytics(data as AdminAnalyticsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(range);
  }, [fetchAnalytics, range]);

  // Auto-switch popular tours chart to Pricing overview when bookings count is 0, while keeping Bookings option selectable
  useEffect(() => {
    if (analytics && analytics.summary.totalBookings === 0) {
      setTourChartMode('pricing');
    } else if (analytics && analytics.summary.totalBookings > 0) {
      setTourChartMode('bookings');
    }
  }, [analytics?.summary.totalBookings]);

  const handleWarmCache = async () => {
    setRefreshingCache(true);
    try {
      const res = await fetch('/api/admin/cache/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.cache) {
        setAnalytics((prev) => (prev ? { ...prev, cachePerformance: data.cache } : prev));
        onShowToast?.('Fast API memory & gzip cache refreshed.');
      }
    } finally {
      setRefreshingCache(false);
    }
  };

  const popularToursChartData = useMemo(() => {
    if (!analytics) return [];
    const list =
      tourChartMode === 'pricing'
        ? [...analytics.popularTours]
            .filter((t) => typeof t.startingPriceAed === 'number' && t.startingPriceAed > 0)
            .sort((a, b) => (b.startingPriceAed ?? 0) - (a.startingPriceAed ?? 0))
        : analytics.popularTours;

    return list.slice(0, 8).map((item) => ({
      ...item,
      shortName: truncateLabel(item.tourTitle, 26),
      priceValue: item.startingPriceAed ?? 0,
    }));
  }, [analytics, tourChartMode]);

  const statusDonutData = useMemo(() => {
    if (!analytics) return [];
    const { confirmedBookings, completedBookings, pendingBookings, rejectedBookings } =
      analytics.summary;
    return [
      { name: 'Confirmed', value: confirmedBookings, color: STATUS_COLORS.confirmed },
      { name: 'Completed', value: completedBookings, color: STATUS_COLORS.completed },
      { name: 'Pending', value: pendingBookings, color: STATUS_COLORS.pending },
      { name: 'Rejected', value: rejectedBookings, color: STATUS_COLORS.rejected },
    ].filter((d) => d.value > 0);
  }, [analytics]);

  if (loading && !analytics) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
        <div className="flex flex-col items-center gap-3 text-neutral-600">
          <Loader2 className="h-7 w-7 animate-spin text-[#C59B38]" />
          <p className="text-xs font-medium">Loading booking trends &amp; package analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || 'Unable to load analytics.'}
      </div>
    );
  }

  const { summary, bookingTrends, categoryBreakdown, cachePerformance } = analytics;

  return (
    <div className="space-y-6">
      {/* HEADER & TIMEFRAME CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">Data Visualization &amp; Speed</p>
          <h2 className="mt-0.5 flex items-center gap-2 font-display text-2xl font-semibold text-[#111114]">
            <BarChart3 className="h-5 w-5 text-[#C59B38]" />
            Booking Trends, Popular Packages &amp; Fast API Telemetry
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-neutral-100 p-1">
            {(
              [
                { id: '14d', label: '14 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'monthly', label: 'Monthly' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === opt.id
                    ? 'bg-[#0B0B0D] text-white'
                    : 'text-neutral-600 hover:text-[#111114]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(range)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-500">Total Bookings</p>
            <TrendingUp className="h-4 w-4 text-[#C59B38]" />
          </div>
          <p className="font-mono-num mt-2 text-3xl font-semibold text-[#111114]">
            {summary.totalBookings}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {summary.pendingBookings} pending · {summary.confirmedBookings} confirmed ·{' '}
            {summary.completedBookings} completed
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-500">Total Guests Requested</p>
            <Users className="h-4 w-4 text-[#C59B38]" />
          </div>
          <p className="font-mono-num mt-2 text-3xl font-semibold text-[#111114]">
            {summary.totalGuests}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Adults &amp; children combined</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-500">Confirmation Rate</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="font-mono-num mt-2 text-3xl font-semibold text-emerald-800">
            {summary.approvalRatePercent}%
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Confirmed out of reviewed bookings
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-[#0B0B0D] p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-300">Est. Confirmed Value</p>
            <Compass className="h-4 w-4 text-[#C59B38]" />
          </div>
          <p className="font-mono-num mt-2 text-3xl font-semibold text-[#F5E4B8]">
            {summary.estimatedConfirmedRevenueAed.toLocaleString()} AED
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Based on starting AED package rates
          </p>
        </div>
      </div>

      {/* MAIN CHARTS ROW: BOOKING TRENDS + MOST POPULAR TOUR PACKAGES */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* CHART 1: BOOKING TRENDS OVER TIME */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#111114]">
                Booking Trends Over Time
              </h3>
              <p className="text-xs text-neutral-500">
                Chronological request volume by status ({range === 'monthly' ? 'monthly' : `last ${range === '30d' ? '30' : '14'} days`})
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-[#FAF9F6] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTrendMetric('bookings')}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  trendMetric === 'bookings' ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600'
                }`}
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('guests')}
                className={`rounded-md px-2.5 py-1 font-semibold ${
                  trendMetric === 'guests' ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600'
                }`}
              >
                Guests
              </button>
            </div>
          </div>

          {summary.totalBookings === 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs text-amber-900">
              No customer bookings recorded yet — live trend lines below update automatically as soon as guests submit booking requests.
            </div>
          )}

          <div className="mt-5 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrends} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C59B38" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#C59B38" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803D" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#15803D" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="amberFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {trendMetric === 'guests' ? (
                  <Area
                    type="monotone"
                    dataKey="guests"
                    name="Guests Booked"
                    stroke="#C59B38"
                    strokeWidth={2.5}
                    fill="url(#goldFill)"
                  />
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="confirmed"
                      name="Confirmed"
                      stroke="#15803D"
                      strokeWidth={2}
                      fill="url(#emeraldFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      name="Pending"
                      stroke="#D97706"
                      strokeWidth={2}
                      fill="url(#amberFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Requests"
                      stroke="#0B0B0D"
                      strokeWidth={2}
                      fill="url(#goldFill)"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: MOST POPULAR TOUR PACKAGES */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#111114]">
                Most Popular Tour Packages
              </h3>
              <p className="text-xs text-neutral-500">
                {tourChartMode === 'bookings'
                  ? 'Top packages ranked by booking requests'
                  : 'Top packages ranked by AED rate (0 bookings so far)'}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-neutral-200 bg-[#FAF9F6] p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setTourChartMode('bookings')}
                className={`rounded-md px-2 py-1 font-semibold ${
                  tourChartMode === 'bookings' ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600'
                }`}
              >
                By Bookings
              </button>
              <button
                type="button"
                onClick={() => setTourChartMode('pricing')}
                className={`rounded-md px-2 py-1 font-semibold ${
                  tourChartMode === 'pricing' ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600'
                }`}
              >
                By AED Rate
              </button>
            </div>
          </div>

          <div className="mt-5 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={popularToursChartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={135}
                  tick={{ fontSize: 11, fill: '#111114' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '12px',
                  }}
                />
                {tourChartMode === 'bookings' ? (
                  <Bar
                    dataKey="bookingsCount"
                    name="Bookings"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {popularToursChartData.map((entry, idx) => (
                      <Cell key={entry.tourId} fill={GOLD_PALETTE[idx % GOLD_PALETTE.length]} />
                    ))}
                  </Bar>
                ) : (
                  <Bar
                    dataKey="priceValue"
                    name="Starting Price (AED)"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                  >
                    {popularToursChartData.map((entry, idx) => (
                      <Cell key={entry.tourId} fill={GOLD_PALETTE[idx % GOLD_PALETTE.length]} />
                    ))}
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECOND ROW: STATUS DONUT, CATEGORY BREAKDOWN & FAST API MONITOR */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* STATUS BREAKDOWN */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-4">
          <h3 className="font-display text-xl font-semibold text-[#111114]">
            Booking Status Breakdown
          </h3>
          <p className="text-xs text-neutral-500">Confirmed vs Pending vs Rejected requests</p>

          {statusDonutData.length === 0 ? (
            <div className="mt-6 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-[#FAF9F6] p-4 text-center text-xs text-neutral-500">
              <Activity className="mb-2 h-5 w-5 text-[#C59B38]" />
              Awaiting your first guest booking request to populate status ratios.
            </div>
          ) : (
            <div className="mt-4 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDonutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {statusDonutData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CATEGORY CATALOG & DEMAND */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-4">
          <h3 className="font-display text-xl font-semibold text-[#111114]">
            Categories &amp; Catalog Mix
          </h3>
          <p className="text-xs text-neutral-500">Tours &amp; transfers distribution by category</p>

          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryBreakdown}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#4B5563' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip />
                <Bar dataKey="toursCount" name="Packages" fill="#0B0B0D" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="bookingsCount"
                  name="Bookings"
                  fill="#C59B38"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FAST API SPEED & CACHE TELEMETRY */}
        <div className="rounded-2xl border border-[#C59B38]/35 bg-[#0B0B0D] p-6 text-white lg:col-span-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#C59B38]">
                <Zap className="h-3.5 w-3.5" />
                High-Speed API Engine Active
              </p>
              <h3 className="mt-1 font-display text-xl font-semibold">
                Fast Bootstrap &amp; Asset Cache
              </h3>
            </div>
            <button
              type="button"
              onClick={handleWarmCache}
              disabled={refreshingCache}
              className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:border-[#C59B38] disabled:opacity-60"
            >
              {refreshingCache ? 'Warming...' : 'Warm Cache'}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-neutral-400">RAM Hit Ratio</p>
              <p className="font-mono-num mt-1 text-lg font-semibold text-emerald-400">
                {cachePerformance.hitRatioPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-neutral-400">Gzip Size Saved</p>
              <p className="font-mono-num mt-1 text-lg font-semibold text-[#F5E4B8]">
                {cachePerformance.savingsPercent}%
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-neutral-400">Payload Compression</p>
              <p className="font-mono-num mt-1 text-xs font-semibold text-white">
                {formatBytes(cachePerformance.rawBytes)} &rarr;{' '}
                {formatBytes(cachePerformance.gzipBytes)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-neutral-400">RAM Build Speed</p>
              <p className="font-mono-num mt-1 text-xs font-semibold text-white">
                {cachePerformance.lastBuildMs} ms
              </p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
            Active Endpoints:{' '}
            <span className="font-mono-num text-neutral-200">/api/fast/bootstrap</span>,{' '}
            <span className="font-mono-num text-neutral-200">/api/fast/tours</span>, ETag 304,
            Gzip &amp; 30-day immutable image caching.
          </p>
        </div>
      </div>

      {/* PACKAGE POPULARITY TABLE */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="font-display text-xl font-semibold text-[#111114]">
          Tour Package Demand Summary
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="py-2.5 pr-4 font-semibold">Tour / Transfer Package</th>
                <th className="py-2.5 pr-4 font-semibold">Category</th>
                <th className="py-2.5 pr-4 font-semibold">Starting AED</th>
                <th className="py-2.5 pr-4 font-semibold">Bookings</th>
                <th className="py-2.5 pr-4 font-semibold">Confirmed</th>
                <th className="py-2.5 font-semibold">Total Guests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {analytics.popularTours.slice(0, 10).map((row) => (
                <tr key={row.tourId} className="hover:bg-[#FAF9F6]">
                  <td className="py-2.5 pr-4 font-semibold text-[#111114]">{row.tourTitle}</td>
                  <td className="py-2.5 pr-4 text-neutral-600">{row.category}</td>
                  <td className="font-mono-num py-2.5 pr-4 text-neutral-800">
                    {row.startingPriceAed !== null ? `${row.startingPriceAed} AED` : 'Quote'}
                  </td>
                  <td className="font-mono-num py-2.5 pr-4 font-semibold text-[#8B6816]">
                    {row.bookingsCount}
                  </td>
                  <td className="font-mono-num py-2.5 pr-4 text-emerald-800">
                    {row.confirmedCount}
                  </td>
                  <td className="font-mono-num py-2.5 text-neutral-700">{row.totalGuests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
