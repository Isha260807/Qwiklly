export const QWIKLLY_SPLASH_SESSION_KEY = 'qwiklly:user-splash-played-v2';

export const hasQwikllySplashPlayed = () => {
  try {
    return window.sessionStorage.getItem(QWIKLLY_SPLASH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markQwikllySplashPlayed = () => {
  try {
    window.sessionStorage.setItem(QWIKLLY_SPLASH_SESSION_KEY, 'true');
  } catch {
    // Private browsing can disable sessionStorage; the splash still works once.
  }
};
