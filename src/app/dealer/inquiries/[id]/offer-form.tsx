'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
}: {
  inquiryId: string;
  defaultPrice?: number;
  defaultComment?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
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
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId, ...parsed.data }),
    });

    if (!res.ok) {
      const json = (await res.json()) as unknown;
      const message =
        typeof json === 'object' && json && 'error' in json && typeof json.error === 'string'
          ? json.error
          : 'Не удалось сохранить предложение';
      form.setError('price', { type: 'server', message });
      return;
    }

    router.refresh();
  }

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
            <Textarea id="comment" disabled={disabled} {...form.register('comment')} />
            <FieldError errors={[form.formState.errors.comment]} />
          </FieldContent>
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Сохраняем…' : 'Сохранить'}
      </Button>
    </form>
  );
}
