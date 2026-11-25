import React, { useMemo, useState } from 'react';
import {
  Award,
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  Maximize2,
  PlayCircle,
  X,
} from 'lucide-react';
import { SafeImage } from './SafeImage.tsx';

export interface AchievementTripMedia {
  id: string;
  kind: 'image' | 'video';
  group: 'achievement' | 'trip';
  badge: string;
  title: string;
  location: string;
  caption: string;
  src: string;
  focalClass?: string;
}

const ACHIEVEMENTS_AND_TRIPS: AchievementTripMedia[] = [
  {
    id: 'ach-burj-al-arab-group',
    kind: 'image',
    group: 'achievement',
    badge: 'Our Achievement · Usama Khokhar',
    title: 'VIP Family Group Tour at Burj Al Arab',
    location: 'Jumeirah Coast · Dubai',
    caption:
      'Tour Guide Usama Khokhar guiding an international family group during a full-day Dubai luxury landmark tour.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.32_AM_c55829f1.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-hd-desert-sunset',
    kind: 'image',
    group: 'trip',
    badge: 'HD Desert Safari · Our Trips',
    title: 'Luxury 4x4 Sunset Dune Expedition',
    location: 'Arabian Desert Conservation Dunes',
    caption:
      'Full HD golden-hour 4x4 dune crossing along sculpted crimson-gold desert ridges outside Dubai.',
    src: '/src/assets/images/desert_safari_sunset_luxury_1795199286659.jpg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-hd-desert-camp',
    kind: 'image',
    group: 'trip',
    badge: 'HD Desert Safari · Our Trips',
    title: 'Starlight Majlis & Lantern Desert Camp',
    location: 'Dubai Desert Twilight Camp',
    caption:
      'Intimate Arabian desert dinner experience beside glowing lanterns, majlis carpets, and desert firelight.',
    src: '/src/assets/images/desert_camp_starlight_dinner_1795199287008.jpg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-hd-burj-al-arab',
    kind: 'image',
    group: 'trip',
    badge: 'HD Dubai Landmark · Our Trips',
    title: 'Burj Al Arab & Jumeirah Turquoise Shoreline',
    location: 'Umm Suqeim · Jumeirah Coast',
    caption:
      'High-definition coastal afternoon vista looking across Umm Suqeim beach toward the sail of Burj Al Arab.',
    src: '/src/assets/images/burj_al_arab_jumeirah_coast_1795199286770.jpg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-hd-dubai-frame',
    kind: 'image',
    group: 'trip',
    badge: 'HD Dubai Landmark · Our Trips',
    title: 'Dubai Frame Golden Zabeel Panorama',
    location: 'Zabeel Park · Dubai',
    caption:
      'High-definition architectural frame capturing Zabeel Park gardens and the towering Downtown skyline.',
    src: '/src/assets/images/dubai_frame_zabeel_panorama_1795199286236.jpg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-hd-atlantis-palm',
    kind: 'image',
    group: 'trip',
    badge: 'HD Dubai Landmark · Our Trips',
    title: 'Atlantis The Palm Sunset Crescent Vista',
    location: 'Palm Jumeirah Crescent · Dubai',
    caption:
      'Elevated sunset panorama showcasing Atlantis The Palm archway and yacht-lined emerald waters.',
    src: '/src/assets/images/atlantis_palm_golden_crescent_1795199286173.jpg',
    focalClass: 'object-center',
  },
  {
    id: 'ach-sheikh-zayed-mosque',
    kind: 'image',
    group: 'achievement',
    badge: 'Our Achievement · Abu Dhabi',
    title: 'Sheikh Zayed Grand Mosque Twilight Excursion',
    location: 'Abu Dhabi, UAE',
    caption:
      'Tour Guide Usama Khokhar escorting guests through the illuminated marble courtyards of Sheikh Zayed Grand Mosque.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.19_AM_3d5b2311.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'ach-burj-khalifa-guide',
    kind: 'image',
    group: 'achievement',
    badge: 'Our Achievement · Downtown Dubai',
    title: 'Private Burj Khalifa Guided Walk',
    location: 'Downtown Dubai',
    caption:
      'Smiling guest moment with Tour Guide Usama Khokhar directly below the towering Burj Khalifa.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.24_AM__1__274d09b4.jpeg',
    focalClass: 'object-top',
  },
  {
    id: 'ach-jumeirah-guest',
    kind: 'image',
    group: 'achievement',
    badge: 'Our Achievement · Coastal Tour',
    title: 'Jumeirah Coastline Personal Guiding',
    location: 'Umm Suqeim · Jumeirah',
    caption:
      'Private guided stop with Tour Guide Usama Khokhar along Dubai’s waterfront avenue.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.18_AM_1b47f683.jpeg',
    focalClass: 'object-top',
  },
  {
    id: 'ach-dxb-arrival',
    kind: 'image',
    group: 'achievement',
    badge: 'Our Achievement · DXB Transfers',
    title: 'Dubai Airport (DXB) Guest Meet & Greet',
    location: 'Dubai International Airport',
    caption:
      'Seamless arrival welcome and luggage assistance coordinated by TRIP ADVENTURE directly at DXB Terminal.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.08_AM_7effb360.jpeg',
    focalClass: 'object-top',
  },
  {
    id: 'trip-museum-future',
    kind: 'image',
    group: 'trip',
    badge: 'Our Trip · Sheikh Zayed Road',
    title: 'Museum of the Future Landmark Drive',
    location: 'Trade Centre · Dubai',
    caption:
      'Morning chauffeur sightseeing pass beside the architectural calligraphy facade of the Museum of the Future.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.27_AM_c5af3e19.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-al-fahidi-courtyard',
    kind: 'image',
    group: 'trip',
    badge: 'Our Trip · Old Dubai',
    title: 'Al Fahidi Historical Wind-Tower Quarter',
    location: 'Bur Dubai Heritage District',
    caption:
      'Exploring traditional Emirati wind-tower architecture and coral-stone courtyards on our Old Dubai tour.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.11_AM_79b046a0.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-al-fahidi-fort',
    kind: 'image',
    group: 'trip',
    badge: 'Our Trip · Old Dubai',
    title: 'Al Fahidi Fort & Heritage Courtyard',
    location: 'Al Fahidi · Old Dubai',
    caption:
      'Historic watchtower built in 1787 at the heart of our Old Dubai Heritage Tour.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.16_AM_eeeca48d.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-al-seef-creek',
    kind: 'image',
    group: 'trip',
    badge: 'Our Trip · Creekfront',
    title: 'Al Seef Heritage Waterfront & Creekside',
    location: 'Dubai Creek · Al Seef',
    caption:
      'Evening stroll along Al Seef waterfront cafés and traditional dhow moorings on Dubai Creek.',
    src: '/assets/aistudio/WhatsApp_Image_2026-11-20_at_9.33.17_AM_28618dd5.jpeg',
    focalClass: 'object-center',
  },
  {
    id: 'trip-video-museum-skyline',
    kind: 'video',
    group: 'trip',
    badge: 'HD Trip Video',
    title: 'Museum of the Future & Downtown Skyline Aerial Reel',
    location: 'Sheikh Zayed Road · Dubai',
    caption: 'Real HD highlights sweeping across Museum of the Future and Emirates Towers.',
    src: '/assets/aistudio/WhatsApp_Video_2026-11-20_at_9.33.23_AM_b738ef05.mp4',
  },
  {
    id: 'trip-video-dubai-frame',
    kind: 'video',
    group: 'trip',
    badge: 'HD Trip Video',
    title: 'Dubai Frame Live City Tour Approach',
    location: 'Zabeel · Dubai',
    caption: 'Live road view arriving at the golden Dubai Frame monument during our city tour.',
    src: '/assets/aistudio/WhatsApp_Video_2026-11-20_at_9.33.35_AM_687c21c5.mp4',
  },
];

