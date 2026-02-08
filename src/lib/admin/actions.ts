'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Platform } from '@prisma/client';
import { z } from 'zod';

import { notifyBuyer } from '@/lib/notifications';

type ActionResult =
  | { success: true; id?: string; warning?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const flat = error.flatten();
  const fieldErrors: Record<string, string> = {};

  const rawFieldErrors = flat.fieldErrors as Record<string, unknown>;

  for (const [key, messages] of Object.entries(rawFieldErrors)) {
    if (!Array.isArray(messages) || messages.length === 0) continue;
    const first = messages[0];
    fieldErrors[key] = typeof first === 'string' && first.trim() ? first : 'Некорректное значение';
  }

  if (flat.formErrors.length > 0) {
    fieldErrors._form = flat.formErrors[0] ?? 'Некорректный запрос';
  }

  return fieldErrors;
}

function isValidEmail(value: string): boolean {
  // Simple pragmatic check (admin UI has server-side validation as well)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Buyer actions
export async function deleteBuyer(id: string): Promise<ActionResult> {
  try {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.buyer.update({
        where: { id },
        data: { deletedAt: now },
      });

      // Soft-delete related inquiries/offers (transactions remain for billing)
      await tx.inquiry.updateMany({
        where: { buyerId: id },
        data: { deletedAt: now },
      });

      await tx.offer.updateMany({
        where: { inquiry: { buyerId: id } },
        data: { deletedAt: now },
      });
    });

    revalidatePath('/admin/buyers');
    revalidatePath(`/admin/buyers/${id}`);
    revalidatePath('/admin/inquiries');
    revalidatePath('/admin/offers');
    return { success: true };
  } catch (error) {
    console.error('Soft delete buyer error:', error);
    return { success: false, error: 'Не удалось удалить (скрыть) покупателя' };
  }
}

export async function restoreBuyer(id: string): Promise<ActionResult> {
  try {
    await prisma.buyer.update({
      where: { id },
      data: { deletedAt: null },
    });

    revalidatePath('/admin/buyers');
    revalidatePath(`/admin/buyers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Restore buyer error:', error);
    return { success: false, error: 'Не удалось восстановить покупателя' };
  }
}

const buyerUpdateSchema = z
  .object({
    inquiriesUsedThisMonth: z
      .number({
        message: 'Лимит должен быть числом',
      })
      .int('Лимит должен быть целым числом')
      .min(0, 'Лимит не может быть меньше 0')
      .max(1000, 'Слишком большое значение'),
    inquiryLimitResetAt: z.date({
      message: 'Некорректная дата сброса лимита',
    }),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нечего обновлять',
    path: ['_form'],
  });

export async function updateBuyer(
  id: string,
  data: {
    inquiriesUsedThisMonth?: number;
    inquiryLimitResetAt?: Date;
  }
): Promise<ActionResult> {
  try {
    const parsed = buyerUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await prisma.buyer.update({
      where: { id },
      data: parsed.data,
    });
    revalidatePath('/admin/buyers');
    revalidatePath(`/admin/buyers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update buyer error:', error);
    return { success: false, error: 'Не удалось обновить покупателя' };
  }
}

const buyerCreateSchema = z.object({
  platform: z.enum(['MAX', 'TELEGRAM'] as const, { message: 'Выберите платформу' }),
  platformUserId: z.string().min(1, 'Укажите ID пользователя в платформе'),
  platformUserName: z.string().max(200, 'Слишком длинное имя').optional().nullable(),
  platformChatId: z.string().max(200, 'Слишком длинный chat_id').optional().nullable(),
});

export async function createBuyer(data: {
  platform: Platform;
  platformUserId: string;
  platformUserName?: string | null;
  platformChatId?: string | null;
}): Promise<ActionResult> {
  try {
    const parsed = buyerCreateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const buyer = await prisma.buyer.upsert({
      where: {
        platform_platformUserId: {
          platform: parsed.data.platform,
          platformUserId: parsed.data.platformUserId,
        },
      },
      update: {
        deletedAt: null,
        platformUserName: parsed.data.platformUserName,
        platformChatId: parsed.data.platformChatId,
      },
      create: {
        platform: parsed.data.platform,
        platformUserId: parsed.data.platformUserId,
        platformUserName: parsed.data.platformUserName,
        platformChatId: parsed.data.platformChatId,
      },
      select: { id: true },
    });

    revalidatePath('/admin/buyers');
    return { success: true, id: buyer.id };
  } catch (error) {
    console.error('Create buyer error:', error);
    return { success: false, error: 'Не удалось создать покупателя' };
  }
}

// Inquiry actions
export async function deleteInquiry(id: string): Promise<ActionResult> {
  try {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.inquiry.update({
        where: { id },
        data: { deletedAt: now },
      });

      await tx.offer.updateMany({
        where: { inquiryId: id },
        data: { deletedAt: now },
      });
    });

    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
    revalidatePath('/admin/offers');
    return { success: true };
  } catch (error) {
    console.error('Soft delete inquiry error:', error);
    return { success: false, error: 'Не удалось удалить (скрыть) заявку' };
  }
}

