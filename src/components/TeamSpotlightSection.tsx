import React from 'react';
import { ArrowUpRight, Compass, ShieldCheck } from 'lucide-react';
import type { SiteSettings } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface TeamSpotlightSectionProps {
  settings: SiteSettings;
  onMeetTeamClick?: () => void;
}

const USAMA_KHOKHAR_PHOTO =
  '/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.25.24_AM_cd873d4c.jpeg';
const ABDUL_QADIR_PHOTO =
  '/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.20.26_AM_46584150.jpeg';

export const TeamSpotlightSection: React.FC<TeamSpotlightSectionProps> = ({
  settings,
  onMeetTeamClick,
}) => {
  return (
    <section className="border-t border-neutral-200 bg-[#FAF9F6] py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6816]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C59B38]" />
              Dedicated Hospitality Team · Separate From Photo Gallery
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
              Program Organizer &amp; Tour Guides
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Your Dubai trips and airport transfers are planned directly by our Program Organizer and led in person by our dedicated Tour Guides.
            </p>
          </div>
          {onMeetTeamClick && (
            <button
              type="button"
              onClick={onMeetTeamClick}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B6816] hover:text-[#111114] self-start sm:self-auto"
            >
              Read Full Profiles &amp; Services
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* Program Organizer */}
          <article className="overflow-hidden rounded-2xl border border-[#C59B38]/40 bg-[#0B0B0D] text-white">
            <div className="aspect-square w-full overflow-hidden bg-[#141417]">
              <SafeImage
                src={settings.guidePhotoUrl}
                alt={`${settings.guideName} – ${settings.guideTitle}`}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-[#C59B38]">{settings.guideTitle}</p>
              <h3 className="mt-1.5 font-display text-2xl font-semibold">{settings.guideName}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                Coordinates custom Dubai sightseeing schedules, desert safaris, DXB airport pickups, and inter-hotel transfers.
              </p>
            </div>
          </article>

          {/* Tour Guide: Usama Khokhar */}
          <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="aspect-square w-full overflow-hidden bg-[#141417]">
              <SafeImage
                src={USAMA_KHOKHAR_PHOTO}
                alt="Usama Khokhar – Dubai Tour Guide"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="p-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6816]">
                <Compass className="h-3.5 w-3.5 text-[#C59B38]" />
                Dubai Tour Guide
              </p>
              <h3 className="mt-1.5 font-display text-2xl font-semibold text-[#111114]">
                Usama Khokhar
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Personal tour guide leading Dubai city sightseeing, Abu Dhabi mosque visits, Dubai Marina tours, and desert excursions ({settings.guideLanguages}).
              </p>
            </div>
          </article>

          {/* Tour Guide: Abdul Qadir Khokhar */}
          <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="aspect-square w-full overflow-hidden bg-[#141417]">
              <SafeImage
                src={ABDUL_QADIR_PHOTO}
                alt="Abdul Qadir Khokhar – Dubai Tour Guide"
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="p-6">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B6816]">
                <Compass className="h-3.5 w-3.5 text-[#C59B38]" />
                Dubai Tour Guide
              </p>
              <h3 className="mt-1.5 font-display text-2xl font-semibold text-[#111114]">
                Abdul Qadir Khokhar
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Dedicated tour guide leading private family itineraries, heritage walks, coastal routes, and safari departures ({settings.guideLanguages}).
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
