'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import StudioHome from '@/components/StudioHome';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return (
    <AppShell>
      <StudioHome />
    </AppShell>
  );
}
