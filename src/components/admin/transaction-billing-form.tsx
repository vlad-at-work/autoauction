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
import { DatePicker } from '@/components/ui/date-picker';
import { updateTransactionBilling } from '@/lib/admin/actions';

type TransactionBillingFormProps = {
  transactionId: string;
  amount: number | null;
  invoicedAt: Date | null;
  billedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
};

export function TransactionBillingForm({
  transactionId,
  amount,
  invoicedAt,
  billedAt,
  paidAt,
  voidedAt,
}: TransactionBillingFormProps) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const [nextAmount, setNextAmount] = useState(amount == null ? '' : String(amount));
  const [nextInvoicedAt, setNextInvoicedAt] = useState<Date | null>(invoicedAt);
  const [nextBilledAt, setNextBilledAt] = useState<Date | null>(billedAt);
  const [nextPaidAt, setNextPaidAt] = useState<Date | null>(paidAt);
  const [nextVoidedAt, setNextVoidedAt] = useState<Date | null>(voidedAt);

  const [isVoided, setIsVoided] = useState(Boolean(voidedAt));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFieldErrors(null);

    const parsedAmount = nextAmount.trim() === '' ? null : Number(nextAmount);
    if (parsedAmount != null && !Number.isFinite(parsedAmount)) {
      setLoading(false);
      setFieldErrors({ amount: 'Сумма должна быть числом' });
      return;
    }

    const res = await updateTransactionBilling(transactionId, {
      amount: parsedAmount,
      invoicedAt: nextInvoicedAt,
      billedAt: nextBilledAt,
      paidAt: nextPaidAt,
      voidedAt: isVoided ? (nextVoidedAt ?? new Date()) : null,
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

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Поля ниже — ручная бухгалтерия. Данные сделки (покупатель/дилер/авто/цена) не редактируются
        после создания транзакции.
      </div>

      <FieldGroup>
        <Field orientation="vertical" data-invalid={!!fieldErrors?.amount}>
          <FieldLabel>Сумма (₽)</FieldLabel>
          <FieldContent>
            <Input
              value={nextAmount}
              onChange={(e) => setNextAmount(e.target.value)}
              inputMode="numeric"
            />
            <FieldDescription>Опционально. Пока учёт ручной.</FieldDescription>
            <FieldError
              errors={[fieldErrors?.amount ? { message: fieldErrors.amount } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.invoicedAt}>
          <FieldLabel>Invoiced at</FieldLabel>
          <FieldContent>
            <DatePicker
              value={nextInvoicedAt}
              onChange={setNextInvoicedAt}
              placeholder="Дата инвойса"
            />
            <FieldError
              errors={[fieldErrors?.invoicedAt ? { message: fieldErrors.invoicedAt } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.billedAt}>
          <FieldLabel>Billed at</FieldLabel>
          <FieldContent>
            <DatePicker
              value={nextBilledAt}
              onChange={setNextBilledAt}
              placeholder="Дата выставления"
            />
            <FieldError
              errors={[fieldErrors?.billedAt ? { message: fieldErrors.billedAt } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical" data-invalid={!!fieldErrors?.paidAt}>
          <FieldLabel>Paid at</FieldLabel>
          <FieldContent>
            <DatePicker value={nextPaidAt} onChange={setNextPaidAt} placeholder="Дата оплаты" />
            <FieldError
              errors={[fieldErrors?.paidAt ? { message: fieldErrors.paidAt } : undefined]}
            />
          </FieldContent>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            checked={isVoided}
            onCheckedChange={(v) => {
              const next = Boolean(v);
              setIsVoided(next);
              if (next && !nextVoidedAt) setNextVoidedAt(new Date());
              if (!next) setNextVoidedAt(null);
            }}
          />
          <FieldContent>
            <FieldLabel>Void (не включать в счет)</FieldLabel>
            <FieldDescription>
              Void не удаляет транзакцию, только исключает из счета.
            </FieldDescription>
          </FieldContent>
        </Field>

        {isVoided && (
          <Field orientation="vertical" data-invalid={!!fieldErrors?.voidedAt}>
            <FieldLabel>Voided at</FieldLabel>
            <FieldContent>
              <DatePicker value={nextVoidedAt} onChange={setNextVoidedAt} placeholder="Дата void" />
              <FieldError
                errors={[fieldErrors?.voidedAt ? { message: fieldErrors.voidedAt } : undefined]}
              />
            </FieldContent>
          </Field>
        )}
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </form>
  );
}
