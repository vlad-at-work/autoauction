'use client';

import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

type CountdownTimerProps = {
  expiresAt: Date;
  isExpired?: boolean;
};

export function CountdownTimer({ expiresAt, isExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span
      className={`inline-flex items-center gap-1 ${isExpired ? 'text-muted-foreground' : 'text-foreground'}`}
    >
      <Clock className="size-3.5" />
      {isExpired ? 'истекло' : timeLeft}
    </span>
  );
}
