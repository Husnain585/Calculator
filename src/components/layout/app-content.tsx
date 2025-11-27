"use client";

import React from 'react';
import AppHeader from '@/components/layout/app-header';

export function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
