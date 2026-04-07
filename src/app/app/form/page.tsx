'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { useWebApp } from '@/hooks/use-webapp';

import { Button } from '@/components/ui/button';
import { getMyInquiries } from '@/lib/api/inquiries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { COLOR_OPTIONS, MODEL_SUBMODELS, TRANSMISSION_OPTIONS } from '@/lib/form-options';
import { inquiryCreateSchema, type InquiryCreateInput } from '@/lib/schemas/inquiry';

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; inquiryId: string }
  | { status: 'error'; message: string };

function MiniAppInquiryFormPageInner() {
  const router = useRouter();
  const {
    showBackButton,
    enableClosingConfirmation,
    disableClosingConfirmation,
    hapticNotification,
  } = useWebApp();

  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [ready, setReady] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const form = useForm<InquiryCreateInput>({
    resolver: zodResolver(inquiryCreateSchema),
    defaultValues: {
      platform: undefined,
      platformUserId: undefined,
      platformChatId: undefined,
      platformUserName: undefined,
      platformHandle: undefined,
      name: undefined,
      email: undefined,
      phone: undefined,
      transmission: undefined,
      color: undefined,
      comment: undefined,
      consent: false,
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const watched = useWatch({ control: form.control });
  const watchedModel = watched.model;
  const watchedSubmodel = watched.submodel;
  const watchedTransmission = watched.transmission;
  const watchedColor = watched.color;
  const watchedConsent = watched.consent;

  // Load WebApp user data into form - simple, no redirect logic
  useEffect(() => {
    let cancelled = false;

    const tryLoadUser = (attempt = 0) => {
      if (cancelled) return;

      const webApp = getWebApp();
      const platform = detectPlatform();
      const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
      const platformUserName =
        webApp?.initDataUnsafe?.user?.name || webApp?.initDataUnsafe?.user?.first_name;
      const platformHandle = webApp?.initDataUnsafe?.user?.username;
      const platformChatId = webApp?.initDataUnsafe?.chat?.id?.toString() || platformUserId;

      if (platform) {
        form.setValue('platform', platform, { shouldValidate: true });
      }

      if (platformUserId) {
        form.setValue('platformUserId', platformUserId, { shouldValidate: true });
      }

      if (platformChatId) {
        form.setValue('platformChatId', platformChatId);
      }

      if (platformUserName) {
        form.setValue('platformUserName', platformUserName);
      }

      if (platformHandle) {
        form.setValue('platformHandle', platformHandle);
      }

      // Mark as ready once we have user data or after timeout
      if ((platform && platformUserId) || attempt >= 40) {
        form
          .trigger([
            'platform',
            'platformUserId',
            'name',
            'phone',
            'model',
            'submodel',
            'transmission',
            'color',
            'consent',
          ])
          .catch(() => {});
        setReady(true);
        return;
      }

      window.setTimeout(() => tryLoadUser(attempt + 1), 50);
    };

    tryLoadUser();

    return () => {
      cancelled = true;
    };
  }, [form]);

  // BackButton navigates to dashboard
  useEffect(() => {
    showBackButton(() => router.push('/app/dashboard'));
  }, [showBackButton, router]);

  // Closing confirmation when form is dirty
  useEffect(() => {
    if (form.formState.isDirty && submitState.status !== 'success') {
      enableClosingConfirmation();
    } else {
      disableClosingConfirmation();
    }
  }, [
    form.formState.isDirty,
    submitState.status,
    enableClosingConfirmation,
    disableClosingConfirmation,
  ]);

  // Check inquiry limits - redirect if none left
  useEffect(() => {
    if (!ready) return;

    const checkLimits = async () => {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!initData || !platform) return;

      try {
        const { limits } = await getMyInquiries(initData, platform);
        if (limits && limits.remaining <= 0) {
          router.replace('/app/dashboard');
        }
      } catch {
        // Silently fail - let the user try to submit and handle error there
      }
    };

    checkLimits();
  }, [ready, router]);

  // Fetch buyer data to check for verified phone
  useEffect(() => {
    if (!ready) return;

    const fetchBuyerData = async () => {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!initData || !platform) return;

      try {
        const res = await fetch('/api/buyers/me', {
          headers: {
            Authorization: `Bearer ${platform}:customer:${initData}`,
          },
        });

        // Gate: if buyer not found or phone not verified, send back to entry point (MAX and Telegram)
        if (
          (platform === 'max' || platform === 'telegram') &&
          (res.status === 404 || res.status === 403)
        ) {
          router.replace('/app');
          return;
        }

        if (res.ok) {
          const data = (await res.json()) as { phone?: string; phoneVerified?: boolean };

          // Gate: phone must be verified to access the form (MAX and Telegram)
          if ((platform === 'max' || platform === 'telegram') && !data.phoneVerified) {
            router.replace('/app');
            return;
          }

          if (data.phone && data.phoneVerified) {
            form.setValue('phone', data.phone, { shouldValidate: true });
            form.trigger('phone').catch(() => {});
            setVerifiedPhone(data.phone);
          }
        }
      } catch {
        // Silently fail - phone field will remain editable
      }
    };

    fetchBuyerData();
  }, [ready, form, router]);

  const submodels = useMemo(() => {
    if (!watchedModel) return [];
    return MODEL_SUBMODELS[watchedModel] ?? [];
  }, [watchedModel]);

  useEffect(() => {
    if (!watchedModel || submodels.length === 0) return;
    const current = watchedSubmodel ?? form.getValues('submodel');
    if (!submodels.includes(current as never)) {
      form.setValue('submodel', submodels[0], { shouldValidate: true });
      form.trigger(['model', 'submodel']).catch(() => {});
    }
  }, [form, submodels, watchedSubmodel, watchedModel]);

  async function onSubmit(values: InquiryCreateInput) {
    setSubmitState({ status: 'submitting' });

    try {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!platform || !initData) {
        setSubmitState({ status: 'error', message: 'WebApp не загружен. Попробуйте снова.' });
        return;
      }

      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${platform}:customer:${initData}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const json = (await res.json()) as unknown;

      if (!res.ok) {
        const message =
          typeof json === 'object' && json && 'error' in json && typeof json.error === 'string'
            ? json.error
            : 'Не удалось отправить заявку';
        setSubmitState({ status: 'error', message });
        hapticNotification('error');
        return;
      }

      if (typeof json !== 'object' || !json || !('id' in json) || typeof json.id !== 'string') {
        setSubmitState({ status: 'error', message: 'Некорректный ответ сервера' });
        hapticNotification('error');
        return;
      }

      setSubmitState({ status: 'success', inquiryId: json.id });
      hapticNotification('success');
      disableClosingConfirmation();
      router.push('/app/dashboard');
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Не удалось отправить заявку',
      });
      hapticNotification('error');
    }
  }

  const blockedReason = useMemo(() => {
    if (submitState.status === 'submitting') return 'Отправляем заявку…';
    if (submitState.status === 'success') return 'Заявка уже отправлена';
    if (form.formState.isValid) return null;

    if (!watchedConsent) return 'Подтвердите согласие на обработку данных';
    if (!watchedModel) return 'Выберите модель автомобиля';
    if (!watchedSubmodel) return 'Уточните модель';
    if (!watchedTransmission) return 'Выберите коробку передач';
    if (!watchedColor) return 'Выберите цвет';
    if (!watched?.name || watched.name.trim().length < 2) return 'Введите имя (минимум 2 символа)';

    const rawPhone = watched?.phone ?? '';
    if (!/^\d{11}$/.test(rawPhone)) return 'Введите корректный номер: 11 цифр';

    if (!watched?.platform || !watched?.platformUserId)
      return 'Подождите, загружаем данные приложения';

    return 'Проверьте поля формы';
  }, [
    form.formState.isValid,
    submitState.status,
    watched,
    watchedColor,
    watchedConsent,
    watchedModel,
    watchedSubmodel,
    watchedTransmission,
  ]);

  const isSubmitDisabled =
    submitState.status === 'submitting' ||
    submitState.status === 'success' ||
    !form.formState.isValid;

  if (!ready) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader className="flex flex-col items-center gap-4">
          <Image src="/logo3.png" alt="Свои Авто" width={64} height={64} className="h-16 w-auto" />
          <div className="flex flex-col items-center gap-2">
            <CardTitle className="text-center text-xl">Заявка на автомобиль</CardTitle>
            <p className="text-muted-foreground text-center text-base">
              Заполните форму - дилеры ответят в течение 24 часов.
            </p>
            <p className="text-muted-foreground text-center text-base">
              {/* <span className="font-bold"> */}
              Мы храним ваши данные в РФ в соответствии с законодательством (152‑ФЗ)
              {/* </span> */}
            </p>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Error message - moved inside form and made sticky */}
            {submitState.status === 'error' && (
              <div className="sticky top-0 z-10 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-base text-destructive shadow-sm">
                {submitState.message}
              </div>
            )}
            <input type="hidden" {...form.register('platform')} />
            <input type="hidden" {...form.register('platformUserId')} />
            <input type="hidden" {...form.register('platformChatId')} />
            <input type="hidden" {...form.register('platformUserName')} />
            <input type="hidden" {...form.register('platformHandle')} />

            <FieldGroup>
              <Field
                orientation="vertical"
                data-invalid={!!form.formState.errors.name && !!form.formState.touchedFields.name}
              >
                <FieldLabel htmlFor="name">Имя</FieldLabel>
                <FieldContent>
                  <Input id="name" {...form.register('name')} placeholder="Как к вам обращаться" />
                  <FieldError
                    errors={[
                      form.formState.touchedFields.name ? form.formState.errors.name : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>

              <Field
                orientation="vertical"
                data-invalid={!!form.formState.errors.phone && !!form.formState.touchedFields.phone}
              >
                <FieldLabel htmlFor="phone" className="flex items-center gap-2">
                  Подтвержденный аккаунт
                  {verifiedPhone && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <Shield className="h-3 w-3" />
                      Подтверждён
                    </span>
                  )}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="79991234567"
                    readOnly={!!verifiedPhone}
                    className={verifiedPhone ? 'bg-muted' : ''}
                    {...form.register('phone', {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      },
                    })}
                  />
                  <FieldError
                    errors={[
                      form.formState.touchedFields.phone ? form.formState.errors.phone : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>

              <Field
                orientation="vertical"
                data-invalid={!!form.formState.errors.email && !!form.formState.touchedFields.email}
              >
                <FieldLabel htmlFor="email">Эл. почта (необязательно)</FieldLabel>
                <FieldContent>
                  <Input id="email" {...form.register('email')} placeholder="you@example.com" />
                  <FieldError
                    errors={[
                      form.formState.touchedFields.email ? form.formState.errors.email : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field
                orientation="vertical"
                data-invalid={!!form.formState.errors.model && !!form.formState.touchedFields.model}
              >
                <FieldLabel>Модель</FieldLabel>
                <FieldContent>
                  <Select
                    value={watchedModel}
                    onValueChange={(value) =>
                      form.setValue('model', value as never, {
                        shouldValidate: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(MODEL_SUBMODELS).map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={[
                      form.formState.touchedFields.model ? form.formState.errors.model : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>

              <Field
                orientation="vertical"
                data-invalid={
                  !!form.formState.errors.submodel && !!form.formState.touchedFields.submodel
                }
              >
                <FieldLabel>Уточните модель</FieldLabel>
                <FieldContent>
                  <Select
                    value={watchedSubmodel}
                    onValueChange={(value) =>
                      form.setValue('submodel', value as never, {
                        shouldValidate: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите вариант" />
                    </SelectTrigger>
                    <SelectContent>
                      {submodels.map((submodel) => (
                        <SelectItem key={submodel} value={submodel}>
                          {submodel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={[
                      form.formState.touchedFields.submodel
                        ? form.formState.errors.submodel
                        : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>

              <Field
                orientation="vertical"
                data-invalid={
                  !!form.formState.errors.transmission &&
                  !!form.formState.touchedFields.transmission
                }
              >
                <FieldLabel>Коробка</FieldLabel>
                <FieldContent>
                  <div className="grid gap-2">
                    {TRANSMISSION_OPTIONS.map((option) => (
                      <div
                        key={option}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                        onClick={() =>
                          form.setValue('transmission', option as never, {
                            shouldValidate: true,
                            shouldTouch: true,
                          })
                        }
                      >
                        <div
                          className={cn(
                            'flex size-4 rounded-full border shrink-0 items-center justify-center',
                            watchedTransmission === option
                              ? 'bg-primary border-primary'
                              : 'border-input'
                          )}
                        >
                          {watchedTransmission === option && (
                            <div className="size-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                  <FieldError
                    errors={[
                      form.formState.touchedFields.transmission
                        ? form.formState.errors.transmission
                        : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>

              <Field
                orientation="vertical"
                data-invalid={!!form.formState.errors.color && !!form.formState.touchedFields.color}
              >
                <FieldLabel>Цвет</FieldLabel>
                <FieldContent>
                  <Select
                    value={watchedColor}
                    onValueChange={(value) =>
                      form.setValue('color', value as never, {
                        shouldValidate: true,
                        shouldTouch: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите цвет" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={[
                      form.formState.touchedFields.color ? form.formState.errors.color : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field
                orientation="vertical"
                data-invalid={
                  !!form.formState.errors.comment && !!form.formState.touchedFields.comment
                }
              >
                <FieldLabel htmlFor="comment">Комментарий (необязательно)</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="comment"
                    {...form.register('comment')}
                    placeholder="Любые детали…"
                  />
                  <FieldError
                    errors={[
                      form.formState.touchedFields.comment
                        ? form.formState.errors.comment
                        : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field
                orientation="vertical"
                data-invalid={
                  !!form.formState.errors.consent && !!form.formState.touchedFields.consent
                }
              >
                <FieldLabel className="w-full cursor-pointer flex gap-3 items-start">
                  <Checkbox
                    className="size-6 mt-1 shrink-0"
                    checked={watchedConsent === true}
                    onCheckedChange={(checked) => {
                      form.setValue('consent', checked === true, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <div className="text-base font-medium">Согласие</div>
                    <FieldDescription>
                      Я согласен(на) на обработку данных для получения предложений от дилеров.
                    </FieldDescription>
                  </div>
                </FieldLabel>
                <FieldContent>
                  <FieldError
                    errors={[
                      form.formState.touchedFields.consent
                        ? form.formState.errors.consent
                        : undefined,
                    ]}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                size="lg"
                className="min-h-14 text-base font-semibold"
                disabled={isSubmitDisabled}
              >
                {submitState.status === 'submitting' ? (
                  'Отправляем…'
                ) : submitState.status === 'success' ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Заявка отправлена!
                  </>
                ) : (
                  'Отправить'
                )}
              </Button>

              {isSubmitDisabled && blockedReason && (
                <p className="text-muted-foreground text-sm">{blockedReason}</p>
              )}

              <Button asChild variant="outline" size="lg" type="button" className="text-base">
                <Link href="/app">Назад</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MiniAppInquiryFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      }
    >
      <MiniAppInquiryFormPageInner />
    </Suspense>
  );
}
