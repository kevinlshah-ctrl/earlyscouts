'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function UTMCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const utmParams: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => {
      const value = searchParams.get(key);
      if (value) utmParams[key] = value;
    });

    if (Object.keys(utmParams).length > 0) {
      try {
        sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
      } catch (e) {
        // ignore
      }
    }
  }, [searchParams]);

  return null;
}
