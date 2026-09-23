'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton({ fallback = '/', label = 'Back', className = '' }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }

  return (
    <button type="button" className={`back-button ${className}`.trim()} onClick={goBack}>
      <ArrowLeft size={15} /> {label}
    </button>
  );
}
