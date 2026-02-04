'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

function SetupPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealerId = searchParams.get('dealerId');
  const nextParam = searchParams.get('next');
  const nextPath = nextParam && nextParam.startsWith('/dealerinterface') ? nextParam : null;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dealerInfo, setDealerInfo] = useState<{ username: string; name?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch dealer info on mount
  useEffect(() => {
    if (!dealerId) return;

    const fetchDealerInfo = async () => {
      try {
        const webApp = getWebApp();
        const platform = detectPlatform();
        const initData = webApp?.initData;

        if (!initData || !platform) return;

        const response = await fetch(`/api/dealerinterface/dealer-info?dealerId=${dealerId}`, {
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setDealerInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch dealer info:', err);
      }
    };

    fetchDealerInfo();
  }, [dealerId]);

  const handleCopyId = async () => {
    if (!dealerInfo?.username) return;
    try {
      await navigator.clipboard.writeText(dealerInfo.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

      const response = await fetch('/api/dealerinterface/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platform}:dealer:${initData}`,
        },
        body: JSON.stringify({
          dealerId,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка установки пароля');
      }

      // Password set successfully, redirect to dashboard
      router.replace(nextPath || '/dealerinterface/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
      setLoading(false);
    }
  };

  if (!dealerId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-destructive">Ошибка: не указан ID дилера</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Добро пожаловать!</CardTitle>
          <CardDescription>
            {dealerInfo?.name
              ? `${dealerInfo.name}, установите пароль для входа`
              : 'Установите пароль для входа в систему дилера'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dealerInfo && (
            <div className="mb-6 rounded-lg bg-muted p-4">
              <Label className="text-sm text-muted-foreground">Ваш ID дилера</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1 font-mono text-lg">
                  {dealerInfo.username}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyId}
                  className="shrink-0"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Сохраните этот ID - он понадобится для восстановления доступа
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
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
              Установить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  );
}
