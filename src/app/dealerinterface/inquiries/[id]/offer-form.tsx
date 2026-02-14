'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const offerFormSchema = z.object({
  price: z.string().min(1, 'Укажите цену'),
  comment: z.string().max(1000).optional(),
});

const offerSchema = z.object({
  price: z.coerce.number().int().positive().max(2000000000, 'Цена слишком большая'),
  comment: z.string().max(1000).optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

export function OfferForm({
  inquiryId,
  defaultPrice,
  defaultComment,
  disabled,
  offerNumber = 1,
  onOfferSubmitted,
}: {
  inquiryId: string;
  defaultPrice?: number;
  defaultComment?: string | null;
  disabled?: boolean;
  offerNumber?: number;
  onOfferSubmitted?: () => void;
}) {
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      price: defaultPrice?.toString() || '',
      comment: defaultComment || '',
    },
    mode: 'onTouched',
  });

  async function onSubmit(values: OfferFormValues) {
    const parsed = offerSchema.safeParse({
      price: values.price,
      comment: values.comment,
    });

    if (!parsed.success) {
      const priceError = parsed.error.issues.find((e) => e.path[0] === 'price');
      form.setError('price', { message: priceError?.message || 'Неверный формат цены' });
      return;
    }

    const webApp = getWebApp();
    const platform = detectPlatform();
    const initData = webApp?.initData;

    if (!initData || !platform) {
      form.setError('price', { message: 'Ошибка авторизации. Откройте через бота.' });
      return;
    }

    const res = await fetch('/api/dealer/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${platform}:dealer:${initData}`,
      },
      body: JSON.stringify({ inquiryId, ...parsed.data }),
    });

    const json = (await res.json()) as { error?: string; remainingOffers?: number };

    if (!res.ok) {
      const message = json.error || 'Не удалось сохранить предложение';
      form.setError('price', { type: 'server', message });
      return;
    }

    toast.success(`Предложение #${offerNumber} отправлено!`);
    form.reset({ price: '', comment: '' });

    if (onOfferSubmitted) {
      onOfferSubmitted();
    }
  }

  const isFirstOffer = offerNumber === 1;

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!form.formState.errors.price}>
          <FieldLabel htmlFor="price">Цена</FieldLabel>
          <FieldContent>
            <Input
              id="price"
              type="text"
              inputMode="numeric"
              placeholder="1500000"
              disabled={disabled}
              {...form.register('price')}
            />
            <FieldError errors={[form.formState.errors.price]} />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!form.formState.errors.comment}>
          <FieldLabel htmlFor="comment">Комментарий (необязательно)</FieldLabel>
          <FieldContent>
            <Textarea
              id="comment"
              disabled={disabled}
              placeholder="Например: в наличии, готов к выдаче"
              {...form.register('comment')}
            />
            <FieldError errors={[form.formState.errors.comment]} />
          </FieldContent>
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? 'Отправляем…'
          : isFirstOffer
            ? 'Отправить предложение'
            : 'Отправить новое предложение'}
      </Button>
    </form>
  );
}
