'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createBuyer } from '@/lib/admin/actions';

export function BuyerCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<'MAX' | 'TELEGRAM'>('TELEGRAM');
  const [platformUserId, setPlatformUserId] = useState('');
  const [platformChatId, setPlatformChatId] = useState('');
  const [platformUserName, setPlatformUserName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    const res = await createBuyer({
      platform,
      platformUserId,
      platformChatId: platformChatId ? platformChatId : null,
      platformUserName: platformUserName ? platformUserName : null,
    });

    setLoading(false);

    if (!res.success) {
      setFieldErrors(res.fieldErrors ?? { _form: res.error });
      toast.error(res.error);
      return;
    }

    toast.success('Покупатель создан');
    if (res.id) {
      router.push(`/admin/buyers/${res.id}`);
      return;
    }
    router.push('/admin/buyers');
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fieldErrors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fieldErrors._form}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        ⚠️ Создание покупателя вручную — крайний случай. Обычно покупатель появляется после открытия
        мини‑приложения и создания заявки.
      </div>

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.platform}>
          <FieldLabel>Платформа</FieldLabel>
          <FieldContent>
            <Select value={platform} onValueChange={(v) => setPlatform(v as 'MAX' | 'TELEGRAM')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите платформу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TELEGRAM">TELEGRAM</SelectItem>
                <SelectItem value="MAX">MAX</SelectItem>
              </SelectContent>
            </Select>
            <FieldError
              errors={[fieldErrors?.platform ? { message: fieldErrors.platform } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.platformUserId}>
          <FieldLabel>ID пользователя</FieldLabel>
          <FieldContent>
            <Input value={platformUserId} onChange={(e) => setPlatformUserId(e.target.value)} />
            <FieldDescription>Не редактируется после создания.</FieldDescription>
            <FieldError
              errors={[
                fieldErrors?.platformUserId ? { message: fieldErrors.platformUserId } : undefined,
              ]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.platformChatId}>
          <FieldLabel>Chat ID (опционально)</FieldLabel>
          <FieldContent>
            <Input value={platformChatId} onChange={(e) => setPlatformChatId(e.target.value)} />
            <FieldError
              errors={[
                fieldErrors?.platformChatId ? { message: fieldErrors.platformChatId } : undefined,
              ]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.platformUserName}>
          <FieldLabel>Имя в платформе (опционально)</FieldLabel>
          <FieldContent>
            <Input value={platformUserName} onChange={(e) => setPlatformUserName(e.target.value)} />
            <FieldError
              errors={[
                fieldErrors?.platformUserName
                  ? { message: fieldErrors.platformUserName }
                  : undefined,
              ]}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Создание…' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}
