import { z } from 'zod';

import { COLOR_OPTIONS, MODEL_SUBMODELS, TRANSMISSION_OPTIONS } from '@/lib/form-options';

const modelValues = Object.keys(MODEL_SUBMODELS) as Array<keyof typeof MODEL_SUBMODELS>;
const submodelValues = modelValues.flatMap((model) => MODEL_SUBMODELS[model]);

export const inquiryCreateSchema = z
  .object({
    platform: z.enum(['max', 'telegram']),
    platformUserId: z.string().min(1, 'Требуется ID пользователя'),
    platformChatId: z.string().optional(), // Chat ID for bot notifications
    platformUserName: z.string().optional(),
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
    email: z.string().email('Некорректный адрес электронной почты').optional().or(z.literal('')),
    phone: z.string().min(7, 'Телефон должен содержать минимум 7 символов'),
    model: z.enum(modelValues),
    submodel: z.enum(submodelValues),
    transmission: z.enum(TRANSMISSION_OPTIONS),
    color: z.enum(COLOR_OPTIONS),
    comment: z.string().max(1000, 'Максимум 1000 символов').optional(),
    consent: z
      .boolean()
      .refine((value) => value, { message: 'Необходимо дать согласие на обработку данных' }),
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
  });

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