export async function restoreInquiry(id: string): Promise<ActionResult> {
  try {
    await prisma.inquiry.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Restore inquiry error:', error);
    return { success: false, error: 'Не удалось восстановить заявку' };
  }
}

const inquiryUpdateSchema = z
  .object({
    buyerId: z.string().min(1, 'Укажите покупателя (buyerId)').optional(),
    name: z.string().min(1, 'Укажите имя').max(200, 'Слишком длинное имя').optional(),
    email: z
      .string()
      .max(200, 'Слишком длинный email')
      .optional()
      .nullable()
      .refine((v) => v == null || v === '' || isValidEmail(v), 'Некорректный email'),
    phone: z.string().min(5, 'Некорректный телефон').max(50, 'Слишком длинный телефон').optional(),
    model: z.string().min(1, 'Укажите модель').max(100, 'Слишком длинная модель').optional(),
    submodel: z
      .string()
      .min(1, 'Укажите подмодель')
      .max(100, 'Слишком длинная подмодель')
      .optional(),
    transmission: z.string().min(1, 'Укажите КПП').max(100, 'Слишком длинное значение').optional(),
    color: z.string().min(1, 'Укажите цвет').max(100, 'Слишком длинное значение').optional(),
    status: z.string().max(200, 'Слишком длинный статус').optional().nullable(),
    statusDescription: z
      .string()
      .max(500, 'Слишком длинное описание статуса')
      .optional()
      .nullable(),
    comment: z.string().max(1000, 'Слишком длинный комментарий').optional().nullable(),
    expiresAt: z.date({ message: 'Некорректная дата окончания' }).optional(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нечего обновлять',
    path: ['_form'],
  });

export async function updateInquiry(
  id: string,
  data: {
    buyerId?: string;
    name?: string;
    email?: string | null;
    phone?: string;
    model?: string;
    submodel?: string;
    transmission?: string;
    color?: string;
    status?: string | null;
    statusDescription?: string | null;
    comment?: string | null;
    expiresAt?: Date;
    notifyBuyer?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { notifyBuyer: shouldNotifyBuyer, ...updateData } = data;
    const parsed = inquiryUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: parsed.data,
      include: {
        buyer: true,
      },
    });

    if (shouldNotifyBuyer) {
      const now = new Date();
      if (inquiry.expiresAt <= now) {
        return {
          success: true,
          warning: 'Заявка уже истекла — уведомление покупателю не отправлено.',
        };
      }

      await notifyBuyer(
        {
          platform: inquiry.buyer.platform,
          platformChatId: inquiry.buyer.platformChatId ?? null,
          platformUserId: inquiry.buyer.platformUserId,
        },
        '⚠️ Администратор изменил вашу заявку.\n\nОткройте приложение, чтобы проверить данные и предложения.'
      );
    }

    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update inquiry error:', error);
    return { success: false, error: 'Не удалось обновить заявку' };
  }
}

