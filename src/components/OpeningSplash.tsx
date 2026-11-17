import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import {
  ChochinLantern,
  CornerFretAccent,
  DimsumKamonCrest,
  SeigaihaBackdrop,
} from './OrientalAccents';

interface OpeningSplashProps {
  visible: boolean;
  onComplete: () => void;
}

const STEAM_PATHS = [
  { delay: 0.1, xOffset: -34, duration: 2.0 },
  { delay: 0.35, xOffset: 0, duration: 2.2 },
  { delay: 0.2, xOffset: 34, duration: 1.9 },
];

export function OpeningSplash({ visible, onComplete }: OpeningSplashProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    const duration = prefersReducedMotion ? 450 : 2300;
    const timer = setTimeout(onComplete, duration);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Animasi pembuka Dimsum Mentai 77 UNPAM"
          initial={{ y: 0, opacity: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : {
                  y: '-100%',
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                }
          }
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#241F1D] px-6 text-center"
        >
          {/* Japanese Seigaiha Wave & Architectural Corner Fret */}
          <SeigaihaBackdrop />
          <CornerFretAccent colorClass="text-[#E6A84C]/45" />

          {/* Hanging Swaying Chochin Lanterns Left & Right */}
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { y: 0, opacity: 0.85 }
                : { y: 0, opacity: 0.9, rotate: [-2, 2, -2] }
            }
            transition={{
              y: { duration: 0.5 },
              rotate: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ transformOrigin: 'top center' }}
            className="pointer-events-none absolute top-0 left-6 hidden sm:block sm:left-12"
          >
            <ChochinLantern className="h-28 w-16" />
          </motion.div>

          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { y: 0, opacity: 0.85 }
                : { y: 0, opacity: 0.9, rotate: [2, -2, 2] }
            }
            transition={{
              y: { duration: 0.5, delay: 0.08 },
              rotate: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{ transformOrigin: 'top center' }}
            className="pointer-events-none absolute top-0 right-6 hidden sm:block sm:right-12"
          >
            <ChochinLantern className="h-28 w-16" />
          </motion.div>

          {/* Warm Lantern Radial Glow */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { scale: 1, opacity: 0.35 }
                : { scale: [0.55, 1.25, 1.05], opacity: [0, 0.5, 0.35] }
            }
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="pointer-events-none absolute h-80 w-80 rounded-full bg-[#E53E22]/22 blur-3xl sm:h-96 sm:w-96"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={
              prefersReducedMotion
                ? { scale: 1, opacity: 0.2 }
                : { scale: [0.6, 1.15, 0.95], opacity: [0, 0.35, 0.22] }
            }
            transition={{ duration: 1.6, delay: 0.15, ease: 'easeOut' }}
            className="pointer-events-none absolute h-56 w-56 rounded-full bg-[#E6A84C]/20 blur-2xl"
          />

          {/* Rising Bamboo Steamer Steam Wisps */}
          {!prefersReducedMotion && (
            <div className="pointer-events-none relative mb-1 h-8 w-32" aria-hidden="true">
              {STEAM_PATHS.map((steam, idx) => (
                <motion.svg
                  key={idx}
                  viewBox="0 0 24 48"
                  className="absolute bottom-0 left-1/2 h-10 w-5 -translate-x-1/2 text-[#E6A84C]/70"
                  style={{ marginLeft: steam.xOffset }}
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{
                    opacity: [0, 0.7, 0],
                    y: [10, -18, -32],
                    scale: [0.8, 1.05, 1.2],
                  }}
                  transition={{
                    duration: steam.duration,
                    delay: steam.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                >
                  <path
                    d="M12 44 C4 34, 20 24, 10 14 C4 8, 14 4, 12 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </motion.svg>
              ))}
            </div>
          )}

          {/* Brand Emblem with Expanding Gold Ring & Steamer Kamon Crest */}
          <div className="relative flex items-center justify-center">
            {!prefersReducedMotion && (
              <motion.div
                initial={{ scale: 0.65, opacity: 0.7 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute h-32 w-32 rounded-full border border-[#E6A84C]/55 sm:h-40 sm:w-40"
              />
            )}

            <motion.div
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 0.5, opacity: 0, rotate: -10, y: 16 }
              }
              animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 18,
              }}
              className="relative"
            >
              <img
                src="/assets/aistudio/logo_dm77_d20d4c54.png"
                alt="Logo Dimsum Mentai 77 UNPAM"
                referrerPolicy="no-referrer"
                className="h-32 w-32 object-contain drop-shadow-[0_14px_32px_rgba(229,62,34,0.35)] sm:h-40 sm:w-40"
              />
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { scale: 1.6, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 20 }}
              className="absolute -bottom-1 -right-3"
            >
              <DimsumKamonCrest size="sm" />
            </motion.div>
          </div>

          {/* Clean Indonesian/Brand Staggered Text (zero foreign characters) */}
          <div className="relative mt-5 overflow-hidden">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs font-semibold tracking-widest uppercase text-[#E6A84C]"
            >
              Universitas Pamulang
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-[#F6F2EC] sm:text-5xl"
            >
              Dimsum Mentai 77
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 text-sm text-[#C5BCB4] sm:text-base"
            >
              &ldquo;The Ultimate Fusion&rdquo; · 100% Tobiko Asli
            </motion.p>
          </div>

          {/* Vermilion-to-Gold Progress Line */}
          <div className="relative mt-7 h-1 w-48 overflow-hidden rounded-full bg-[#3A322F]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.35 : 1.95,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'left center' }}
              className="h-full w-full bg-gradient-to-r from-[#E53E22] to-[#E6A84C]"
            />
          </div>

          <motion.button
            type="button"
            onClick={onComplete}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative mt-6 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-xs font-medium text-[#C5BCB4] underline-offset-4 transition-colors hover:text-[#F6F2EC] hover:underline"
          >
            Lewati Intro
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
