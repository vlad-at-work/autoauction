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
    platformUserId: z.string().min(1),
    platformUserName: z.string().optional(),
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(7),
    status: z.enum(STATUS_OPTIONS).optional(),
    statusDescription: z.string().max(500).optional(),
    model: z.enum(modelValues),
    submodel: z.enum(submodelValues),
    transmission: z.enum(TRANSMISSION_OPTIONS),
    color: z.enum(COLOR_OPTIONS),
    comment: z.string().max(1000).optional(),
    consent: z.literal(true),
  })
  .superRefine((value, ctx) => {
    const allowedSubmodels = MODEL_SUBMODELS[value.model];
    if (!allowedSubmodels.includes(value.submodel as never)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['submodel'],
        message: 'Submodel does not match selected model',
      });
    }

    if (value.status === 'Drugoye' && !value.statusDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statusDescription'],
        message: 'Status description is required',
      });
    }
  });

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
