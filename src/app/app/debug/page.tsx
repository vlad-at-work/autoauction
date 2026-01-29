'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { MOCK_USERS } from '@/lib/debug/mock-data';

export default function DebugPage() {
  const router = useRouter();
  const { enableDebugMode } = useDebugMode();
  const [useMockData, setUseMockData] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Режим отладки недоступен в production</p>
      </div>
    );
  }

  const handleContinue = () => {
    if (!selectedUser) {
      toast.error('Пожалуйста, выберите пользователя');
      return;
    }

    enableDebugMode(selectedUser, useMockData);
    router.push('/app/dashboard');
  };

  const handleCreateDebugBuyer = async () => {
    const debugUserId = `debug_${Date.now()}`;
    const debugName = `Debug User ${Math.floor(Math.random() * 1000)}`;

    try {
      const res = await fetch('/api/buyers/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'max',
          platformUserId: debugUserId,
          platformUserName: debugName,
        }),
      });

      if (!res.ok) throw new Error('Failed to create buyer');

      enableDebugMode(debugUserId, false);
      toast.success(`Создан ${debugName}`);
      router.push('/app/dashboard');
    } catch (error) {
      toast.error('Ошибка при создании тестового покупателя');
      console.error(error);
    }
  };

  const handleClearDebugData = async () => {
    try {
      const res = await fetch('/api/debug/clear', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear data');

      const data = (await res.json()) as { deleted: number };
      toast.success(`Удалено ${data.deleted} тестовых покупателей`);
    } catch (error) {
      toast.error('Ошибка при очистке данных');
      console.error(error);
    }
  };

  const mockUserEntries = Object.entries(MOCK_USERS);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Режим отладки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="useMockData"
              checked={useMockData}
              onCheckedChange={(checked) => setUseMockData(checked === true)}
            />
            <label
              htmlFor="useMockData"
              className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              Использовать тестовые данные
            </label>
          </div>

          {useMockData && (
            <div className="flex flex-col gap-2">
              <label htmlFor="userSelect" className="text-sm font-medium">
                Выберите тестового пользователя:
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="userSelect">
                  <SelectValue placeholder="Выберите пользователя..." />
                </SelectTrigger>
                <SelectContent>
                  {mockUserEntries.map(([userId, user]) => (
                    <SelectItem key={userId} value={userId}>
                      {user.name} ({user.inquiries.length} заяв
                      {user.inquiries.length === 1 ? 'ка' : 'ок'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleContinue} disabled={!selectedUser}>
                Продолжить как{' '}
                {selectedUser ? MOCK_USERS[selectedUser]?.name : 'Выбранный пользователь'}
              </Button>
            </div>
          )}

          <div className="border-border border-t pt-6">
            <p className="mb-4 text-sm font-medium">Режим реальной БД:</p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleCreateDebugBuyer} variant="outline">
                Создать тестового покупателя
              </Button>
              <Button onClick={handleClearDebugData} variant="destructive">
                Очистить все тестовые данные
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
