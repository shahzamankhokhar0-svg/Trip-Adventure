import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Globe,
  Loader2,
  Monitor,
  MoreVertical,
  RotateCcw,
  Save,
  Search,
  Smartphone,
} from 'lucide-react';
import type { PublicPageKey, SeoPagesMap } from '../types.ts';

interface AdminSeoEditorProps {
  seoPages: SeoPagesMap;
  onChange: (next: SeoPagesMap) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  saving: boolean;
}

const PUBLIC_PAGES_META: Array<{
  key: PublicPageKey;
  label: string;
  path: string;
  sampleQuery: string;
  recommendedTitle: string;
  recommendedDescription: string;
}> = [
  {
    key: 'home',
    label: 'Homepage',
    path: '/',
    sampleQuery: 'Dubai personal tour guide TRIP ADVENTURE',
    recommendedTitle: 'TRIP ADVENTURE – Dubai Personal Tour Guide & Transfers',
    recommendedDescription:
      'Explore Dubai attractions, desert safaris, half-day & full-day private tours, and DXB airport transfers in AED with TRIP ADVENTURE.',
  },
  {
    key: 'tours',
    label: 'Tours, Safaris & Pricing',
    path: '/tours',
    sampleQuery: 'Dubai city tour desert safari AED prices',
    recommendedTitle: 'Dubai Tours, Desert Safaris & Transfers | TRIP ADVENTURE',
    recommendedDescription:
      'Browse half-day & full-day Dubai city tours, desert safaris from 120 AED, and DXB airport or inter-hotel transfers in UAE Dirhams.',
  },
  {
    key: 'about',
    label: 'About Us & Team',
    path: '/about',
    sampleQuery: 'Shahzaman Khokhar Usama Khokhar Abdul Qadir Khokhar Dubai guide',
    recommendedTitle: 'About TRIP ADVENTURE – Shahzaman, Usama Khokhar & Abdul Qadir Khokhar',
    recommendedDescription:
      'Meet Program Organizer Shahzaman Khokhar and Dubai tour guides Usama Khokhar & Abdul Qadir Khokhar guiding private city tours and desert safaris.',
  },
  {
    key: 'attractions',
    label: 'Dubai Attractions & Map',
    path: '/attractions',
    sampleQuery: 'Dubai landmarks map Burj Khalifa Palm Jumeirah',
    recommendedTitle: 'Dubai Attractions & Landmark Map | TRIP ADVENTURE',
    recommendedDescription:
      'Discover Burj Khalifa, Palm Jumeirah, Museum of the Future, and Old Dubai Creek on our interactive sightseeing landmark map.',
  },
  {
    key: 'gallery',
    label: 'Photo Gallery',
    path: '/gallery',
    sampleQuery: 'Dubai skyline desert safari photo gallery',
    recommendedTitle: 'Dubai Photography Gallery | TRIP ADVENTURE',
    recommendedDescription:
      'View real moments from Downtown Dubai, Arabian desert dunes, Palm Jumeirah, Dubai Marina, and Sheikh Zayed Grand Mosque tours.',
  },
  {
    key: 'reviews',
    label: 'Customer Reviews',
    path: '/reviews',
    sampleQuery: 'TRIP ADVENTURE Dubai tour reviews',
    recommendedTitle: 'Verified Guest Reviews | TRIP ADVENTURE Dubai',
    recommendedDescription:
      'Read verified reviews from guests who explored Dubai, desert safaris, and Abu Dhabi on private guided tours with TRIP ADVENTURE.',
  },
  {
    key: 'contact',
    label: 'Contact & WhatsApp',
    path: '/contact',
    sampleQuery: 'TRIP ADVENTURE Dubai WhatsApp contact',
    recommendedTitle: 'Contact & WhatsApp Desk | TRIP ADVENTURE Dubai',
    recommendedDescription:
      'Message Shahzaman Khokhar and our Dubai guides via WhatsApp, email, or our inquiry form to plan airport pickups and private tours.',
  },
  {
    key: 'book',
    label: 'Online Booking & Status',
    path: '/book',
    sampleQuery: 'Book Dubai tour online desert safari AED',
    recommendedTitle: 'Book Dubai Tours & Transfers Online | TRIP ADVENTURE',
    recommendedDescription:
      'Request Dubai city tours, private 4x4 desert safaris, or DXB airport transfers online and track your reservation status anytime.',
  },
];

