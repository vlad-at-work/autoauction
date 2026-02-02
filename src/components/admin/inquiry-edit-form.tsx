'use client';

import { useMemo, useState } from 'react';
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
import { updateInquiry } from '@/lib/admin/actions';

type InquiryEditFormProps = {
  inquiryId: string;
  buyerId: string;
  name: string;
  email: string | null;
  phone: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  status: string | null;
  statusDescription: string | null;
  comment: string | null;
  expiresAt: Date;
  isExpired: boolean;
};

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function InquiryEditForm({
  inquiryId,
  buyerId,
  name,
  email,
  phone,
  model,
  submodel,
  transmission,
  color,
  status,
  statusDescription,
  comment,
  expiresAt,
  isExpired,
}: InquiryEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const [nextBuyerId, setNextBuyerId] = useState(buyerId);
  const [nextName, setNextName] = useState(name);
  const [nextEmail, setNextEmail] = useState(email ?? '');
  const [nextPhone, setNextPhone] = useState(phone);
  const [nextModel, setNextModel] = useState(model);
  const [nextSubmodel, setNextSubmodel] = useState(submodel);
  const [nextTransmission, setNextTransmission] = useState(transmission);
  const [nextColor, setNextColor] = useState(color);
  const [nextStatus, setNextStatus] = useState(status ?? '');
  const [nextStatusDescription, setNextStatusDescription] = useState(statusDescription ?? '');
  const [nextComment, setNextComment] = useState(comment ?? '');
  const [nextExpiresAt, setNextExpiresAt] = useState(toDateTimeLocalValue(expiresAt));
  const [notifyBuyerFlag, setNotifyBuyerFlag] = useState(false);

  const parsedExpiresAt = useMemo(() => {
    const parsed = new Date(nextExpiresAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [nextExpiresAt]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    if (!parsedExpiresAt) {
      setLoading(false);
      setFieldErrors({ expiresAt: 'Некорректная дата окончания' });
      return;
    }

    const res = await updateInquiry(inquiryId, {
      buyerId: nextBuyerId,
      name: nextName,
      email: nextEmail ? nextEmail : null,
      phone: nextPhone,
      model: nextModel,
      submodel: nextSubmodel,
      transmission: nextTransmission,
      color: nextColor,
      status: nextStatus ? nextStatus : null,
      statusDescription: nextStatusDescription ? nextStatusDescription : null,
      comment: nextComment ? nextComment : null,
      expiresAt: parsedExpiresAt,
      notifyBuyer: notifyBuyerFlag,
    });

    setLoading(false);

    if (!res.success) {
      setFieldErrors(res.fieldErrors ?? { _form: res.error });
      toast.error(res.error);
      return;
    }

    if (res.warning) {
      toast.warning(res.warning);
    } else {
      toast.success('Сохранено');
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {fieldErrors?._form && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {fieldErrors._form}
        </div>
      )}

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        ⚠️ Изменение заявки — крайняя мера. Некорректные правки могут запутать покупателя и дилеров.
      </div>

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.buyerId}>
          <FieldLabel>Buyer ID</FieldLabel>
          <FieldContent>
            <Input value={nextBuyerId} onChange={(e) => setNextBuyerId(e.target.value)} />
            <FieldDescription>Опасно: меняет владельца заявки.</FieldDescription>
            <FieldError
              errors={[fieldErrors?.buyerId ? { message: fieldErrors.buyerId } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.name}>
          <FieldLabel>Имя</FieldLabel>
          <FieldContent>
            <Input value={nextName} onChange={(e) => setNextName(e.target.value)} />
            <FieldError errors={[fieldErrors?.name ? { message: fieldErrors.name } : undefined]} />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.phone}>
          <FieldLabel>Телефон</FieldLabel>
          <FieldContent>
            <Input value={nextPhone} onChange={(e) => setNextPhone(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.phone ? { message: fieldErrors.phone } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.email}>
          <FieldLabel>Email (опционально)</FieldLabel>
          <FieldContent>
            <Input value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.email ? { message: fieldErrors.email } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.model}>
          <FieldLabel>Модель</FieldLabel>
          <FieldContent>
            <Input value={nextModel} onChange={(e) => setNextModel(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.model ? { message: fieldErrors.model } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.submodel}>
          <FieldLabel>Подмодель</FieldLabel>
          <FieldContent>
            <Input value={nextSubmodel} onChange={(e) => setNextSubmodel(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.submodel ? { message: fieldErrors.submodel } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.transmission}>
          <FieldLabel>Коробка передач</FieldLabel>
          <FieldContent>
            <Input value={nextTransmission} onChange={(e) => setNextTransmission(e.target.value)} />
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
            <Input value={nextColor} onChange={(e) => setNextColor(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.color ? { message: fieldErrors.color } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.status}>
          <FieldLabel>Статус (опционально)</FieldLabel>
          <FieldContent>
            <Input value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} />
            <FieldError
              errors={[fieldErrors?.status ? { message: fieldErrors.status } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.statusDescription}>
          <FieldLabel>Описание статуса (опционально)</FieldLabel>
          <FieldContent>
            <Textarea
              value={nextStatusDescription}
              onChange={(e) => setNextStatusDescription(e.target.value)}
              rows={3}
            />
            <FieldError
              errors={[
                fieldErrors?.statusDescription
                  ? { message: fieldErrors.statusDescription }
                  : undefined,
              ]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.comment}>
          <FieldLabel>Комментарий (опционально)</FieldLabel>
          <FieldContent>
            <Textarea
              value={nextComment}
              onChange={(e) => setNextComment(e.target.value)}
              rows={3}
            />
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
              value={nextExpiresAt}
              onChange={(e) => setNextExpiresAt(e.target.value)}
            />
            <FieldDescription>
              ⚠️ Продление может снова открыть окно для предложений дилеров.
            </FieldDescription>
            <FieldError
              errors={[fieldErrors?.expiresAt ? { message: fieldErrors.expiresAt } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            checked={notifyBuyerFlag}
            onCheckedChange={(v) => setNotifyBuyerFlag(Boolean(v))}
          />
          <FieldContent>
            <FieldLabel>Уведомить покупателя</FieldLabel>
            <FieldDescription>
              Последний вариант.{' '}
              {isExpired
                ? 'Заявка истекла — уведомление не будет отправлено.'
                : 'Отправим короткое сообщение в мессенджер.'}
            </FieldDescription>
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
