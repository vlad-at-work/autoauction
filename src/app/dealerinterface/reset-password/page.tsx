'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        return;
      }

      if (attempt < 40) {
        setTimeout(() => waitForWebApp(attempt + 1), 50);
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

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Введите 6-значный код');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

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

      const response = await fetch('/api/dealerinterface/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platform}:dealer:${initData}`,
        },
        body: JSON.stringify({ code, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка сброса пароля');
      }

      // Password reset successful, redirect to dashboard
      router.replace('/dealerinterface/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setLoading(false);
    }
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
          <CardTitle>Сброс пароля</CardTitle>
          <CardDescription>
            Введите 6-значный код, отправленный вам в бот, и новый пароль
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код подтверждения</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Введите пароль ещё раз"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Сбросить пароль
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => router.push('/dealerinterface/login')}
            >
              Вернуться к входу
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
