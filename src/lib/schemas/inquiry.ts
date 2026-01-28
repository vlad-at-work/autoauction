import { z } from 'zod';

import {
  COLOR_OPTIONS,
  MODEL_SUBMODELS,
  STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
} from '@/lib/form-options';

const modelValues = Object.keys(MODEL_SUBMODELS) as Array<keyof typeof MODEL_SUBMODELS>;
const submodelValues = modelValues.flatMap((model) => MODEL_SUBMODELS[model]);

export const inquiryCreateSchema = z
  .object({
    platform: z.enum(['max', 'telegram']),
    platformUserId: z.string().min(1, 'Требуется ID пользователя'),
    platformUserName: z.string().optional(),
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
    email: z.string().email('Некорректный адрес электронной почты').optional().or(z.literal('')),
    phone: z.string().min(7, 'Телефон должен содержать минимум 7 символов'),
    status: z.enum(STATUS_OPTIONS).optional(),
    statusDescription: z.string().max(500, 'Максимум 500 символов').optional(),
    model: z.enum(modelValues),
    submodel: z.enum(submodelValues),
    transmission: z.enum(TRANSMISSION_OPTIONS),
    color: z.enum(COLOR_OPTIONS),
    comment: z.string().max(1000, 'Максимум 1000 символов').optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо дать согласие на обработку данных' }),
    }),
  })
  .superRefine((value, ctx) => {
    const allowedSubmodels = MODEL_SUBMODELS[value.model];
    if (!allowedSubmodels.includes(value.submodel as never)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['submodel'],
        message: 'Подмодель не соответствует выбранной модели',
      });
    }

    if (value.status === 'Другое' && !value.statusDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statusDescription'],
        message: 'Требуется описание статуса',
      });
    }
  });

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