const inquiryCreateSchema = z.object({
  buyerId: z.string().min(1, 'Укажите buyerId'),
  name: z.string().min(1, 'Укажите имя').max(200, 'Слишком длинное имя'),
  email: z
    .string()
    .max(200, 'Слишком длинный email')
    .optional()
    .nullable()
    .refine((v) => v == null || v === '' || isValidEmail(v), 'Некорректный email'),
  phone: z.string().min(5, 'Некорректный телефон').max(50, 'Слишком длинный телефон'),
  model: z.string().min(1, 'Укажите модель').max(100, 'Слишком длинная модель'),
  submodel: z.string().min(1, 'Укажите подмодель').max(100, 'Слишком длинная подмодель'),
  transmission: z.string().min(1, 'Укажите КПП').max(100, 'Слишком длинное значение'),
  color: z.string().min(1, 'Укажите цвет').max(100, 'Слишком длинное значение'),
  status: z.string().max(200, 'Слишком длинный статус').optional().nullable(),
  statusDescription: z.string().max(500, 'Слишком длинное описание статуса').optional().nullable(),
  comment: z.string().max(1000, 'Слишком длинный комментарий').optional().nullable(),
  expiresAt: z.date({ message: 'Некорректная дата окончания' }),
});

export async function createInquiry(data: {
  buyerId: string;
  name: string;
  email?: string | null;
  phone: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  status?: string | null;
  statusDescription?: string | null;
  comment?: string | null;
  expiresAt: Date;
}): Promise<ActionResult> {
  try {
    const parsed = inquiryCreateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const inquiry = await prisma.inquiry.create({ data: parsed.data });
    revalidatePath('/admin/inquiries');
    return { success: true, id: inquiry.id };
  } catch (error) {
    console.error('Create inquiry error:', error);
    return { success: false, error: 'Не удалось создать заявку' };
  }
}

// Dealer actions
export async function deleteDealer(id: string): Promise<ActionResult> {
  try {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.dealer.update({
        where: { id },
        data: { deletedAt: now },
      });

      await tx.offer.updateMany({
        where: { dealerId: id },
        data: { deletedAt: now },
      });
    });

    revalidatePath('/admin/dealers');
    return { success: true };
  } catch (error) {
    console.error('Soft delete dealer error:', error);
    return { success: false, error: 'Не удалось удалить (скрыть) дилера' };
  }
}

