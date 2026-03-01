'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { useWebApp } from '@/hooks/use-webapp';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const offerFormSchema = z.object({
  price: z.string().min(1, 'Укажите цену'),
  configuration: z.string().min(1, 'Укажите комплектацию').max(500),
  deliveryTime: z.string().min(1, 'Укажите сроки поставки').max(200),
  additionalComments: z.string().max(1000).optional(),
  confirmedMatch: z.boolean().refine((val) => val === true, {
    message: 'Необходимо подтвердить совпадение с требованиями',
  }),
});

const offerSchema = z.object({
  price: z.coerce.number().int().positive().max(2000000000, 'Цена слишком большая'),
  configuration: z.string().min(1).max(500),
  deliveryTime: z.string().min(1).max(200),
  additionalComments: z.string().max(1000).optional(),
  confirmedMatch: z.boolean(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

export function OfferForm({
  inquiryId,
  disabled,
  offerNumber = 1,
  onOfferSubmitted,
}: {
  inquiryId: string;
  disabled?: boolean;
  offerNumber?: number;
  onOfferSubmitted?: () => void;
}) {
  const { enableClosingConfirmation, disableClosingConfirmation, hapticNotification } = useWebApp();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      price: '',
      configuration: '',
      deliveryTime: '',
      additionalComments: '',
      confirmedMatch: false,
    },
    mode: 'onTouched',
  });

  // Closing confirmation when form is dirty
  useEffect(() => {
    if (form.formState.isDirty) {
      enableClosingConfirmation();
    } else {
      disableClosingConfirmation();
    }
  }, [form.formState.isDirty, enableClosingConfirmation, disableClosingConfirmation]);

  async function onSubmit(values: OfferFormValues) {
    const parsed = offerSchema.safeParse({
      price: values.price,
      configuration: values.configuration,
      deliveryTime: values.deliveryTime,
      additionalComments: values.additionalComments,
      confirmedMatch: values.confirmedMatch,
    });

    if (!parsed.success) {
      const priceError = parsed.error.issues.find((e) => e.path[0] === 'price');
      if (priceError) {
        form.setError('price', { message: priceError.message });
      }
      const confirmError = parsed.error.issues.find((e) => e.path[0] === 'confirmedMatch');
      if (confirmError) {
        form.setError('confirmedMatch', { message: confirmError.message });
      }
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
      hapticNotification('error');
      return;
    }

    hapticNotification('success');
    disableClosingConfirmation();
    toast.success(`Предложение #${offerNumber} отправлено!`);
    setIsSuccess(true);
    form.reset({
      price: '',
      configuration: '',
      deliveryTime: '',
      additionalComments: '',
      confirmedMatch: false,
    });

    // Reset success state after a delay so button becomes active again
    setTimeout(() => setIsSuccess(false), 2000);

    if (onOfferSubmitted) {
      onOfferSubmitted();
    }
  }

  const isFirstOffer = offerNumber === 1;

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {/* Price */}
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

        {/* Configuration */}
        <Field orientation="vertical" data-invalid={!!form.formState.errors.configuration}>
          <FieldLabel htmlFor="configuration">Комплектация</FieldLabel>
          <FieldContent>
            <Input
              id="configuration"
              disabled={disabled}
              placeholder="Например: Prestige, Comfort, Base"
              {...form.register('configuration')}
            />
            <FieldError errors={[form.formState.errors.configuration]} />
          </FieldContent>
        </Field>

        {/* Delivery Time */}
        <Field orientation="vertical" data-invalid={!!form.formState.errors.deliveryTime}>
          <FieldLabel htmlFor="deliveryTime">Сроки поставки</FieldLabel>
          <FieldContent>
            <Input
              id="deliveryTime"
              disabled={disabled}
              placeholder="Например: в наличии, 2 недели, 1 месяц"
              {...form.register('deliveryTime')}
            />
            <FieldError errors={[form.formState.errors.deliveryTime]} />
          </FieldContent>
        </Field>

        {/* Additional Comments */}
        <Field orientation="vertical" data-invalid={!!form.formState.errors.additionalComments}>
          <FieldLabel htmlFor="additionalComments">Дополнительные комментарии</FieldLabel>
          <FieldContent>
            <Textarea
              id="additionalComments"
              disabled={disabled}
              placeholder="Любая дополнительная информация о предложении"
              {...form.register('additionalComments')}
            />
            <FieldError errors={[form.formState.errors.additionalComments]} />
          </FieldContent>
        </Field>

        {/* Confirmation Checkbox */}
        <Field
          orientation="horizontal"
          data-invalid={!!form.formState.errors.confirmedMatch}
          className="items-start gap-3"
        >
          <Checkbox
            id="confirmedMatch"
            disabled={disabled}
            checked={form.watch('confirmedMatch')}
            onCheckedChange={(checked) => form.setValue('confirmedMatch', checked === true)}
          />
          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="confirmedMatch" className="text-sm font-normal leading-tight">
              Подтверждаю полное совпадение предложения автосалона с выбранной покупателем моделью,
              цветом и другими параметрами. Дополнительно могу предложить альтернативный выгодный
              вариант
            </FieldLabel>
            <FieldError errors={[form.formState.errors.confirmedMatch]} />
          </div>
        </Field>
      </FieldGroup>

      <Button
        type="submit"
        disabled={disabled || form.formState.isSubmitting || isSuccess}
        variant={isSuccess ? 'default' : undefined}
      >
        {form.formState.isSubmitting ? (
          'Отправляем…'
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Предложение отправлено!
          </>
        ) : isFirstOffer ? (
          'Отправить предложение'
        ) : (
          'Отправить новое предложение'
        )}
      </Button>
    </form>
  );
}
