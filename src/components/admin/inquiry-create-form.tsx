'use client';

import { useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { createInquiry } from '@/lib/admin/actions';
import { toDateTimeLocalValue } from '@/lib/date-utils';

export function InquiryCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const [buyerId, setBuyerId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('');
  const [submodel, setSubmodel] = useState('');
  const [transmission, setTransmission] = useState('');
  const [color, setColor] = useState('');

  const [comment, setComment] = useState('');
  const [expiresAt, setExpiresAt] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );

  const parsedExpiresAt = useMemo(() => {
    const parsed = new Date(expiresAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [expiresAt]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    if (!parsedExpiresAt) {
      setLoading(false);
      setFieldErrors({ expiresAt: 'Некорректная дата окончания' });
      return;
    }

    const res = await createInquiry({
      buyerId,
      name,
      email: email ? email : null,
      phone,
      model,
      submodel,
      transmission,
      color,
      comment: comment ? comment : null,
      expiresAt: parsedExpiresAt,
    });

    setLoading(false);

    if (!res.success) {
      setFieldErrors(res.fieldErrors ?? { _form: res.error });
      toast.error(res.error);
      return;
    }

    toast.success('Заявка создана');
    if (res.id) {
      router.push(`/admin/inquiries/${res.id}`);
      return;
    }
    router.push('/admin/inquiries');
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fieldErrors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fieldErrors._form}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        ⚠️ Создание заявки вручную — крайний случай. По умолчанию покупатель создаёт заявку через
        мини‑приложение.
      </div>

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.buyerId}>
          <FieldLabel>Buyer ID</FieldLabel>
          <FieldContent>
            <Input value={buyerId} onChange={(e) => setBuyerId(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.buyerId ? { message: fieldErrors.buyerId } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.name}>
          <FieldLabel>Имя</FieldLabel>
          <FieldContent>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError errors={[fieldErrors?.name ? { message: fieldErrors.name } : undefined]} />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.phone}>
          <FieldLabel>Телефон</FieldLabel>
          <FieldContent>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="79991234567"
            />
            <FieldError
              errors={[fieldErrors?.phone ? { message: fieldErrors.phone } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.email}>
          <FieldLabel>Email (опционально)</FieldLabel>
          <FieldContent>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.email ? { message: fieldErrors.email } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.model}>
          <FieldLabel>Модель</FieldLabel>
          <FieldContent>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.model ? { message: fieldErrors.model } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.submodel}>
          <FieldLabel>Подмодель</FieldLabel>
          <FieldContent>
            <Input value={submodel} onChange={(e) => setSubmodel(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.submodel ? { message: fieldErrors.submodel } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.transmission}>
          <FieldLabel>Коробка передач</FieldLabel>
          <FieldContent>
            <Input value={transmission} onChange={(e) => setTransmission(e.target.value)} />
            <FieldError
              errors={[
                fieldErrors?.transmission ? { message: fieldErrors.transmission } : undefined,
              ]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.color}>
          <FieldLabel>Цвет</FieldLabel>
          <FieldContent>
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.color ? { message: fieldErrors.color } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.comment}>
          <FieldLabel>Комментарий (опционально)</FieldLabel>
          <FieldContent>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            <FieldError
              errors={[fieldErrors?.comment ? { message: fieldErrors.comment } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.expiresAt}>
          <FieldLabel>Истекает</FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <FieldDescription>Обычно это 24 часа от момента создания.</FieldDescription>
            <FieldError
              errors={[fieldErrors?.expiresAt ? { message: fieldErrors.expiresAt } : undefined]}
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
