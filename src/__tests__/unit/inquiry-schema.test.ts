import { describe, expect, it } from 'bun:test';

import {
  COLOR_OPTIONS,
  MODEL_SUBMODELS,
  STATUS_OPTIONS,
  TRANSMISSION_OPTIONS,
} from '@/lib/form-options';
import { inquiryCreateSchema } from '@/lib/schemas/inquiry';

describe('inquiryCreateSchema', () => {
  const base = {
    platform: 'max' as const,
    platformUserId: 'test_user_1',
    platformUserName: 'Test User',
    name: 'Олег',
    email: 'test@example.com',
    phone: '79991234567',
    status: STATUS_OPTIONS[0],
    statusDescription: undefined,
    model: 'Granta' as const,
    submodel: MODEL_SUBMODELS.Granta[0],
    transmission: TRANSMISSION_OPTIONS[0],
    color: COLOR_OPTIONS[0],
    comment: 'Комментарий',
    consent: true,
  };

  it('parses a valid payload', () => {
    const parsed = inquiryCreateSchema.parse(base);
    expect(parsed).toMatchObject({
      platform: 'max',
      platformUserId: 'test_user_1',
      name: 'Олег',
      model: 'Granta',
      consent: true,
    });
  });

  it('allows email to be omitted or empty string', () => {
    expect(inquiryCreateSchema.safeParse({ ...base, email: undefined }).success).toBe(true);
    expect(inquiryCreateSchema.safeParse({ ...base, email: '' }).success).toBe(true);
  });

  it('rejects submodel that does not match selected model', () => {
    const res = inquiryCreateSchema.safeParse({
      ...base,
      model: 'Granta',
      submodel: MODEL_SUBMODELS['Niva Travel'][0],
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((issue) => issue.path.join('.') === 'submodel')).toBe(true);
    }
  });

  it('requires statusDescription when status is "Другое"', () => {
    const res = inquiryCreateSchema.safeParse({
      ...base,
      status: 'Другое',
      statusDescription: '   ',
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((issue) => issue.path.join('.') === 'statusDescription')).toBe(
        true
      );
    }
  });

  it('requires consent to be true', () => {
    const res = inquiryCreateSchema.safeParse({ ...base, consent: false });
    expect(res.success).toBe(false);
    if (!res.success) {
      const consentIssue = res.error.issues.find((issue) => issue.path.join('.') === 'consent');
      expect(consentIssue?.message).toBe('Необходимо дать согласие на обработку данных');
    }
  });
});
