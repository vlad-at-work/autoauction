'use client';

import { useState } from 'react';
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
import { updateDealer } from '@/lib/admin/actions';

type DealerEditFormProps = {
  dealerId: string;
  username: string;
  name: string | null;
  subName: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  active: boolean;
};

export function DealerEditForm({
  dealerId,
  username,
  name,
  subName,
  phone,
  email,
  description,
  active,
}: DealerEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const [nextUsername, setNextUsername] = useState(username);
  const [nextName, setNextName] = useState(name ?? '');
  const [nextSubName, setNextSubName] = useState(subName ?? '');
  const [nextPhone, setNextPhone] = useState(phone ?? '');
  const [nextEmail, setNextEmail] = useState(email ?? '');
  const [nextDescription, setNextDescription] = useState(description ?? '');
  const [nextActive, setNextActive] = useState(active);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    const res = await updateDealer(dealerId, {
      username: nextUsername,
      name: nextName ? nextName : null,
      subName: nextSubName ? nextSubName : null,
      phone: nextPhone ? nextPhone : null,
      email: nextEmail ? nextEmail : null,
      description: nextDescription ? nextDescription : null,
      active: nextActive,
    });

    setLoading(false);

    if (!res.success) {
      setFieldErrors(res.fieldErrors ?? { _form: res.error });
      toast.error(res.error);
      return;
    }

    toast.success('Сохранено');
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fieldErrors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fieldErrors._form}
        </div>
      )}

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.username}>
          <FieldLabel>Username (логин)</FieldLabel>
          <FieldContent>
            <Input value={nextUsername} onChange={(e) => setNextUsername(e.target.value)} />
            <FieldDescription>Логин для входа в систему.</FieldDescription>
            <FieldError
              errors={[fieldErrors?.username ? { message: fieldErrors.username } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.name}>
          <FieldLabel>Имя дилера</FieldLabel>
          <FieldContent>
            <Input value={nextName} onChange={(e) => setNextName(e.target.value)} />
            <FieldError errors={[fieldErrors?.name ? { message: fieldErrors.name } : undefined]} />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.subName}>
          <FieldLabel>Дилерский центр / бренд</FieldLabel>
          <FieldContent>
            <Input value={nextSubName} onChange={(e) => setNextSubName(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.subName ? { message: fieldErrors.subName } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.phone}>
          <FieldLabel>Телефон</FieldLabel>
          <FieldContent>
            <Input value={nextPhone} onChange={(e) => setNextPhone(e.target.value)} />
            <FieldDescription>
              Для счетов/контакта, не влияет на уведомления в мессенджерах.
            </FieldDescription>
            <FieldError
              errors={[fieldErrors?.phone ? { message: fieldErrors.phone } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.email}>
          <FieldLabel>Email</FieldLabel>
          <FieldContent>
            <Input value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.email ? { message: fieldErrors.email } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.description}>
          <FieldLabel>Описание</FieldLabel>
          <FieldContent>
            <Textarea
              value={nextDescription}
              onChange={(e) => setNextDescription(e.target.value)}
              rows={4}
            />
            <FieldError
              errors={[fieldErrors?.description ? { message: fieldErrors.description } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="horizontal" data-invalid={!!fieldErrors?.active}>
          <Checkbox checked={nextActive} onCheckedChange={(v) => setNextActive(Boolean(v))} />
          <FieldContent>
            <FieldLabel>Активен</FieldLabel>
            <FieldDescription>
              Best-effort: используется для фильтров и будущих ограничений.
            </FieldDescription>
            <FieldError
              errors={[fieldErrors?.active ? { message: fieldErrors.active } : undefined]}
            />
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}
