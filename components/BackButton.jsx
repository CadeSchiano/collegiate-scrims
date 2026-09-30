'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton({
  fallback = '/',
  label = 'Back',
  className = '',
  showHome = true,
}) {
  const router = useRouter();

  function goBack() {
    const referrer = document.referrer;
    const cameFromScrimnet = referrer && new URL(referrer).origin === window.location.origin;

    if (cameFromScrimnet) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <div className={`back-navigation ${className}`.trim()}>
      <button type="button" className="back-button" onClick={goBack}>
        <ArrowLeft size={15} /> {label}
      </button>
      {showHome && (
        <Link href="/" className="back-home" aria-label="Scrimnet home">
          <span className="brand-mark">
            <span />
          </span>
          <span>
            scrim<span>net</span>
          </span>
        </Link>
      )}
    </div>
  );
}
