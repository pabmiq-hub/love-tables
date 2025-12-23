import { useState, useEffect, useCallback } from "react";

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "speedmatch_cookie_consent";

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      setConsent(JSON.parse(stored));
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = useCallback((newConsent: CookieConsent) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  }, [saveConsent]);

  const openSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-cookie-settings"));
  }, []);

  return {
    consent,
    showBanner,
    setShowBanner,
    saveConsent,
    acceptAll,
    rejectAll,
    openSettings,
  };
};