type MediaFilter = 'all' | 'achievement' | 'trip' | 'video';

interface AchievementsTripsSectionProps {
  compact?: boolean;
  embedded?: boolean;
  onViewAllAbout?: () => void;
}

export const AchievementsTripsSection: React.FC<AchievementsTripsSectionProps> = ({
  compact = false,
  embedded = false,
  onViewAllAbout,
}) => {
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [expandedCompact, setExpandedCompact] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<AchievementTripMedia | null>(null);

  const filteredItems = useMemo(() => {
    if (filter === 'achievement') {
      return ACHIEVEMENTS_AND_TRIPS.filter((item) => item.group === 'achievement');
    }
    if (filter === 'trip') {
      return ACHIEVEMENTS_AND_TRIPS.filter((item) => item.group === 'trip' && item.kind === 'image');
    }
    if (filter === 'video') {
      return ACHIEVEMENTS_AND_TRIPS.filter((item) => item.kind === 'video');
    }
    return ACHIEVEMENTS_AND_TRIPS;
  }, [filter]);

  const visibleItems =
    compact && !expandedCompact && filter === 'all' ? filteredItems.slice(0, 8) : filteredItems;

  const imageItems = useMemo(
    () => filteredItems.filter((item) => item.kind === 'image'),
    [filteredItems]
  );

  const activeImageIndex =
    lightboxItem && lightboxItem.kind === 'image'
      ? imageItems.findIndex((item) => item.id === lightboxItem.id)
      : -1;

  const stepLightbox = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageItems.length <= 1 || activeImageIndex === -1) return;
    const nextIdx = (activeImageIndex + delta + imageItems.length) % imageItems.length;
    setLightboxItem(imageItems[nextIdx]);
  };

  return (
    <section
      className={
        embedded
          ? 'border-t border-neutral-200 pt-12'
          : 'mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8'
      }
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6816]">
            <Award className="h-3.5 w-3.5 text-[#C59B38]" />
            Our Achievements &amp; Our Trips · Full HD
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
            Real Guided Achievements &amp; Dubai Trips
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Verified tours organized by Program Organizer <strong>Shahzaman Khokhar</strong> and led in person by Tour Guides <strong>Usama Khokhar &amp; Abdul Qadir Khokhar</strong> across Dubai and Abu Dhabi. Click any photo for Full HD resolution.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1.5 self-start">
          {(
            [
              { id: 'all', label: 'All Full HD', icon: Camera },
              { id: 'achievement', label: 'Our Achievements', icon: Award },
              { id: 'trip', label: 'Our Trips', icon: Compass },
              { id: 'video', label: 'Trip Videos', icon: PlayCircle },
            ] as Array<{ id: MediaFilter; label: string; icon: React.ComponentType<{ className?: string }> }>
          ).map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600 hover:text-[#111114]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#C59B38]' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleItems.map((item) =>
          item.kind === 'video' ? (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                <video
                  src={item.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain bg-black"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <p className="text-[11px] font-semibold text-[#8B6816]">{item.badge}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-[#111114]">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{item.caption}</p>
                </div>
                <p className="mt-2.5 text-[11px] font-medium text-neutral-400">{item.location}</p>
              </div>
            </article>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightboxItem(item)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-colors hover:border-[#C59B38]/60 focus-visible:outline-2 focus-visible:outline-[#C59B38]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141417]">
                <SafeImage
                  src={item.src}
                  alt={item.title}
                  className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                    item.focalClass || 'object-center'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-xs">
                  <Maximize2 className="h-3 w-3 text-[#C59B38]" />
                  Full HD
                </div>
                <p className="absolute bottom-2.5 left-3 right-3 truncate text-[11px] font-medium text-[#F5E4B8]">
                  {item.badge}
                </p>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-display text-lg font-semibold leading-snug text-[#111114] group-hover:text-[#8B6816] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{item.caption}</p>
                </div>
                <p className="mt-2.5 text-[11px] font-medium text-neutral-400">{item.location}</p>
              </div>
            </button>
          )
        )}
      </div>

      {compact && !expandedCompact && filter === 'all' && filteredItems.length > 8 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setExpandedCompact(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-[#111114] transition-colors hover:border-[#C59B38]"
          >
            View All {filteredItems.length} Full HD Photos &amp; Trip Videos
          </button>
          {onViewAllAbout && (
            <button
              type="button"
              onClick={onViewAllAbout}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1F1F25]"
            >
              Meet Our Team &amp; Story
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Full HD Lightbox Modal */}
      {lightboxItem && lightboxItem.kind === 'image' && (
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
              aria-label="Close Full HD photo viewer"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex min-h-[45vh] max-h-[75vh] w-full items-center justify-center bg-black p-2">
              <SafeImage
                src={lightboxItem.src}
                alt={lightboxItem.title}
                className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain"
              />
              {imageItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => stepLightbox(-1, e)}
                    aria-label="Previous Full HD photo"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => stepLightbox(1, e)}
                    aria-label="Next Full HD photo"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-5">
              <div>
                <p className="text-xs font-medium text-[#C59B38]">
                  {lightboxItem.badge} · {lightboxItem.location}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{lightboxItem.title}</h3>
                <p className="mt-1 text-sm text-neutral-300">{lightboxItem.caption}</p>
              </div>
              {imageItems.length > 1 && activeImageIndex !== -1 && (
                <span className="font-mono-num text-xs text-neutral-400">
                  {activeImageIndex + 1} / {imageItems.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
