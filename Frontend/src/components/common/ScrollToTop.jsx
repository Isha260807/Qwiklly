import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - Automatically scrolls the window to the very top on every route/page change.
 * Handles instant scroll on pathname and search query updates, plus microtasks for lazy-loaded views.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };

    // Immediate scroll
    scrollToTop();

    // Secondary scroll after DOM paint for lazy-loaded modules
    const timer = setTimeout(scrollToTop, 20);
    const rAf = requestAnimationFrame(scrollToTop);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rAf);
    };
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
