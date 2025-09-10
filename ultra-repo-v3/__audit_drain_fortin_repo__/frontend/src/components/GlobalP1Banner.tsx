import { useEffect, useRef, useState } from 'react';
import { Siren, PhoneCall, MessageSquare } from 'lucide-react';
import { track } from '@/lib/analytics';

export default function GlobalP1Banner() {
  const [p1, setP1] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch('/api/alerts/sla');
        const json = await res.json();
        setP1(Number(json?.p1 || 0));
      } catch { /* ignore */ }
      timer = window.setTimeout(poll, 15000);
    };
    poll();
    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  // Reflect banner height to CSS var for top offset
  useEffect(() => {
    const el = ref.current;
    const setOffset = () => {
      const h = el ? Math.ceil(el.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--top-banner-offset', `${h}px`);
    };
    setOffset();
    window.addEventListener('resize', setOffset);
    return () => {
      window.removeEventListener('resize', setOffset);
      document.documentElement.style.setProperty('--top-banner-offset', '0px');
    };
  }, [p1]);

  const call = () => { track('p1_call'); window.open('tel:+15145296037', '_self'); };
  const sms = () => { track('p1_sms'); const t = encodeURIComponent('URGENT P1 – Rappel immédiat requis.'); window.open(`sms:+15145296037?&body=${t}`, '_self'); };

  if (p1 <= 0) return null;
  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-priority-p1 text-white px-4 py-2 text-center flex items-center justify-center gap-3 shadow"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <Siren className="h-4 w-4" />
      <span>{p1} URGENCE{p1 > 1 ? 'S' : ''} P1 EN COURS</span>
      <button onClick={call} className="ml-3 underline flex items-center gap-1"><PhoneCall className="h-4 w-4" /> Appeler</button>
      <button onClick={sms} className="ml-2 underline flex items-center gap-1"><MessageSquare className="h-4 w-4" /> SMS</button>
    </div>
  );
}
