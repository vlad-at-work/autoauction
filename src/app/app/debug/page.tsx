'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

  const handleClearAllData = async () => {
    if (!confirm('ВНИМАНИЕ: Это удалит ВСЕ данные из базы данных. Продолжить?')) {
      return;
    }

    try {
      const res = await fetch('/api/debug/clear-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear all data');

      const data = (await res.json()) as { deleted: number };
      toast.success(`Удалено ${data.deleted} всех покупателей`);
    } catch (error) {
      toast.error('Ошибка при очистке всех данных');
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
              <Button
                onClick={handleCreateDebugBuyer}
                variant="outline"
                className="h-auto whitespace-normal"
              >
                Создать тестового покупателя
              </Button>
              <Button
                onClick={handleClearDebugData}
                variant="destructive"
                className="h-auto whitespace-normal"
              >
                Очистить тестовые данные (debug_*)
              </Button>
              <Button
                onClick={handleClearAllData}
                variant="destructive"
                className="h-auto whitespace-normal bg-red-600 hover:bg-red-700"
              >
                ⚠️ Очистить ВСЮ базу данных
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Справка по тестовым сценариям</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Олег Тестов (3 заявки)</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm">
                  Этот пользователь имеет 3 активные заявки с разным количеством предложений от
                  дилеров:
                </p>
                <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Land Cruiser 250 First Edition - 2 предложения</li>
                  <li>GR Yaris Rally - 0 предложений (новая заявка без откликов)</li>
                  <li>Prius AWD-e - 1 предложение</li>
                </ul>
                <p className="text-muted-foreground mt-2 text-sm">
                  Используйте этот сценарий для тестирования отображения карточек заявок с разными
                  состояниями предложений.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>Дима Пустой (0 заявок)</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm">
                  У этого пользователя нет ни одной заявки. Вы увидите пустое состояние панели с
                  текстом: &quot;Используйте кнопку + в правом верхнем углу, чтобы создать свою
                  первую заявку.&quot;
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Используйте этот сценарий для тестирования UX для новых пользователей.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>Сергей Просрочен (2 заявки)</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm">
                  Этот пользователь имеет 2 просроченные заявки (срок действия истек):
                </p>
                <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Camry Hybrid - истекла вчера, 3 предложения</li>
                  <li>RAV4 Prime - истекла 2 дня назад, 1 предложение</li>
                </ul>
                <p className="text-muted-foreground mt-2 text-sm">
                  Карточки отображаются серыми с надписью &quot;Истекло&quot; вместо таймера.
                  Используйте этот сценарий для тестирования отображения просроченных заявок.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>Анна Смешан (1 активная, 1 просроченная)</AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground text-sm">
                  У этого пользователя смешанное состояние:
                </p>
                <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>Corolla Cross - активная заявка с 2 предложениями</li>
                  <li>Highlander Hybrid - просроченная заявка с 0 предложениями</li>
                </ul>
                <p className="text-muted-foreground mt-2 text-sm">
                  Используйте этот сценарий для тестирования отображения активных и просроченных
                  заявок вместе на одной панели.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
