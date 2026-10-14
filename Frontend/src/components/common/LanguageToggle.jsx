import React, { memo, useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribe } from '../../i18n/translator';

// Compact English <-> Hindi switch. Shows the language you will switch TO.
const LanguageToggle = memo(({ className = '' }) => {
  const lang = useSyncExternalStore(subscribe, getLanguage);
  const isHindi = lang === 'hi';

  return (
    <button
      type="button"
      translate="no"
      onClick={() => setLanguage(isHindi ? 'en' : 'hi')}
      className={`px-2.5 py-1 rounded-full bg-[#FCEBF3] text-[#720C3E] text-[11px] font-extrabold cursor-pointer select-none active:scale-95 transition-all hover:bg-[#F9DCE8] ${className}`}
      aria-label={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
    >
      {isHindi ? 'EN' : 'हिं'}
    </button>
  );
});

LanguageToggle.displayName = 'LanguageToggle';
export default LanguageToggle;
