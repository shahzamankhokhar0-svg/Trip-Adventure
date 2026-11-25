import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Compass,
  Globe,
  Home,
  Loader2,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Shield,
  Star,
  Ticket,
  X,
} from 'lucide-react';
import type { PublicBootstrapData, TourPackage } from './types.ts';
import { buildWhatsAppUrl } from './lib/whatsapp.ts';
import { usePreferences } from './context/PreferencesContext.tsx';
import type { LanguageCode } from './lib/i18n.ts';
import { SafeImage } from './components/SafeImage.tsx';
import { TourCard } from './components/TourCard.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { FooterNewsletter } from './components/FooterNewsletter.tsx';
import { STATIC_BOOTSTRAP_DATA } from './data/staticCatalog.ts';

const TourDetailModal = lazy(() =>
  import('./components/TourDetailModal.tsx').then((m) => ({ default: m.TourDetailModal }))
);
const BookingSection = lazy(() =>
  import('./components/BookingSection.tsx').then((m) => ({ default: m.BookingSection }))
);
const AttractionsSection = lazy(() =>
  import('./components/AttractionsSection.tsx').then((m) => ({ default: m.AttractionsSection }))
);
const GallerySection = lazy(() =>
  import('./components/GallerySection.tsx').then((m) => ({ default: m.GallerySection }))
);
const ReviewsSection = lazy(() =>
  import('./components/ReviewsSection.tsx').then((m) => ({ default: m.ReviewsSection }))
);
const AboutSection = lazy(() =>
  import('./components/AboutSection.tsx').then((m) => ({ default: m.AboutSection }))
);
const ContactSection = lazy(() =>
  import('./components/ContactSection.tsx').then((m) => ({ default: m.ContactSection }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard.tsx').then((m) => ({ default: m.AdminDashboard }))
);
const AchievementsTripsSection = lazy(() =>
  import('./components/AchievementsTripsSection.tsx').then((m) => ({
    default: m.AchievementsTripsSection,
  }))
);
const TeamSpotlightSection = lazy(() =>
  import('./components/TeamSpotlightSection.tsx').then((m) => ({
    default: m.TeamSpotlightSection,
  }))
);

const BOOTSTRAP_CACHE_KEY = 'ta_fast_bootstrap_v1';

function readCachedBootstrap(): PublicBootstrapData | null {
  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicBootstrapData;
    if (parsed && Array.isArray(parsed.tours) && parsed.settings) {
      if (Array.isArray(parsed.gallery)) {
        parsed.gallery = parsed.gallery.filter(
          (item) =>
            item.id !== 'gal-usama-marina-night' &&
            !item.id.startsWith('gal-organizer')
        );
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedBootstrap(payload: PublicBootstrapData): void {
  try {
    window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

type PageRoute =
  | 'home'
  | 'about'
  | 'tours'
  | 'attractions'
  | 'gallery'
  | 'reviews'
  | 'contact'
  | 'book'
  | 'admin';

const ROUTE_TO_PATH: Record<PageRoute, string> = {
  home: '/',
  about: '/about',
  tours: '/tours',
  attractions: '/attractions',
  gallery: '/gallery',
  reviews: '/reviews',
  contact: '/contact',
  book: '/book',
  admin: '/admin',
};

const DEFAULT_PAGE_SEO: Record<PageRoute, { title: string; description: string }> = {
  home: {
    title: 'TRIP ADVENTURE – Dubai Personal Tour Guide & Transfers',
    description:
      'Explore Dubai attractions, desert safaris, half-day & full-day private tours, and DXB airport transfers in AED with TRIP ADVENTURE.',
  },
  about: {
    title: 'About TRIP ADVENTURE – Shahzaman, Usama Khokhar & Abdul Qadir Khokhar',
    description:
      'Meet Program Organizer Shahzaman Khokhar and Dubai tour guides Usama Khokhar & Abdul Qadir Khokhar guiding private city tours and desert safaris.',
  },
  tours: {
    title: 'Dubai Tours, Desert Safaris & Transfers | TRIP ADVENTURE',
    description:
      'Browse half-day & full-day Dubai city tours, desert safaris from 120 AED, and DXB airport or inter-hotel transfers in UAE Dirhams.',
  },
  attractions: {
    title: 'Dubai Attractions & Landmark Map | TRIP ADVENTURE',
    description:
      'Discover Burj Khalifa, Palm Jumeirah, Museum of the Future, and Old Dubai Creek on our interactive sightseeing landmark map.',
  },
  gallery: {
    title: 'Dubai Photography Gallery | TRIP ADVENTURE',
    description:
      'View real moments from Downtown Dubai, Arabian desert dunes, Palm Jumeirah, Dubai Marina, and Sheikh Zayed Grand Mosque tours.',
  },
  reviews: {
    title: 'Verified Guest Reviews | TRIP ADVENTURE Dubai',
    description:
      'Read verified reviews from guests who explored Dubai, desert safaris, and Abu Dhabi on private guided tours with TRIP ADVENTURE.',
  },
  contact: {
    title: 'Contact & WhatsApp Desk | TRIP ADVENTURE Dubai',
    description:
      'Message Shahzaman Khokhar and our Dubai guides via WhatsApp, email, or our inquiry form to plan airport pickups and private tours.',
  },
  book: {
    title: 'Book Dubai Tours & Transfers Online | TRIP ADVENTURE',
    description:
      'Request Dubai city tours, private 4x4 desert safaris, or DXB airport transfers online and track your reservation status anytime.',
  },
  admin: {
    title: 'Admin Console | TRIP ADVENTURE',
    description: 'Authorized administrator dashboard for managing TRIP ADVENTURE content, tours, bookings, and SEO.',
  },
};

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string): void {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function parseRouteFromPath(pathname: string): PageRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/about') return 'about';
  if (clean === '/tours' || clean.startsWith('/tours/')) return 'tours';
  if (clean === '/attractions') return 'attractions';
  if (clean === '/gallery') return 'gallery';
  if (clean === '/reviews') return 'reviews';
  if (clean === '/contact') return 'contact';
  if (clean === '/book') return 'book';
  if (clean === '/admin') return 'admin';
  return 'home';
}

export default function App() {
  const { currency, setCurrency, language, setLanguage, t, formatAmount, formatText } =
    usePreferences();
  const [route, setRoute] = useState<PageRoute>(() =>
    parseRouteFromPath(window.location.pathname)
  );
  const [data, setData] = useState<PublicBootstrapData>(
    () => readCachedBootstrap() || STATIC_BOOTSTRAP_DATA
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTourModal, setSelectedTourModal] = useState<TourPackage | null>(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/tours/')) {
      const slug = pathname.replace('/tours/', '').replace(/\/+$/, '');
      const seed = readCachedBootstrap() || STATIC_BOOTSTRAP_DATA;
      return seed.tours.find((tourItem) => tourItem.slug === slug) || null;
    }
    return null;
  });
  const [preselectedTourId, setPreselectedTourId] = useState<string | null>(null);
  const [bookingInitialTab, setBookingInitialTab] = useState<'book' | 'status'>('book');
  const [tourCategoryFilter, setTourCategoryFilter] = useState('All');
  const [tourSearchQuery, setTourSearchQuery] = useState('');

  const fetchBootstrap = useCallback(async (forceFresh = false) => {
    try {
      const res = await fetch('/api/fast/bootstrap', forceFresh ? { cache: 'reload' } : undefined);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const payload = (await res.json()) as PublicBootstrapData;
      if (payload && Array.isArray(payload.tours) && payload.tours.length > 0 && payload.settings) {
        setData(payload);
        writeCachedBootstrap(payload);

        // Support deep linking /tours/:slug
        const pathname = window.location.pathname;
        if (pathname.startsWith('/tours/')) {
          const slug = pathname.replace('/tours/', '').replace(/\/+$/, '');
          const match = payload.tours.find((tourItem) => tourItem.slug === slug);
          if (match) setSelectedTourModal(match);
        }
      }
    } catch {
      // Static hardcoded catalog remains active offline / without backend APIs
    }
  }, []);

  useEffect(() => {
    fetchBootstrap(false);
  }, [fetchBootstrap]);

  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const seoEntry =
      route !== 'admin' ? data?.cms?.seoPages?.[route] || DEFAULT_PAGE_SEO[route] : DEFAULT_PAGE_SEO.admin;
    const baseTitle = seoEntry.title || DEFAULT_PAGE_SEO[route].title;
    const baseDescription = seoEntry.description || DEFAULT_PAGE_SEO[route].description;
    const brandName = data?.settings?.brandName || 'TRIP ADVENTURE';
    const title = selectedTourModal
      ? `${selectedTourModal.title} | ${brandName}`
      : baseTitle;
    const description = selectedTourModal
      ? selectedTourModal.description.slice(0, 160)
      : baseDescription;
    const rawImage = selectedTourModal?.imageUrl || data?.cms?.heroBannerUrl || '';
    const ogImage = rawImage
      ? rawImage.startsWith('http')
        ? rawImage
        : `${window.location.origin}${rawImage}`
      : '';
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    document.title = title;
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:site_name', brandName);
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    if (ogImage) {
      upsertMetaTag('property', 'og:image', ogImage);
    }
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertCanonicalLink(canonicalUrl);
  }, [route, data?.cms?.seoPages, data?.cms?.heroBannerUrl, data?.settings?.brandName, selectedTourModal]);

  const navigateTo = useCallback((nextRoute: PageRoute, customPath?: string) => {
    setRoute(nextRoute);
    setMobileMenuOpen(false);
    const targetPath = customPath || ROUTE_TO_PATH[nextRoute];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBookTour = useCallback(
    (tour: TourPackage) => {
      setPreselectedTourId(tour.id);
      setBookingInitialTab('book');
      navigateTo('book');
    },
    [navigateTo]
  );

  const openTicketStatusPage = useCallback(() => {
    setBookingInitialTab('status');
    navigateTo('book');
  }, [navigateTo]);

  const openBookVisitPage = useCallback(() => {
    setBookingInitialTab('book');
    navigateTo('book');
  }, [navigateTo]);

  const handleSelectTourName = useCallback(
    (tourTitle: string) => {
      if (!data) return;
      const found = data.tours.find(
        (t) => t.title.toLowerCase() === tourTitle.toLowerCase()
      );
      if (found) {
        setSelectedTourModal(found);
      } else {
        navigateTo('tours');
      }
    },
    [data, navigateTo]
  );

  const tourCategories = useMemo(
    () => [
      'All',
      'City & Cultural Tours',
      'Desert Safari',
      'Airport Transfers',
      'Inter-Hotel Transfers',
    ],
    []
  );

  const filteredTours = useMemo(() => {
    if (!data) return [];
    const byCategory =
      tourCategoryFilter === 'All'
        ? data.tours
        : tourCategoryFilter === 'Desert Safari'
          ? data.tours.filter((t) => t.category === 'Desert Safari Adventure')
          : tourCategoryFilter === 'Airport Transfers'
            ? data.tours.filter((t) => t.category === 'Airport Transfers')
            : tourCategoryFilter === 'Inter-Hotel Transfers'
              ? data.tours.filter((t) => t.category === 'Inter-Hotel Transfers')
              : data.tours.filter(
                  (t) =>
                    t.category !== 'Desert Safari Adventure' &&
                    t.category !== 'Airport Transfers' &&
                    t.category !== 'Inter-Hotel Transfers'
                );

    const query = tourSearchQuery.trim().toLowerCase();
    if (!query) return byCategory;

    return byCategory.filter((t) => {
      const searchable = [
        t.title,
        t.category,
        t.description,
        t.duration,
        t.priceNote,
        t.pickupInfo,
        ...(t.itinerary || []),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [data, tourCategoryFilter, tourSearchQuery]);

  const { tours, attractions, reviews, gallery, settings, cms, mapsApiKey } = data;
  const featuredTours = tours.filter((t) => t.featured).slice(0, 6);
  const safariAndTransferServices = tours.filter(
    (t) =>
      t.category === 'Desert Safari Adventure' ||
      t.category === 'Airport Transfers' ||
      t.category === 'Inter-Hotel Transfers'
  );

  const navLinks: Array<{ id: PageRoute; label: string }> = [
    { id: 'home', label: t.nav.home },
    { id: 'about', label: t.nav.about },
    { id: 'tours', label: t.nav.tours },
    { id: 'attractions', label: t.nav.attractions },
    { id: 'gallery', label: t.nav.gallery },
    { id: 'reviews', label: t.nav.reviews },
    { id: 'contact', label: t.nav.contact },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-[#111114] pb-16 md:pb-0">
      {/* Google Maps Platform Case A Quota Exceeded Banner */}
      {mapsQuotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* TOP NAVIGATION BAR (3-Zone Contract) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0B0D]/95 text-white backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="font-display text-xl font-semibold tracking-wider text-[#F5E4B8] whitespace-nowrap shrink-0 sm:text-2xl"
          >
            {settings.brandName}
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            className="hidden lg:flex items-center gap-5 text-sm font-medium text-neutral-300"
            aria-label="Main navigation"
          >
            {navLinks.map((item) => (
              <a
                key={item.id}
                href={ROUTE_TO_PATH[item.id]}
                onClick={(e) => {
                  e.preventDefault();
                  navigateTo(item.id);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F5E4B8] ${
                  route === item.id ? 'text-[#C59B38] underline underline-offset-8' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: Language + Currency Switchers + Primary Action + Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AED / USD Switcher */}
            <div
              className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 text-[11px] font-semibold"
              role="group"
              aria-label="Currency selector"
            >
              {(['AED', 'USD'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  aria-pressed={currency === code}
                  className={`font-mono-num rounded-md px-2 py-1 transition-colors whitespace-nowrap ${
                    currency === code
                      ? 'bg-[#C59B38] text-[#0B0B0D]'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Language Switcher */}
            <label className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-neutral-200 hover:border-[#C59B38]/60">
              <Globe className="h-3.5 w-3.5 text-[#C59B38]" aria-hidden="true" />
              <span className="sr-only">Select language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                aria-label="Language selector"
                className="cursor-pointer bg-transparent text-[11px] font-semibold text-white focus:outline-none"
              >
                <option value="en" className="bg-[#0B0B0D] text-white">
                  EN
                </option>
                <option value="ar" className="bg-[#0B0B0D] text-white">
                  AR
                </option>
                <option value="ur" className="bg-[#0B0B0D] text-white">
                  UR
                </option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => navigateTo('book')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C59B38] px-3.5 py-2 text-xs font-semibold text-[#0B0B0D] transition-colors hover:bg-[#D4AF37] whitespace-nowrap shrink-0 min-h-[38px]"
            >
              {t.nav.bookTour}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Slide-down Nav Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#0B0B0D] px-4 py-4 lg:hidden">
            <nav className="grid gap-1">
              {navLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 text-left text-sm font-medium ${
                    route === item.id
                      ? 'bg-[#C59B38]/15 text-[#F5E4B8]'
                      : 'text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-neutral-500" />
                </button>
              ))}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Language:</span>
                  {(['en', 'ar', 'ur'] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
                        language === code
                          ? 'bg-[#C59B38] text-[#0B0B0D]'
                          : 'border border-white/15 text-neutral-300'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <PWAInstallButton variant="dark" />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1">
        {route === 'home' && (
          <div>
            {/* HERO SECTION */}
            <section className="relative flex min-h-[84vh] items-end overflow-hidden bg-[#0B0B0D] text-white sm:items-center">
              <div className="absolute inset-0">
                <SafeImage
                  src={cms?.heroBannerUrl || '/src/assets/images/hero_dubai_skyline_1794985266623.jpg'}
                  alt={cms?.heroHeading || 'Downtown Dubai Skyline featuring Burj Khalifa at golden hour'}
                  loading="eager"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/60 to-[#0B0B0D]/35" />
              </div>

              <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold tracking-widest text-[#F5E4B8]">
                    {language === 'en' && cms?.heroEyebrow ? cms.heroEyebrow : t.hero.eyebrow}
                  </p>
                  <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white [text-wrap:balance] sm:text-6xl">
                    {language === 'en' && cms?.heroHeading ? cms.heroHeading : t.hero.title}
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-200 sm:text-lg">
                    {language === 'en' && cms?.heroDescription ? cms.heroDescription : t.hero.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => navigateTo('tours')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#C59B38] px-6 py-3.5 text-sm font-semibold text-[#0B0B0D] transition-colors hover:bg-[#D4AF37] min-h-[46px]"
                    >
                      {language === 'en' && cms?.heroExploreBtnText
                        ? cms.heroExploreBtnText
                        : t.hero.exploreTours}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('book')}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#C59B38] hover:bg-white/15 min-h-[46px]"
                    >
                      {language === 'en' && cms?.heroBookBtnText
                        ? cms.heroBookBtnText
                        : t.hero.bookAdventure}
                    </button>
                    <a
                      href={buildWhatsAppUrl(settings.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-950/60 px-5 py-3.5 text-sm font-semibold text-emerald-100 backdrop-blur-sm transition-colors hover:bg-emerald-900/70 min-h-[46px]"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      {language === 'en' && cms?.heroWhatsAppBtnText
                        ? cms.heroWhatsAppBtnText
                        : t.hero.contactWhatsApp}
                    </a>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/15 pt-6 text-xs text-neutral-300">
                    <span>
                      {t.hero.organizerLabel}: {settings.guideName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.hero.guidesLabel}: {settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {currency === 'USD' ? t.hero.ratesLabelUsd : t.hero.ratesLabelAed}
                    </span>
                    <div className="ml-auto hidden sm:block">
                      <PWAInstallButton variant="dark" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* WELCOME INTRODUCTION */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
              <div className="grid items-stretch gap-10 lg:grid-cols-12">
                <div className="flex flex-col justify-center lg:col-span-7">
                  <p className="text-xs font-semibold text-[#8B6816]">
                    {language === 'en' && cms?.welcomeEyebrow
                      ? cms.welcomeEyebrow
                      : t.sections.welcomeEyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold text-[#111114] [text-wrap:balance] sm:text-5xl">
                    {cms?.welcomeHeading || settings.slogan}
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-neutral-700">
                    {cms?.welcomeDescription || settings.guideBio}
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => navigateTo('about')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25]"
                    >
                      {t.sections.meetTeamBtn}
                      <ArrowUpRight className="h-4 w-4 text-[#C59B38]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('contact')}
                      className="text-xs font-semibold text-[#8B6816] hover:text-[#111114]"
                    >
                      {t.sections.askCustomBtn}
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="relative h-full min-h-[380px] overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417]">
                    <SafeImage
                      src={settings.guidePhotoUrl}
                      alt={`${settings.guideName} – Program Organizer in Dubai`}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURED TOUR PACKAGES */}
            <section className="border-y border-neutral-200 bg-white py-16 lg:py-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#8B6816]">
                      {language === 'en' && cms?.featuredEyebrow
                        ? cms.featuredEyebrow
                        : t.sections.featuredEyebrow}
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                      {language === 'en' && cms?.featuredHeading
                        ? cms.featuredHeading
                        : t.sections.featuredTitle}
                    </h2>
                    {language === 'en' && cms?.featuredDescription && (
                      <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                        {cms.featuredDescription}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('tours')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B6816] hover:text-[#111114]"
                  >
                    {t.sections.viewAllTours} ({tours.length})
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featuredTours.map((tour) => (
                    <TourCard
                      key={tour.id}
                      tour={tour}
                      whatsappNumber={settings.whatsappNumber}
                      onViewDetails={(tourItem) => setSelectedTourModal(tourItem)}
                      onBookOnline={handleBookTour}
                    />
                  ))}
                </div>

                {/* DESERT SAFARI & DUBAI AIRPORT / INTER-HOTEL TRANSFER RATES */}
                {safariAndTransferServices.length > 0 && (
                  <div className="mt-14 rounded-2xl border border-neutral-200 bg-[#FAF9F6] p-6 sm:p-8">
                    <div className="flex flex-col gap-3 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-[#8B6816]">
                          {language === 'en' && cms?.tariffEyebrow
                            ? cms.tariffEyebrow
                            : t.sections.tariffEyebrow}{' '}
                          ({currency})
                        </p>
                        <h3 className="mt-1 font-display text-2xl font-semibold text-[#111114] sm:text-3xl">
                          {language === 'en' && cms?.tariffHeading
                            ? cms.tariffHeading
                            : t.sections.tariffTitle}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTourCategoryFilter('Airport Transfers');
                          navigateTo('tours');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6816] hover:text-[#111114]"
                      >
                        {t.sections.browseTransfersBtn}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                      {safariAndTransferServices.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200/90 bg-white p-4 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#8B6816]">
                              {svc.category}
                            </p>
                            <h4 className="mt-0.5 text-sm font-semibold text-[#111114]">
                              {svc.title}
                            </h4>
                            <p className="mt-0.5 text-xs text-neutral-600">
                              {formatText(svc.priceNote)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2.5 sm:flex-col sm:items-end">
                            <span className="font-mono-num text-base font-semibold text-[#111114]">
                              {svc.startingPriceAed !== null
                                ? formatAmount(svc.startingPriceAed)
                                : 'Quote'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleBookTour(svc)}
                                className="rounded-lg bg-[#0B0B0D] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#1F1F25]"
                              >
                                {t.sections.bookShort}
                              </button>
                              <a
                                href={buildWhatsAppUrl(settings.whatsappNumber, {
                                  tourTitle: svc.title,
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] font-semibold text-[#111114] hover:border-[#C59B38]"
                              >
                                {t.sections.whatsAppShort}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* POPULAR DUBAI DESTINATIONS */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B6816]">
                    {language === 'en' && cms?.destinationsEyebrow
                      ? cms.destinationsEyebrow
                      : t.sections.destinationsEyebrow}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                    {language === 'en' && cms?.destinationsHeading
                      ? cms.destinationsHeading
                      : t.sections.destinationsTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('attractions')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B6816] hover:text-[#111114]"
                >
                  {t.sections.exploreAttractionsBtn} ({attractions.length})
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {attractions.slice(0, 4).map((attr) => (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => navigateTo('attractions')}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417] text-left"
                  >
                    <SafeImage
                      src={attr.imageUrl}
                      alt={attr.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <p className="flex items-center gap-1 text-xs text-[#F5E4B8]">
                        <MapPin className="h-3.5 w-3.5" />
                        Dubai, UAE
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-semibold">{attr.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-300">
                        {attr.shortIntro}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* WHY CHOOSE TRIP ADVENTURE */}
            <section className="bg-[#0B0B0D] py-16 text-white lg:py-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold text-[#C59B38]">
                    {language === 'en' && cms?.whyEyebrow
                      ? cms.whyEyebrow
                      : t.sections.whyEyebrow}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                    {language === 'en' && cms?.whyHeading
                      ? cms.whyHeading
                      : t.sections.whyTitle}
                  </h2>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {(cms?.whyCards && cms.whyCards.length > 0
                    ? cms.whyCards
                    : [
                        {
                          num: '01.',
                          title: 'Dedicated Program & Guides Team',
                          description: `Coordinated by Program Organizer ${settings.guideName} and led by Tour Guides ${settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'} at your own pace.`,
                        },
                        {
                          num: '02.',
                          title: 'Direct WhatsApp Coordination',
                          description:
                            'Communicate directly before arrival and during your stay for pickup timing, dining tips, and route adjustments.',
                        },
                        {
                          num: '03.',
                          title: `Transparent ${currency} Quoting`,
                          description:
                            currency === 'USD'
                              ? 'Browse approx. USD equivalents (1 USD = 3.6725 AED) with final invoicing confirmed in UAE Dirhams.'
                              : 'Receive clear tour quotes in UAE Dirhams tailored to your party size and chosen attraction stops.',
                        },
                        {
                          num: '04.',
                          title: 'Modern & Heritage Balance',
                          description:
                            'Combine Downtown icons like Burj Khalifa with authentic abra rides across Dubai Creek and local souks.',
                        },
                      ]
                  ).map((item) => (
                    <div
                      key={item.num + item.title}
                      className="rounded-2xl border border-white/10 bg-[#141417] p-6"
                    >
                      <p className="font-mono-num text-sm font-semibold text-[#C59B38]">
                        {item.num}
                      </p>
                      <h3 className="mt-3 font-display text-2xl font-semibold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                        {formatText(item.description)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CUSTOMER TESTIMONIALS (STRICTLY GENUINE) */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B6816]">
                    {language === 'en' && cms?.reviewsEyebrow
                      ? cms.reviewsEyebrow
                      : t.sections.reviewsEyebrow}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                    {language === 'en' && cms?.reviewsHeading
                      ? cms.reviewsHeading
                      : t.sections.reviewsTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('reviews')}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B6816] hover:text-[#111114]"
                >
                  {reviews.length > 0 ? 'Read All Reviews' : 'Leave a Verified Review'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#111114]">
                      Genuine Guest Stories Only
                    </h3>
                    <p className="mt-1.5 max-w-xl text-sm text-neutral-600">
                      We display only real reviews submitted by guests who have toured with TRIP ADVENTURE and verified by our team.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('reviews')}
                    className="mt-4 inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] sm:mt-0"
                  >
                    <Star className="h-4 w-4 text-[#C59B38]" />
                    Share Your Experience
                  </button>
                </div>
              ) : (
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  {reviews.slice(0, 3).map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-2xl border border-neutral-200 bg-white p-6"
                    >
                      <div className="flex items-center gap-1 text-[#C59B38]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="h-4 w-4 fill-[#C59B38]" />
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                      <p className="mt-4 text-xs font-semibold text-[#111114]">
                        {rev.customerName}
                        {rev.tourTitle && (
                          <span className="font-normal text-neutral-500"> · {rev.tourTitle}</span>
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* PROGRAM ORGANIZER & TOUR GUIDES (SEPARATE FROM PHOTO GALLERY) */}
            <Suspense fallback={null}>
              <TeamSpotlightSection
                settings={settings}
                onMeetTeamClick={() => navigateTo('about')}
              />
            </Suspense>

            {/* PHOTO GALLERY PREVIEW */}
            <section className="border-t border-neutral-200 bg-white py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#8B6816]">
                      {language === 'en' && cms?.galleryEyebrow
                        ? cms.galleryEyebrow
                        : t.sections.galleryEyebrow}
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                      {language === 'en' && cms?.galleryHeading
                        ? cms.galleryHeading
                        : t.sections.galleryTitle}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('gallery')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B6816] hover:text-[#111114]"
                  >
                    {t.sections.openGalleryBtn}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {gallery.slice(0, 4).map((item) => {
                    const focalClass =
                      item.imageUrl.includes('8.53.30_AM') ||
                      item.imageUrl.includes('8.53.31_AM')
                        ? 'object-bottom'
                        : item.imageUrl.includes('8.20.10_AM') ||
                            item.imageUrl.includes('10.06.42_AM') ||
                            item.imageUrl.includes('10.20.26_AM') ||
                            item.imageUrl.includes('10.25.24_AM') ||
                            item.imageUrl.includes('9.33.24_AM') ||
                            item.imageUrl.includes('9.33.25_AM') ||
                            item.imageUrl.includes('9.33.18_AM') ||
                            item.imageUrl.includes('9.33.08_AM_7effb360')
                          ? 'object-top'
                          : 'object-center';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateTo('gallery')}
                        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417] text-left"
                      >
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.title}
                          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${focalClass}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 text-white">
                          <p className="text-[11px] text-[#F5E4B8]">{item.category}</p>
                          <p className="text-sm font-semibold">{item.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* OUR ACHIEVEMENTS & REAL TRIPS SHOWCASE */}
            <Suspense fallback={null}>
              <AchievementsTripsSection
                compact
                onViewAllAbout={() => navigateTo('about')}
              />
            </Suspense>

            {/* FREQUENTLY ASKED QUESTIONS */}
            <FaqSection cms={cms} />

            {/* STRONG BOOKING CALL-TO-ACTION */}
            <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-3xl bg-[#0B0B0D] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
                {cms?.ctaBannerUrl && (
                  <div className="absolute inset-0">
                    <SafeImage
                      src={cms.ctaBannerUrl}
                      alt={cms.ctaHeading || 'TRIP ADVENTURE Dubai'}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#0B0B0D]/75" />
                  </div>
                )}
                <div className="relative z-10">
                  <p className="text-xs font-semibold tracking-widest text-[#C59B38]">
                    {cms?.ctaEyebrow || 'TRIP ADVENTURE · DUBAI, UAE'}
                  </p>
                  <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold [text-wrap:balance] sm:text-5xl">
                    {language === 'en' && cms?.ctaHeading ? cms.ctaHeading : t.sections.ctaTitle}
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-300">
                    {cms?.ctaDescription || settings.slogan}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => navigateTo('book')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#C59B38] px-6 py-3.5 text-sm font-semibold text-[#0B0B0D] hover:bg-[#D4AF37]"
                    >
                      {language === 'en' && cms?.ctaPrimaryBtnText
                        ? cms.ctaPrimaryBtnText
                        : t.sections.requestBookingBtn}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <a
                      href={buildWhatsAppUrl(settings.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-[#0B0B0D]/40 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:border-[#C59B38]"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      {language === 'en' && cms?.ctaSecondaryBtnText
                        ? cms.ctaSecondaryBtnText
                        : t.sections.chatWhatsAppBtn}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {route !== 'home' && (
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#C59B38]" />
              </div>
            }
          >
            {route === 'about' && (
              <AboutSection settings={settings} cms={cms} onBookClick={() => navigateTo('book')} />
            )}

            {route === 'tours' && (
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#8B6816]">
                      {language === 'en' && cms?.toursPageEyebrow
                        ? cms.toursPageEyebrow
                        : t.sections.toursPageEyebrow}
                    </p>
                    <h1 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                      {language === 'en' && cms?.toursPageHeading
                        ? cms.toursPageHeading
                        : t.sections.toursPageTitle}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                      {cms?.toursPageDescription ||
                        `Explore ${tours.length} tours, desert safaris, and airport/hotel transfer packages organized by ${settings.guideName} with Tour Guides ${settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'}.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 self-start">
                    <button
                      type="button"
                      onClick={openTicketStatusPage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#111114] transition-colors hover:border-[#C59B38] whitespace-nowrap"
                    >
                      <Ticket className="h-3.5 w-3.5 text-[#8B6816]" />
                      Check Trip Status
                    </button>
                    <button
                      type="button"
                      onClick={openBookVisitPage}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25] whitespace-nowrap"
                    >
                      {t.sections.customTourInquiry}
                    </button>
                  </div>
                </div>

                {/* Category Filter Tabs + Search Bar */}
                <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1">
                    {tourCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTourCategoryFilter(cat)}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                          tourCategoryFilter === cat
                            ? 'bg-[#0B0B0D] text-white'
                            : 'text-neutral-600 hover:text-[#111114]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={tourSearchQuery}
                      onChange={(e) => setTourSearchQuery(e.target.value)}
                      placeholder="Search tours by name or keyword..."
                      aria-label="Search tours by name or keyword"
                      className="w-full rounded-xl border border-neutral-200 bg-[#FAF9F6] py-2 pl-9 pr-9 text-xs text-[#111114] placeholder:text-neutral-400 focus:border-[#C59B38] focus:bg-white focus:outline-none"
                    />
                    {tourSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTourSearchQuery('')}
                        aria-label="Clear tour search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-[#111114]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {(tourCategoryFilter !== 'All' || tourSearchQuery.trim() !== '') && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
                    <span>
                      Showing{' '}
                      <strong className="font-mono-num text-[#111114]">
                        {filteredTours.length}
                      </strong>{' '}
                      of{' '}
                      <strong className="font-mono-num text-[#111114]">{tours.length}</strong>{' '}
                      packages
                      {tourSearchQuery.trim() ? ` matching “${tourSearchQuery.trim()}”` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTourCategoryFilter('All');
                        setTourSearchQuery('');
                      }}
                      className="font-semibold text-[#8B6816] hover:text-[#111114] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

                {filteredTours.length === 0 ? (
                  <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-10 text-center">
                    <Search className="mx-auto h-8 w-8 text-neutral-400" />
                    <h2 className="mt-3 font-display text-2xl font-semibold text-[#111114]">
                      No Matching Tours Found
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-md text-xs text-neutral-600">
                      Try another keyword (such as &ldquo;Desert Safari&rdquo;, &ldquo;Burj Khalifa&rdquo;, &ldquo;Airport&rdquo;, or &ldquo;Abu Dhabi&rdquo;) or reset category filters.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTourCategoryFilter('All');
                          setTourSearchQuery('');
                        }}
                        className="rounded-lg bg-[#0B0B0D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1F1F25]"
                      >
                        Show All Tours ({tours.length})
                      </button>
                      <button
                        type="button"
                        onClick={openBookVisitPage}
                        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
                      >
                        Request Custom Visit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTours.map((tour) => (
                      <TourCard
                        key={tour.id}
                        tour={tour}
                        whatsappNumber={settings.whatsappNumber}
                        onViewDetails={(t) => setSelectedTourModal(t)}
                        onBookOnline={handleBookTour}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {route === 'attractions' && (
              <AttractionsSection
                attractions={attractions}
                tours={tours}
                mapsApiKey={mapsApiKey}
                onSelectTourName={handleSelectTourName}
              />
            )}

            {route === 'gallery' && <GallerySection gallery={gallery} />}

            {route === 'reviews' && <ReviewsSection reviews={reviews} tours={tours} />}

            {route === 'book' && (
              <BookingSection
                tours={tours}
                settings={settings}
                preselectedTourId={preselectedTourId}
                initialMode={bookingInitialTab}
              />
            )}

            {route === 'contact' && (
              <ContactSection
                settings={settings}
                cms={cms}
                attractions={attractions}
                mapsApiKey={mapsApiKey}
              />
            )}

            {route === 'admin' && (
              <AdminDashboard
                onDataUpdated={() => fetchBootstrap(true)}
                onExitAdmin={() => navigateTo('home')}
              />
            )}
          </Suspense>
        )}
      </main>

      {/* QUIET LUXURY FOOTER */}
      <footer className="border-t border-white/10 bg-[#0B0B0D] text-neutral-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-6 lg:col-span-3 space-y-3">
              <p className="font-display text-2xl font-semibold tracking-wider text-[#F5E4B8]">
                {settings.brandName}
              </p>
              <p className="text-xs leading-relaxed text-neutral-400">{settings.slogan}</p>
              <div className="pt-2">
                <PWAInstallButton variant="dark" />
              </div>
            </div>

            <div className="md:col-span-6 lg:col-span-2">
              <p className="text-xs font-semibold text-white">Explore</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs lg:grid-cols-1">
                {navLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className="text-left text-neutral-400 hover:text-[#F5E4B8]"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openBookVisitPage}
                  className="text-left text-neutral-400 hover:text-[#F5E4B8]"
                >
                  {t.nav.onlineBooking}
                </button>
                <button
                  type="button"
                  onClick={openTicketStatusPage}
                  className="text-left text-neutral-400 hover:text-[#F5E4B8]"
                >
                  Check Trip Status
                </button>
              </div>
            </div>

            <div className="md:col-span-6 lg:col-span-3 space-y-2.5 text-xs">
              <p className="font-semibold text-white">Dubai Contact Desk</p>
              <p className="flex items-center gap-2 text-neutral-400">
                <Phone className="h-3.5 w-3.5 text-[#C59B38]" />
                <span className="font-mono-num">{settings.whatsappNumber}</span>
              </p>
              <p className="flex items-center gap-2 text-neutral-400">
                <Mail className="h-3.5 w-3.5 text-[#C59B38]" />
                <span>{settings.email}</span>
              </p>
              <p className="flex items-center gap-2 text-neutral-400">
                <MapPin className="h-3.5 w-3.5 text-[#C59B38]" />
                <span>{settings.address}</span>
              </p>
            </div>

            <div className="md:col-span-6 lg:col-span-4">
              <FooterNewsletter />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-neutral-500">
            <p>
              © {new Date().getFullYear()} {settings.brandName}.{' '}
              {cms?.footerTagline || 'Personal Tour Guide Services in Dubai, UAE.'}
            </p>
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-[#C59B38]"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* FLOATING WHATSAPP ICON ON EVERY PUBLIC PAGE */}
      {route !== 'admin' && (
        <a
          href={buildWhatsAppUrl(settings.whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with TRIP ADVENTURE on WhatsApp"
          className="fixed bottom-20 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#15803D] text-white shadow-xl transition-transform hover:scale-105 hover:bg-[#166534] md:bottom-6 md:right-6"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}

      {/* MOBILE PWA BOTTOM TAB NAVIGATION BAR (< md) */}
      {route !== 'admin' && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 items-center border-t border-white/10 bg-[#0B0B0D]/95 text-neutral-400 backdrop-blur-md pb-safe md:hidden"
          aria-label="Mobile app navigation"
        >
          {[
            { id: 'home' as const, label: t.nav.home, icon: Home },
            { id: 'tours' as const, label: t.nav.tours, icon: Compass },
            { id: 'attractions' as const, label: t.nav.attractions, icon: MapIcon },
            { id: 'book' as const, label: t.sections.bookShort, icon: Calendar },
            { id: 'contact' as const, label: t.nav.contact, icon: MessageCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = route === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigateTo(tab.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  active ? 'text-[#C59B38]' : 'text-neutral-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* TOUR DETAIL MODAL */}
      {selectedTourModal && (
        <Suspense fallback={null}>
          <TourDetailModal
            tour={selectedTourModal}
            whatsappNumber={settings.whatsappNumber}
            onClose={() => setSelectedTourModal(null)}
            onBookOnline={handleBookTour}
          />
        </Suspense>
      )}

      {/* OFFLINE PWA BANNER */}
      <OfflineIndicator />
    </div>
  );
}
