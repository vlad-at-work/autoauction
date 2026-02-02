'use client';

import { useMemo, useState } from 'react';
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
import { updateBuyer } from '@/lib/admin/actions';
import { toDateTimeLocalValue } from '@/lib/date-utils';

type BuyerEditFormProps = {
  buyerId: string;
  inquiriesUsedThisMonth: number;
  inquiryLimitResetAt: Date;
};

export function BuyerEditForm({
  buyerId,
  inquiriesUsedThisMonth,
  inquiryLimitResetAt,
}: BuyerEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(String(inquiriesUsedThisMonth));
  const [resetAt, setResetAt] = useState(toDateTimeLocalValue(inquiryLimitResetAt));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const parsedResetAt = useMemo(() => {
    const parsed = new Date(resetAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [resetAt]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit)) {
      setLoading(false);
      setFieldErrors({ inquiriesUsedThisMonth: 'Лимит должен быть числом' });
      return;
    }

    if (!parsedResetAt) {
      setLoading(false);
      setFieldErrors({ inquiryLimitResetAt: 'Некорректная дата сброса лимита' });
      return;
    }

    const payload = {
      inquiriesUsedThisMonth: parsedLimit,
      inquiryLimitResetAt: parsedResetAt,
    };

    const res = await updateBuyer(buyerId, payload);
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
        <Field orientation="vertical" data-invalid={!!fieldErrors?.inquiriesUsedThisMonth}>
          <FieldLabel>Использовано заявок (период)</FieldLabel>
          <FieldContent>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" />
            <FieldDescription>⚠️ Влияет на лимит новых заявок у покупателя.</FieldDescription>
            <FieldError
              errors={[
                fieldErrors?.inquiriesUsedThisMonth
                  ? { message: fieldErrors.inquiriesUsedThisMonth }
                  : undefined,
              ]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.inquiryLimitResetAt}>
          <FieldLabel>Сброс лимита</FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={resetAt}
              onChange={(e) => setResetAt(e.target.value)}
            />
            <FieldDescription>Дата/время, когда лимит сбросится до 0.</FieldDescription>
            <FieldError
              errors={[
                fieldErrors?.inquiryLimitResetAt
                  ? { message: fieldErrors.inquiryLimitResetAt }
                  : undefined,
              ]}
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