function getLengthBadge(len: number, min: number, max: number): { label: string; style: string } {
  if (len >= min && len <= max) {
    return {
      label: `${len} chars · Optimal (${min}–${max})`,
      style: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    };
  }
  if (len > max) {
    return {
      label: `${len} chars · May truncate (> ${max})`,
      style: 'border-amber-200 bg-amber-50 text-amber-800',
    };
  }
  return {
    label: `${len} chars · Brief (< ${min})`,
    style: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  };
}

function truncateSerpText(text: string, limit: number): { display: string; truncated: boolean } {
  if (text.length <= limit) return { display: text, truncated: false };
  const slice = text.slice(0, limit - 1).trimEnd();
  return { display: `${slice}…`, truncated: true };
}

function highlightQueryTerms(text: string, query: string): React.ReactNode {
  const words = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/gi, ''))
        .filter((w) => w.length >= 3)
    )
  );
  if (words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const isMatch = words.some((w) => w === part.toLowerCase());
    return isMatch ? (
      <strong key={idx} className="font-semibold text-[#202124]">
        {part}
      </strong>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    );
  });
}

export const AdminSeoEditor: React.FC<AdminSeoEditorProps> = ({
  seoPages,
  onChange,
  onSave,
  saving,
}) => {
  const [selectedKey, setSelectedKey] = useState<PublicPageKey>('home');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');

  const updatePageField = (
    pageKey: PublicPageKey,
    field: 'title' | 'description',
    value: string
  ) => {
    const current = seoPages[pageKey] || { title: '', description: '' };
    onChange({
      ...seoPages,
      [pageKey]: {
        ...current,
        [field]: value,
      },
    });
  };

  const resetPageToRecommended = (pageMeta: (typeof PUBLIC_PAGES_META)[number]) => {
    onChange({
      ...seoPages,
      [pageMeta.key]: {
        title: pageMeta.recommendedTitle,
        description: pageMeta.recommendedDescription,
      },
    });
  };

  const siteOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://tripadventure.ae';
  const cleanDomain = siteOrigin.replace(/^https?:\/\//, '');

  const activePageMeta = useMemo(
    () => PUBLIC_PAGES_META.find((p) => p.key === selectedKey) || PUBLIC_PAGES_META[0],
    [selectedKey]
  );

  const activeEntry = seoPages[activePageMeta.key] || {
    title: activePageMeta.recommendedTitle,
    description: activePageMeta.recommendedDescription,
  };

  const activeQuery = customSearchQuery.trim() || activePageMeta.sampleQuery;
  const titleLimit = previewDevice === 'mobile' ? 52 : 60;
  const descLimit = previewDevice === 'mobile' ? 120 : 160;

  const previewTitle = truncateSerpText(
    activeEntry.title || activePageMeta.recommendedTitle,
    titleLimit
  );
  const previewDesc = truncateSerpText(
    activeEntry.description || activePageMeta.recommendedDescription,
    descLimit
  );

  const breadcrumbPath =
    activePageMeta.path === '/' ? cleanDomain : `${cleanDomain} › ${activePageMeta.path.slice(1)}`;

  const titleOptimal = activeEntry.title.length >= 30 && activeEntry.title.length <= 60;
  const descOptimal = activeEntry.description.length >= 120 && activeEntry.description.length <= 160;

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Header & Save Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">Search Engine Optimization (SEO)</p>
          <h2 className="mt-0.5 flex items-center gap-2 font-display text-2xl font-semibold text-[#111114]">
            <Search className="h-5 w-5 text-[#C59B38]" />
            Page Meta Titles, Descriptions &amp; Google SERP Preview
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Edit SEO tags for every public page and preview dynamically how they appear in Desktop and Mobile Google Search results.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
          ) : (
            <Save className="h-4 w-4 text-[#C59B38]" />
          )}
          <span>{saving ? 'Saving SEO Tags...' : 'Save All SEO Meta Tags'}</span>
        </button>
      </div>

      {/* LIVE MOCK GOOGLE SEARCH RESULT SIMULATOR */}
      <div className="rounded-2xl border border-[#C59B38]/35 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#8B6816]">
              <Eye className="h-3.5 w-3.5" />
              Live Google SERP Simulator
            </p>
            <h3 className="mt-0.5 font-display text-xl font-semibold text-[#111114]">
              Google Search Appearance Preview
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Device toggle */}
            <div className="inline-flex rounded-lg bg-neutral-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-[#0B0B0D] text-white'
                    : 'text-neutral-600 hover:text-[#111114]'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-[#0B0B0D] text-white'
                    : 'text-neutral-600 hover:text-[#111114]'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Page tabs for simulator */}
        <div className="flex flex-wrap gap-1.5">
          {PUBLIC_PAGES_META.map((p) => {
            const active = p.key === selectedKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setSelectedKey(p.key);
                  setCustomSearchQuery('');
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-[#0B0B0D] bg-[#0B0B0D] text-white'
                    : 'border-neutral-200 bg-[#FAF9F6] text-neutral-700 hover:border-[#C59B38]'
                }`}
              >
                <span>{p.label}</span>
                <span className="font-mono-num ml-1.5 opacity-70">{p.path}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Mock Google SERP Window */}
          <div className="lg:col-span-8">
            <div
              className={`rounded-2xl border border-neutral-200 bg-[#F8F9FA] p-4 sm:p-6 transition-all ${
                previewDevice === 'mobile' ? 'mx-auto max-w-[390px]' : 'w-full'
              }`}
            >
              {/* Mock Google Top Search Bar */}
              <div className="flex items-center gap-3 rounded-full border border-neutral-300 bg-white px-4 py-2 shadow-xs">
                <Search className="h-4 w-4 shrink-0 text-[#4285F4]" />
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  placeholder={activePageMeta.sampleQuery}
                  aria-label="Test Google search keywords highlight"
                  className="w-full bg-transparent text-xs text-[#202124] placeholder:text-neutral-500 focus:outline-none"
                />
                {customSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomSearchQuery('')}
                    className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="mt-3 flex gap-4 border-b border-neutral-200 px-1 pb-2 text-[11px] font-medium text-neutral-500">
                <span className="border-b-2 border-[#1a73e8] pb-1 font-semibold text-[#1a73e8]">
                  All
                </span>
                <span>Images</span>
                <span>Maps</span>
                <span>News</span>
              </div>

              {/* Simulated Google Result Card */}
              <div className="mt-4 rounded-xl bg-white p-4 shadow-xs border border-neutral-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B0B0D] font-display text-xs font-bold text-[#F5E4B8]">
                      TA
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#202124]">
                        TRIP ADVENTURE
                      </p>
                      <p className="truncate text-[11px] text-[#4d5156]">
                        https://{breadcrumbPath}
                      </p>
                    </div>
                  </div>
                  <MoreVertical className="h-4 w-4 shrink-0 text-neutral-400" />
                </div>

                <h4 className="mt-2 font-sans text-lg font-medium leading-snug text-[#1a0dab] hover:underline">
                  {previewTitle.display}
                </h4>

                <p className="mt-1 text-[13px] leading-relaxed text-[#4d5156]">
                  {highlightQueryTerms(previewDesc.display, activeQuery)}
                </p>

                {/* Optional Sitelinks preview for Homepage */}
                {activePageMeta.key === 'home' && previewDevice === 'desktop' && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-neutral-100 pt-3 text-xs">
                    <div>
                      <p className="font-medium text-[#1a0dab]">Tours &amp; AED Rates</p>
                      <p className="truncate text-[11px] text-[#4d5156]">
                        City tours, safaris &amp; transfers
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-[#1a0dab]">Book Your Tour Online</p>
                      <p className="truncate text-[11px] text-[#4d5156]">
                        Instant request &amp; status lookup
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time SEO Diagnostics Checklist */}
          <div className="lg:col-span-4 rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#8B6816]">
                Diagnostics · {activePageMeta.label}
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">
                Live feedback updates as you type in the card below.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2 rounded-lg bg-white p-3 border border-neutral-200">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    titleOptimal ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <div>
                  <p className="font-semibold text-[#111114]">
                    Meta Title ({activeEntry.title.length} chars)
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    {previewTitle.truncated
                      ? `Truncates with "…" on ${previewDevice} (> ${titleLimit} chars). Shorten for full visibility.`
                      : titleOptimal
                        ? 'Fits cleanly in Google Desktop & Mobile results.'
                        : 'Aim for 30–60 characters with primary Dubai tour keywords.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-white p-3 border border-neutral-200">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    descOptimal ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <div>
                  <p className="font-semibold text-[#111114]">
                    Meta Description ({activeEntry.description.length} chars)
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    {previewDesc.truncated
                      ? `Truncates with "…" on ${previewDevice} (> ${descLimit} chars). Keep key info early.`
                      : descOptimal
                        ? 'Optimal summary length (120–160 chars) for higher click-through.'
                        : 'Aim for 120–160 characters summarizing services and CTA.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => resetPageToRecommended(activePageMeta)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#8B6816]" />
                Reset {activePageMeta.label} to Recommended
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Per-page SEO Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {PUBLIC_PAGES_META.map((pageMeta) => {
          const entry = seoPages[pageMeta.key] || {
            title: pageMeta.recommendedTitle,
            description: pageMeta.recommendedDescription,
          };
          const titleBadge = getLengthBadge(entry.title.length, 30, 60);
          const descBadge = getLengthBadge(entry.description.length, 120, 160);
          const isSelected = selectedKey === pageMeta.key;

          return (
            <div
              key={pageMeta.key}
              className={`rounded-2xl border bg-white p-6 space-y-4 transition-colors ${
                isSelected ? 'border-[#C59B38] ring-1 ring-[#C59B38]/30' : 'border-neutral-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num rounded-md bg-[#0B0B0D] px-2.5 py-1 text-[11px] font-semibold text-[#F5E4B8]">
                    {pageMeta.path}
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#111114]">
                    {pageMeta.label}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedKey(pageMeta.key)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      isSelected
                        ? 'bg-[#0B0B0D] text-[#F5E4B8]'
                        : 'border border-neutral-200 bg-white text-neutral-700 hover:border-[#C59B38]'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    {isSelected ? 'In Simulator' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPageToRecommended(pageMeta)}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:border-[#C59B38]"
                  >
                    <RotateCcw className="h-3 w-3 text-[#8B6816]" />
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`seo-title-${pageMeta.key}`}
                    className="text-xs font-semibold text-neutral-700"
                  >
                    Meta Title *
                  </label>
                  <span
                    className={`font-mono-num rounded-md border px-2 py-0.5 text-[10px] font-semibold ${titleBadge.style}`}
                  >
                    {titleBadge.label}
                  </span>
                </div>
                <input
                  id={`seo-title-${pageMeta.key}`}
                  type="text"
                  required
                  maxLength={120}
                  onFocus={() => setSelectedKey(pageMeta.key)}
                  value={entry.title}
                  onChange={(e) => {
                    setSelectedKey(pageMeta.key);
                    updatePageField(pageMeta.key, 'title', e.target.value);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor={`seo-desc-${pageMeta.key}`}
                    className="text-xs font-semibold text-neutral-700"
                  >
                    Meta Description *
                  </label>
                  <span
                    className={`font-mono-num rounded-md border px-2 py-0.5 text-[10px] font-semibold ${descBadge.style}`}
                  >
                    {descBadge.label}
                  </span>
                </div>
                <textarea
                  id={`seo-desc-${pageMeta.key}`}
                  rows={3}
                  required
                  maxLength={320}
                  onFocus={() => setSelectedKey(pageMeta.key)}
                  value={entry.description}
                  onChange={(e) => {
                    setSelectedKey(pageMeta.key);
                    updatePageField(pageMeta.key, 'description', e.target.value);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs leading-relaxed text-neutral-700 focus:border-[#C59B38] focus:outline-none"
                />
              </div>

              {/* Inline Google Search Result Snippet Preview */}
              <div className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  <Globe className="h-3 w-3 text-[#8B6816]" />
                  Google Snippet Preview
                </p>
                <p className="truncate text-[11px] text-emerald-800">
                  https://{pageMeta.path === '/' ? cleanDomain : `${cleanDomain} › ${pageMeta.path.slice(1)}`}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-medium text-[#1a0dab]">
                  {truncateSerpText(entry.title || pageMeta.recommendedTitle, 60).display}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#4d5156]">
                  {truncateSerpText(entry.description || pageMeta.recommendedDescription, 160).display}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
          ) : (
            <Save className="h-4 w-4 text-[#C59B38]" />
          )}
          <span>{saving ? 'Saving SEO Tags...' : 'Save All SEO Meta Tags'}</span>
        </button>
      </div>
    </form>
  );
};
