'use client';

import { useEffect } from 'react';

export default function BrandStatusPoller({
  brandId,
  status,
}: {
  brandId: string;
  status: string;
}) {
  useEffect(() => {
    if (status !== 'scraping') return;

    const timer = setInterval(async () => {
      const res = await fetch('/api/brands');
      const data = await res.json();
      const brand = data.brands?.find((b: { id: string }) => b.id === brandId);
      if (brand && brand.status !== 'scraping') {
        window.location.reload();
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [brandId, status]);

  return null;
}