export async function restoreDealer(id: string): Promise<ActionResult> {
  try {
    await prisma.dealer.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath('/admin/dealers');
    revalidatePath(`/admin/dealers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Restore dealer error:', error);
    return { success: false, error: 'Не удалось восстановить дилера' };
  }
}

const dealerUpdateSchema = z
  .object({
    username: z
      .string()
      .min(1, 'Укажите username (логин дилера)')
      .max(100, 'Слишком длинный username')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username может содержать только латиницу, цифры и ._-')
      .optional(),
    name: z.string().max(200, 'Слишком длинное имя').optional().nullable(),
    subName: z.string().max(200, 'Слишком длинное название').optional().nullable(),
    phone: z.string().max(50, 'Слишком длинный телефон').optional().nullable(),
    email: z
      .string()
      .max(200, 'Слишком длинный email')
      .optional()
      .nullable()
      .refine((v) => v == null || v === '' || isValidEmail(v), 'Некорректный email'),
    description: z.string().max(2000, 'Слишком длинное описание').optional().nullable(),
    active: z.boolean().optional(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нечего обновлять',
    path: ['_form'],
  });

export async function updateDealer(
  id: string,
  data: {
    username?: string;
    name?: string | null;
    subName?: string | null;
    phone?: string | null;
    email?: string | null;
    description?: string | null;
    active?: boolean;
  }
): Promise<ActionResult> {
  try {
    const parsed = dealerUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await prisma.dealer.update({
      where: { id },
      data: parsed.data,
    });
    revalidatePath('/admin/dealers');
    revalidatePath(`/admin/dealers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update dealer error:', error);
    // Check for unique constraint violation on username
    if (error instanceof Error && error.message?.includes('unique constraint')) {
      return { success: false, error: 'Дилер с таким username уже существует' };
    }
    return { success: false, error: 'Не удалось обновить дилера' };
  }
}

const dealerCreateSchema = z.object({
  username: z
    .string()
    .min(1, 'Укажите username (логин дилера)')
    .max(100, 'Слишком длинный username')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username может содержать только латиницу, цифры и ._-'),
  name: z.string().min(1, 'Укажите имя дилера').max(200, 'Слишком длинное имя'),
  subName: z
    .string()
    .min(1, 'Укажите название дилерского центра')
    .max(200, 'Слишком длинное название'),
  phone: z.string().min(5, 'Укажите телефон').max(50, 'Слишком длинный телефон'),
  email: z
    .string()
    .min(1, 'Укажите email')
    .max(200, 'Слишком длинный email')
    .refine((v) => isValidEmail(v), 'Некорректный email'),
  description: z.string().min(1, 'Укажите описание').max(2000, 'Слишком длинное описание'),
  active: z.boolean().optional().default(true),
});

export async function createDealer(data: {
  username: string;
  name?: string | null;
  subName?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  active?: boolean;
}): Promise<ActionResult> {
  try {
    const parsed = dealerCreateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const dealer = await prisma.dealer.upsert({
      where: { username: parsed.data.username },
      update: {
        deletedAt: null,
        name: parsed.data.name,
        subName: parsed.data.subName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        description: parsed.data.description,
        active: parsed.data.active,
      },
      create: {
        username: parsed.data.username,
        name: parsed.data.name,
        subName: parsed.data.subName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        description: parsed.data.description,
        active: parsed.data.active,
      },
      select: { id: true },
    });

    revalidatePath('/admin/dealers');
    return { success: true, id: dealer.id };
  } catch (error) {
    console.error('Create dealer error:', error);
    return { success: false, error: 'Не удалось создать дилера' };
  }
}

// Offer actions
export async function deleteOffer(id: string): Promise<ActionResult> {
  try {
    const now = new Date();
    await prisma.offer.update({
      where: { id },
      data: { deletedAt: now },
    });

    revalidatePath('/admin/offers');
    revalidatePath(`/admin/offers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Soft delete offer error:', error);
    return { success: false, error: 'Не удалось удалить (скрыть) предложение' };
  }
}

export async function restoreOffer(id: string): Promise<ActionResult> {
  try {
    await prisma.offer.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath('/admin/offers');
    revalidatePath(`/admin/offers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Restore offer error:', error);
    return { success: false, error: 'Не удалось восстановить предложение' };
  }
}

// Transaction actions
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const now = new Date();
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: now },
    });
    revalidatePath('/admin/transactions');
    revalidatePath(`/admin/transactions/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Soft delete transaction error:', error);
    return { success: false, error: 'Не удалось удалить (скрыть) транзакцию' };
  }
}

export async function restoreTransaction(id: string): Promise<ActionResult> {
  try {
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath('/admin/transactions');
    revalidatePath(`/admin/transactions/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Restore transaction error:', error);
    return { success: false, error: 'Не удалось восстановить транзакцию' };
  }
}

const transactionBillingSchema = z
  .object({
    amount: z
      .number({ message: 'Сумма должна быть числом' })
      .int('Сумма должна быть целым числом')
      .min(0, 'Сумма не может быть отрицательной')
      .max(2147483647, 'Слишком большая сумма')
      .optional()
      .nullable(),
    invoicedAt: z.date({ message: 'Некорректная дата' }).optional().nullable(),
    billedAt: z.date({ message: 'Некорректная дата' }).optional().nullable(),
    paidAt: z.date({ message: 'Некорректная дата' }).optional().nullable(),
    voidedAt: z.date({ message: 'Некорректная дата' }).optional().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нечего обновлять',
    path: ['_form'],
  });

export async function updateTransactionBilling(
  id: string,
  data: {
    amount?: number | null;
    invoicedAt?: Date | null;
    billedAt?: Date | null;
    paidAt?: Date | null;
    voidedAt?: Date | null;
  }
): Promise<ActionResult> {
  try {
    const parsed = transactionBillingSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Проверьте поля формы',
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    await prisma.transaction.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath('/admin/transactions');
    revalidatePath(`/admin/transactions/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update transaction billing error:', error);
    return { success: false, error: 'Не удалось обновить транзакцию' };
  }
}
