'use client';

import { useState } from 'react';

export function GlobalLoading() {
  const [isLoading] = useState(false);

  if (!isLoading) return null;

  return (
    <>
      {/* Top progress bar */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-50 animate-in fade-in duration-300"
        style={{
          animation: 'slideInFromLeft 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      {/* Backdrop fade */}
      <div
        className="fixed inset-0 bg-black/5 backdrop-blur-sm z-40"
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      <style jsx>{`
        @keyframes slideInFromLeft {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
