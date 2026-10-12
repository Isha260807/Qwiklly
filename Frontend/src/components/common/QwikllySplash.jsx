import React, { useEffect, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { brand } from '../../theme';
import { hasQwikllySplashPlayed, markQwikllySplashPlayed } from './qwikllySplashSession';

const QwikllySplash = ({ onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = prefersReducedMotion === true;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.remove('qwiklly-splash-pending');

    const duration = reducedMotion ? 420 : 2200;
    const completionTimer = window.setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      window.clearTimeout(completionTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete, reducedMotion]);

  return (
    <Motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={reducedMotion ? { opacity: 0 } : { opacity: [1, 1, 1, 0.98, 0] }}
      transition={reducedMotion
        ? { duration: 0.42, ease: 'easeOut' }
        : { duration: 2.2, times: [0, 0.18, 0.5, 0.82, 1], ease: 'easeInOut' }}
      style={{
        background: 'radial-gradient(circle at 50% 44%, ' + brand.primaryLight + ' 0%, ' + brand.primary + ' 44%, ' + brand.primaryDark + ' 100%)',
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
      role="presentation"
      aria-hidden="true"
    >
      <div className="absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-black/20 blur-3xl" />
      </div>

      <Motion.div
        className="relative z-10 whitespace-nowrap font-outfit text-[clamp(3.5rem,17.5vw,7.5rem)] font-extrabold tracking-[-0.06em] text-white"
        initial={{ opacity: 0, scale: 0.84 }}
        animate={reducedMotion
          ? { opacity: 1, scale: 1 }
          : {
            opacity: [0, 1, 1, 1, 0],
            scale: [0.84, 0.98, 1, 1.04, 32]
          }}
        transition={reducedMotion
          ? { duration: 0.25, ease: 'easeOut' }
          : {
            duration: 2.2,
            times: [0, 0.18, 0.5, 0.52, 1],
            ease: ['easeOut', 'easeOut', 'easeInOut', 'easeIn', 'easeIn']
          }}
        style={{
          transformOrigin: 'center center',
          willChange: 'transform, opacity'
        }}
      >
        Qwiklly
      </Motion.div>
    </Motion.div>
  );
};

export const QwikllySplashGate = () => {
  const [visible, setVisible] = useState(() => !hasQwikllySplashPlayed());

  useEffect(() => {
    if (visible) markQwikllySplashPlayed();
  }, [visible]);

  if (!visible) return null;
  return <QwikllySplash onComplete={() => setVisible(false)} />;
};

export default QwikllySplash;