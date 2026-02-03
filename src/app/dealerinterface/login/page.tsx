'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

export default function DealerLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealerName, setDealerName] = useState<string | null>(null);
  const [webAppReady, setWebAppReady] = useState(false);

  // Wait for WebApp to load
  useEffect(() => {
    let cancelled = false;

    const waitForWebApp = (attempt = 0) => {
      if (cancelled) return;

      const webApp = getWebApp();
      const platform = detectPlatform();

      if (webApp && platform && webApp.initData) {
        setWebAppReady(true);
        // Fetch dealer name
        fetchDealerName();
        return;
      }

      if (attempt < 40) {
        setTimeout(() => waitForWebApp(attempt + 1), 50);
      }
    };

    const fetchDealerName = async () => {
      try {
        const webApp = getWebApp();
        const platform = detectPlatform();
        const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
        const initData = webApp?.initData;

        if (!initData || !platform || !platformUserId) return;

        const response = await fetch('/api/dealerinterface/my-info', {
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDealerName(data.name || data.username);
        }
      } catch (err) {
        console.error('Failed to fetch dealer name:', err);
      }
    };

    waitForWebApp();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!initData || !platform) {
        setError('WebApp не загружен');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/dealerinterface/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platform}:dealer:${initData}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка входа');
      }

      // Login successful, redirect to dashboard
      router.replace('/dealerinterface/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/dealerinterface/reset-password');
  };

  if (!webAppReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход в систему</CardTitle>
          <CardDescription>
            {dealerName ? `${dealerName}, введите ваш пароль` : 'Введите пароль для входа'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Войти
            </Button>

            <Button type="button" variant="link" className="w-full" onClick={handleForgotPassword}>
              Забыли пароль?
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
