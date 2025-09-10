import { useEffect, useRef, useState } from 'react';

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [apiOk, setApiOk] = useState<boolean>(true);
  const ref = useRef<HTMLDivElement | null>(null);

  // Monitor network and API status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    let t: number | undefined;
    const ping = async () => {
      try {
        const res = await fetch('/api/status');
        setApiOk(res.ok);
      } catch {
        setApiOk(false);
      }
      t = window.setTimeout(ping, 15000);
    };
    ping();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      if (t) window.clearTimeout(t);
    };
  }, []);

  // Expose banner height to CSS var for FAB offset
  useEffect(() => {
    const el = ref.current;
    const setOffset = () => {
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--banner-offset', `${h}px`);
    };
    setOffset();
    window.addEventListener('resize', setOffset);
    return () => {
      window.removeEventListener('resize', setOffset);
      document.documentElement.style.setProperty('--banner-offset', '0px');
    };
  }, [online, apiOk]);

  if (online && apiOk) return null;
  const text = !online
    ? 'Hors ligne — certaines actions seront sauvegardées localement.'
    : 'API indisponible — réessayez plus tard.';

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 px-4 py-2 text-center border-t"
    >
      {text}
    </div>
  );
}

