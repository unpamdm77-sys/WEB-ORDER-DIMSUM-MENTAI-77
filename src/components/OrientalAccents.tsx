import { useId } from 'react';

/**
 * Japanese Seigaiha (wave-scale) vector pattern for architectural surface depth.
 */
export function SeigaihaBackdrop({ className = '' }: { className?: string }) {
  const patternId = useId();
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full text-[#E6A84C] opacity-[0.06] ${className}`}
    >
      <defs>
        <pattern
          id={patternId}
          width="60"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 30 A30 30 0 0 1 60 30 M7 30 A23 23 0 0 1 53 30 M14 30 A16 16 0 0 1 46 30 M21 30 A9 9 0 0 1 39 30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M-30 15 A30 30 0 0 1 30 15 M-23 15 A23 23 0 0 1 23 15 M-16 15 A16 16 0 0 1 16 15 M-9 15 A9 9 0 0 1 9 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M30 15 A30 30 0 0 1 90 15 M37 15 A23 23 0 0 1 83 15 M44 15 A16 16 0 0 1 76 15 M51 15 A9 9 0 0 1 69 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/**
 * Japanese Asanoha (hemp-leaf kumiko timber lattice) pattern backdrop.
 */
export function AsanohaBackdrop({ className = '' }: { className?: string }) {
  const patternId = useId();
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full text-[#E6A84C] opacity-[0.05] ${className}`}
    >
      <defs>
        <pattern
          id={patternId}
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M24 0 L48 24 L24 48 L0 24 Z M0 0 L48 48 M48 0 L0 48 M24 0 V48 M0 24 H48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/**
 * Japanese Noren (split shopfront curtain) architectural trim with bamboo rod.
 */
export function NorenTrimBar({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`w-full select-none ${className}`}>
      {/* Bamboo rod line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#D99B43]/30 via-[#E6A84C]/70 to-[#D99B43]/30" />
      {/* Split Noren panels */}
      <div className="mx-auto grid max-w-6xl grid-cols-6 gap-1.5 px-4 sm:grid-cols-10 sm:px-6 lg:px-8">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className={`h-2.5 rounded-b-sm border-x border-b ${
              idx % 2 === 0
                ? 'border-[#E6A84C]/25 bg-[#B82D18]/75'
                : 'border-[#483E3A] bg-[#2E2725]/85'
            } ${idx >= 6 ? 'hidden sm:block' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Traditional Chinese-Japanese Huiwen lattice hairline divider between sections.
 */
export function HuiwenDivider({ className = '' }: { className?: string }) {
  const patternId = useId();
  return (
    <div
      aria-hidden="true"
      className={`mx-auto flex max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="relative h-2.5 flex-1 overflow-hidden text-[#E6A84C]/45">
        <svg className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <pattern
              id={`${patternId}-left`}
              width="20"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 9 H18 V2 H6 V6 H12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>
          <rect width="100%" height="10" fill={`url(#${patternId}-left)`} />
        </svg>
      </div>

      {/* Central Endless Knot Diamond Medallion */}
      <svg
        viewBox="0 0 28 28"
        className="h-5 w-5 shrink-0 text-[#E6A84C]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="7" y="7" width="14" height="14" transform="rotate(45 14 14)" />
        <rect
          x="10.5"
          y="10.5"
          width="7"
          height="7"
          transform="rotate(45 14 14)"
          stroke="#E53E22"
        />
      </svg>

      <div className="relative h-2.5 flex-1 overflow-hidden text-[#E6A84C]/45">
        <svg className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <pattern
              id={`${patternId}-right`}
              width="20"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M20 9 H2 V2 H14 V6 H8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>
          <rect width="100%" height="10" fill={`url(#${patternId}-right)`} />
        </svg>
      </div>
    </div>
  );
}

/**
 * Minimalist Japanese Chochin / Chinese Red Paper Lantern architectural ornament.
 */
export function ChochinLantern({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 88"
      className={`pointer-events-none select-none ${className}`}
      fill="none"
    >
      {/* Hanging cord */}
      <line x1="24" y1="0" x2="24" y2="12" stroke="#E6A84C" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* Top lacquer cap */}
      <rect x="15" y="12" width="18" height="4" rx="1" fill="#2A2220" stroke="#E6A84C" strokeWidth="1.2" />
      {/* Lantern glowing ribbed body */}
      <ellipse cx="24" cy="38" rx="16" ry="22" fill="#C93218" fillOpacity="0.88" stroke="#E6A84C" strokeWidth="1.2" />
      <ellipse cx="24" cy="38" rx="11" ry="21" stroke="#F6A65B" strokeOpacity="0.35" strokeWidth="0.9" />
      <path d="M9 30 Q24 33 39 30" stroke="#421810" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M8 38 Q24 41 40 38" stroke="#421810" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M9 46 Q24 49 39 46" stroke="#421810" strokeOpacity="0.55" strokeWidth="1" />
      {/* Bottom lacquer cap */}
      <rect x="16" y="59" width="16" height="4" rx="1" fill="#2A2220" stroke="#E6A84C" strokeWidth="1.2" />
      {/* Tassel */}
      <line x1="24" y1="63" x2="24" y2="82" stroke="#E6A84C" strokeWidth="1.4" strokeOpacity="0.7" />
      <circle cx="24" cy="65" r="2" fill="#E6A84C" />
    </svg>
  );
}

/**
 * Pure-geometry Japanese Kamon & Bamboo Steamer Emblem Crest (zero foreign text).
 */
export function DimsumKamonCrest({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dims = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 44"
      className={`shrink-0 select-none ${dims} ${className}`}
      fill="none"
    >
      <circle cx="22" cy="22" r="20" fill="#B82D18" stroke="#E6A84C" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="16.5" stroke="#F6F2EC" strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="2 2" />
      {/* Stylized Bamboo Steamer & Rising Steam Lines */}
      <path d="M16 14 C15 11.5, 17 10.5, 16 8.5" stroke="#E6A84C" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M22 13 C21 10.5, 23 9.5, 22 7.5" stroke="#E6A84C" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28 14 C27 11.5, 29 10.5, 28 8.5" stroke="#E6A84C" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="12" y="18" width="20" height="5" rx="2.5" stroke="#F6F2EC" strokeWidth="1.4" />
      <rect x="13" y="23" width="18" height="8.5" rx="2" stroke="#E6A84C" strokeWidth="1.4" />
      <line x1="13" y1="27.2" x2="31" y2="27.2" stroke="#E6A84C" strokeWidth="1.1" strokeOpacity="0.8" />
    </svg>
  );
}

/**
 * Stepped Chinese-Japanese corner fret frame inside cards & showcase media.
 */
export function CornerFretAccent({
  colorClass = 'text-[#E6A84C]/65',
}: {
  colorClass?: string;
}) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-2.5 z-10 ${colorClass}`}>
      <svg viewBox="0 0 24 24" className="absolute left-0 top-0 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M1 16 V1 H16 M5 10 V5 H10" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute right-0 top-0 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M23 16 V1 H8 M19 10 V5 H14" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute bottom-0 left-0 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M1 8 V23 H16 M5 14 V19 H10" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute bottom-0 right-0 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M23 8 V23 H8 M19 14 V19 H14" />
      </svg>
    </div>
  );
}

/**
 * Sumi-e vermilion-gold brush stroke underline for section headings.
 */
export function BrushUnderline({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 12"
      className={`h-3 w-40 ${className}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="brushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E53E22" />
          <stop offset="70%" stopColor="#E6A84C" />
          <stop offset="100%" stopColor="#E6A84C" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M2 7.5 C50 2.5, 130 2, 196 6 C140 8.5, 62 9.5, 2 7.5 Z"
        fill="url(#brushGrad)"
      />
    </svg>
  );
}
