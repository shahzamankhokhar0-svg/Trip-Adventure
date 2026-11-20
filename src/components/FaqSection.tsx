import React, { useMemo, useState } from 'react';
import { Calendar, Car, ChevronDown, Compass } from 'lucide-react';
import type { CmsContent, CmsFaqItem, FaqCategory } from '../types.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';

export type { FaqCategory };

const FAQ_CATEGORIES: Array<{
  id: FaqCategory;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'Tours',
    label: 'Tours',
    subtitle: 'Half-Day, Full-Day, Desert Safari & Guides',
    icon: Compass,
  },
  {
    id: 'Transfers',
    label: 'Transfers',
    subtitle: 'Dubai Airport (DXB) & Inter-Hotel Rates',
    icon: Car,
  },
  {
    id: 'Booking',
    label: 'Booking',
    subtitle: 'Reservations, Verification & WhatsApp',
    icon: Calendar,
  },
];

const FALLBACK_FAQ_ITEMS: CmsFaqItem[] = [
  {
    id: 'tours-safari-rates',
    category: 'Tours',
    question: 'What are the Desert Safari rates for per-person and private 4x4 bookings?',
    answer:
      'Our sharing-basis Desert Safari is 120 AED per person, and our Private 4x4 Desert Safari for 5 to 6 guests is 800 AED total. Both include dune drives, sunset viewpoints, and Arabian desert camp hospitality.',
  },
  {
    id: 'tours-half-full-day',
    category: 'Tours',
    question: 'Do city and private sightseeing tours offer Half-Day and Full-Day AED rates?',
    answer:
      'Yes. Clear Half-Day (4 Hours) and Full-Day (8 Hours) rates are available in AED — including Dubai City Tour (350 AED Half-Day / 600 AED Full-Day), Old Dubai Heritage Tour (200 AED Half-Day / 420 AED Full-Day), Private Dubai Sightseeing (400 AED Half-Day / 700 AED Full-Day), and Abu Dhabi City Tour (750 AED Full-Day).',
  },
  {
    id: 'tours-team-guides',
    category: 'Tours',
    question: 'Who organizes the programs and leads the guided tours?',
    answer:
      'All itineraries, schedules, and transfers are organized by Program Organizer Shahzaman Khokhar, while sightseeing tours and cultural walks are led in English by Tour Guides Usama and Abdul Qadir.',
  },
  {
    id: 'transfers-airport-rates',
    category: 'Transfers',
    question: 'What are the Dubai Airport (DXB) arrival and departure transfer rates?',
    answer:
      'Dubai Airport (DXB) arrival transfers to Old Dubai (Deira & Bur Dubai) are 120 AED, and departures from Old Dubai back to DXB are 100 AED. Both arrivals and departures for New Dubai (Dubai Marina, Palm Jumeirah, and Downtown) are 170 AED per way.',
  },
  {
    id: 'transfers-inter-hotel',
    category: 'Transfers',
    question: 'What do inter-hotel transfers cost between Old Dubai and New Dubai?',
    answer:
      'Inter-hotel transfers between properties within Old Dubai (Deira & Bur Dubai) are 80 AED. Inter-hotel transfers from Old Dubai to New Dubai (Marina, Palm Jumeirah, or Downtown) are 150 AED.',
  },
  {
    id: 'transfers-pickup-locations',
    category: 'Transfers',
    question: 'Where can you pick up and drop off guests?',
    answer:
      'Pickup and drop-off are available directly from any hotel or private residence in Old Dubai and New Dubai, Dubai International Airport (DXB Terminals 1, 2 & 3), as well as Port Rashid and Dubai Harbour cruise terminals.',
  },
  {
    id: 'booking-workflow',
    category: 'Booking',
    question: 'How does online booking and guide confirmation work?',
    answer:
      'Submitting the online booking form generates a unique reference code (TA-DXB-XXXXXX) with pending status. Your request is not finalized until Program Organizer Shahzaman Khokhar verifies availability and confirms it. You can track your request status anytime on the Book page.',
  },
  {
    id: 'booking-whatsapp',
    category: 'Booking',
    question: 'How quickly can I coordinate pickup times or special requests on WhatsApp?',
    answer:
      'You can message our WhatsApp business desk directly from any tour or transfer card, the booking confirmation page, or the floating WhatsApp button. Selected tour names, travel dates, guest counts, and pickup notes are pre-filled automatically.',
  },
  {
    id: 'booking-tickets',
    category: 'Booking',
    question: 'Are attraction observation deck tickets included in sightseeing rates?',
    answer:
      'Unless specified on the package, third-party tickets such as Burj Khalifa observation decks or museum passes are excluded from the guide/vehicle rate and quoted separately based on your preferred entry time.',
  },
];

interface FaqSectionProps {
  cms?: CmsContent;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ cms }) => {
  const { formatText, language, t } = usePreferences();
  const faqItems = useMemo(
    () => (cms?.faqs && cms.faqs.length > 0 ? cms.faqs : FALLBACK_FAQ_ITEMS),
    [cms?.faqs]
  );

  const [selectedCategory, setSelectedCategory] = useState<'All' | FaqCategory>('All');
  const [openId, setOpenId] = useState<string | null>(() => faqItems[0]?.id ?? null);

  const visibleGroups = useMemo(() => {
    const categories =
      selectedCategory === 'All'
        ? FAQ_CATEGORIES
        : FAQ_CATEGORIES.filter((c) => c.id === selectedCategory);

    return categories
      .map((cat) => ({
        ...cat,
        items: faqItems.filter((item) => item.category === cat.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [faqItems, selectedCategory]);

  const eyebrow =
    language === 'en' && cms?.faqEyebrow ? cms.faqEyebrow : t.sections.faqEyebrow;
  const heading =
    language === 'en' && cms?.faqHeading ? cms.faqHeading : t.sections.faqTitle;
  const subtitle =
    language === 'en' && cms?.faqSubtitle ? cms.faqSubtitle : t.sections.faqSubtitle;

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold text-[#8B6816]">{eyebrow}</p>
        <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">{subtitle}</p>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div
        className="mt-8 flex flex-wrap justify-center gap-1.5 rounded-xl bg-neutral-100 p-1.5"
        role="tablist"
        aria-label="Filter frequently asked questions by category"
      >
        {(['All', 'Tours', 'Transfers', 'Booking'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={selectedCategory === cat}
            onClick={() => {
              setSelectedCategory(cat);
              if (cat !== 'All') {
                const firstInCat = faqItems.find((item) => item.category === cat);
                if (firstInCat) setOpenId(firstInCat.id);
              }
            }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#0B0B0D] text-white'
                : 'text-neutral-600 hover:text-[#111114]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GROUPED CATEGORY SECTIONS */}
      <div className="mt-8 space-y-8">
        {visibleGroups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0D] text-[#C59B38]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#111114] sm:text-2xl">
                      {group.label}
                    </h3>
                    <p className="text-xs text-neutral-500">{group.subtitle}</p>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-medium text-neutral-500">
                  {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
                </span>
              </div>

              <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
                {group.items.map((faq) => {
                  const isOpen = openId === faq.id;
                  return (
                    <div key={faq.id} className="p-5 sm:px-6">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                        className="flex w-full items-center justify-between gap-4 text-left"
                      >
                        <span className="text-sm font-semibold text-[#111114] sm:text-base">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-[#8B6816] transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                          {formatText(faq.answer)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
