'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createDealer } from '@/lib/admin/actions';

export function DealerCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('Новый Дилер');
  const [subName, setSubName] = useState('AutoTrade');
  const [phone, setPhone] = useState('+7');
  const [email, setEmail] = useState('dealer@example.com');
  const [description, setDescription] = useState(
    'Автодилер. Продажа новых и подержанных автомобилей.'
  );
  const [active, setActive] = useState(true);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    const res = await createDealer({
      username,
      name,
      subName,
      phone,
      email,
      description,
      active,
    });

    setLoading(false);

    if (!res.success) {
      setFieldErrors(res.fieldErrors ?? { _form: res.error });
      toast.error(res.error);
      return;
    }

    toast.success('Дилер создан');
    if (res.id) {
      router.push(`/admin/dealers/${res.id}`);
      return;
    }
    router.push('/admin/dealers');
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fieldErrors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fieldErrors._form}
        </div>
      )}

      <div className="rounded-md border bg-blue-100 px-3 py-2 text-sm text-blue-900">
        ℹ️ После создания откройте карточку дилера и отправьте ему ссылку приглашения
        (Telegram/MAX). По этой ссылке дилер привяжет свой аккаунт к профилю и установит пароль при
        первом входе. (Авто-привязка без ссылки возможна только если в системе ровно один
        непривязанный дилер.)
      </div>

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.username}>
          <FieldLabel>Username (логин)</FieldLabel>
          <FieldContent>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            <FieldDescription>Immutable: не редактируется после создания.</FieldDescription>
            <FieldError
              errors={[fieldErrors?.username ? { message: fieldErrors.username } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.name}>
          <FieldLabel>Имя дилера</FieldLabel>
          <FieldContent>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError errors={[fieldErrors?.name ? { message: fieldErrors.name } : undefined]} />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.subName}>
          <FieldLabel>Дилерский центр / бренд</FieldLabel>
          <FieldContent>
            <Input value={subName} onChange={(e) => setSubName(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.subName ? { message: fieldErrors.subName } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.phone}>
          <FieldLabel>Телефон</FieldLabel>
          <FieldContent>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.phone ? { message: fieldErrors.phone } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.email}>
          <FieldLabel>Email</FieldLabel>
          <FieldContent>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.email ? { message: fieldErrors.email } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.description}>
          <FieldLabel>Описание</FieldLabel>
          <FieldContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
            <FieldError
              errors={[fieldErrors?.description ? { message: fieldErrors.description } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="horizontal" data-invalid={!!fieldErrors?.active}>
          <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} />
          <FieldContent>
            <FieldLabel>Активен</FieldLabel>
            <FieldError
              errors={[fieldErrors?.active ? { message: fieldErrors.active } : undefined]}
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
