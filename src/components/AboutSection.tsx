import React from 'react';
import { ArrowUpRight, Check, Globe, MessageCircle } from 'lucide-react';
import type { CmsContent, SiteSettings } from '../types.ts';
import { buildWhatsAppUrl } from '../lib/whatsapp.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import { SafeImage } from './SafeImage.tsx';
import { AchievementsTripsSection } from './AchievementsTripsSection.tsx';

interface AboutSectionProps {
  settings: SiteSettings;
  cms?: CmsContent;
  onBookClick: () => void;
}

const USAMA_KHOKHAR_PORTRAIT = '/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.25.24_AM_cd873d4c.jpeg';
const ABDUL_QADIR_PORTRAIT = '/assets/aistudio/WhatsApp_Image_2026-11-20_at_10.20.26_AM_46584150.jpeg';

export const AboutSection: React.FC<AboutSectionProps> = ({ settings, cms, onBookClick }) => {
  const { currency, formatText } = usePreferences();
  const guideList = (settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar')
    .split(/[,&]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      <div className="grid items-stretch gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-neutral-200 bg-[#141417]">
            <SafeImage
              src={settings.guidePhotoUrl}
              alt={`${settings.guideName} – ${settings.guideTitle}`}
              className="h-full w-full object-cover object-top"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center lg:col-span-7">
          <p className="text-xs font-semibold text-[#8B6816]">
            {settings.brandName} · {settings.guideTitle}
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold text-[#111114] sm:text-5xl">
            {settings.guideName}
          </h2>
          <p className="mt-2 text-sm font-medium text-neutral-600">
            {settings.guideTitle} · Tour Guides:{' '}
            {settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'} · Languages:{' '}
            {settings.guideLanguages}
          </p>

          <p className="mt-6 text-base leading-relaxed text-neutral-700">
            {settings.guideBio}
          </p>

          {(settings.guideExperience || settings.guideCredentials) && (
            <div className="mt-6 grid gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-2">
              {settings.guideExperience && (
                <div>
                  <h3 className="text-xs font-semibold text-[#8B6816]">Experience</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    {settings.guideExperience}
                  </p>
                </div>
              )}
              {settings.guideCredentials && (
                <div>
                  <h3 className="text-xs font-semibold text-[#8B6816]">
                    Qualifications &amp; Licensing
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                    {settings.guideCredentials}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBookClick}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1F1F25]"
            >
              Plan Your Private Tour
              <ArrowUpRight className="h-4 w-4 text-[#C59B38]" />
            </button>
            <a
              href={buildWhatsAppUrl(settings.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-[#111114] hover:border-[#C59B38]"
            >
              <MessageCircle className="h-4 w-4 text-[#15803D]" />
              Message on WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* TEAM DIRECTORY: PROGRAM ORGANIZER & TOUR GUIDES */}
      <div className="border-t border-neutral-200 pt-12">
        <p className="text-xs font-semibold text-[#8B6816]">TRIP ADVENTURE Team</p>
        <h3 className="mt-1 font-display text-3xl font-semibold text-[#111114]">
          Program Organizer &amp; Tour Guides
        </h3>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl border border-[#C59B38]/40 bg-[#0B0B0D] text-white">
            <div className="aspect-square w-full overflow-hidden bg-[#141417]">
              <SafeImage
                src={settings.guidePhotoUrl}
                alt={`${settings.guideName} – ${settings.guideTitle}`}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-[#C59B38]">{settings.guideTitle}</p>
              <h4 className="mt-1.5 font-display text-2xl font-semibold">{settings.guideName}</h4>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                Program Organizer coordinating all Dubai city tours, desert safaris, half-day &amp; full-day schedules, DXB airport pickups, and inter-hotel transfers.
              </p>
            </div>
          </div>

          {guideList.map((guide) => {
            const lower = guide.toLowerCase();
            const isUsama = lower.includes('usama');
            const isAbdulQadir = lower.includes('abdul') || lower.includes('qadir');
            const displayName =
              isUsama && lower === 'usama'
                ? 'Usama Khokhar'
                : isAbdulQadir && !lower.includes('khokhar')
                  ? 'Abdul Qadir Khokhar'
                  : guide;
            const portraitUrl = isUsama
              ? USAMA_KHOKHAR_PORTRAIT
              : isAbdulQadir
                ? ABDUL_QADIR_PORTRAIT
                : null;

            return (
              <div
                key={guide}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                {portraitUrl && (
                  <div className="aspect-square w-full overflow-hidden bg-[#141417]">
                    <SafeImage
                      src={portraitUrl}
                      alt={`${displayName} – Dubai Tour Guide`}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                )}
                <div className="p-6">
                  <p className="text-xs font-semibold text-[#8B6816]">Dubai Tour Guide</p>
                  <h4 className="mt-1.5 font-display text-2xl font-semibold text-[#111114]">
                    {displayName}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Dedicated tour guide leading private sightseeing itineraries, desert excursions, and guest tours across Dubai and Abu Dhabi ({settings.guideLanguages}).
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OUR ACHIEVEMENTS & REAL TRIPS SHOWCASE IN FULL HD */}
      <AchievementsTripsSection embedded />

      <div className="grid gap-8 border-t border-neutral-200 pt-12 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <Globe className="h-6 w-6 text-[#C59B38]" />
          <h3 className="mt-4 font-display text-2xl font-semibold text-[#111114]">
            {cms?.aboutServicesHeading || 'Personalized Guiding & Transfer Services'}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {cms?.aboutServicesDescription ||
              'Every itinerary is tailored around your travel dates, family pace, hotel location, and preferred Dubai neighborhoods.'}
          </p>
          <ul className="mt-5 space-y-3">
            {settings.guideServices.map((service, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B6816]" />
                <span>{formatText(service)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-[#0B0B0D] p-8 text-white">
          <p className="text-xs font-semibold text-[#C59B38]">
            {cms?.aboutCommitmentEyebrow || 'Our Commitment'}
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold">
            {cms?.aboutCommitmentHeading || 'Clear AED Rates & Reliable Coordination'}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">
            {formatText(
              cms?.aboutCommitmentDescription ||
                'From seamless DXB airport arrivals and inter-hotel transfers between Deira, Bur Dubai, and New Dubai to half-day, full-day tours, and desert safaris, TRIP ADVENTURE ensures visitors travel comfortably with transparent UAE Dirham pricing.'
            )}
          </p>
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-neutral-400">Primary Language</p>
              <p className="mt-1 text-sm font-semibold text-white">{settings.guideLanguages}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Active Display Currency</p>
              <p className="mt-1 font-mono-num text-sm font-semibold text-[#C59B38]">
                {currency === 'USD' ? 'US Dollar (USD · Approx.)' : 'UAE Dirham (AED)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
