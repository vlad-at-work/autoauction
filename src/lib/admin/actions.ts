'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Platform } from '@prisma/client';

// Buyer actions
export async function deleteBuyer(id: string) {
  try {
    // Delete related data in order (leads -> offers -> inquiries -> buyer)
    await prisma.lead.deleteMany({
      where: { offer: { inquiry: { buyerId: id } } },
    });
    await prisma.offer.deleteMany({
      where: { inquiry: { buyerId: id } },
    });
    await prisma.inquiry.deleteMany({
      where: { buyerId: id },
    });
    await prisma.buyer.delete({
      where: { id },
    });
    revalidatePath('/admin/buyers');
    return { success: true };
  } catch (error) {
    console.error('Delete buyer error:', error);
    return { success: false, error: 'Не удалось удалить покупателя' };
  }
}

export async function updateBuyer(id: string, data: { platformUserName?: string | null }) {
  try {
    await prisma.buyer.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/buyers');
    revalidatePath(`/admin/buyers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update buyer error:', error);
    return { success: false, error: 'Не удалось обновить покупателя' };
  }
}

export async function createBuyer(data: {
  platform: Platform;
  platformUserId: string;
  platformUserName?: string | null;
}) {
  try {
    const buyer = await prisma.buyer.create({ data });
    revalidatePath('/admin/buyers');
    return { success: true, id: buyer.id };
  } catch (error) {
    console.error('Create buyer error:', error);
    return { success: false, error: 'Не удалось создать покупателя' };
  }
}

// Inquiry actions
export async function deleteInquiry(id: string) {
  try {
    await prisma.lead.deleteMany({
      where: { offer: { inquiryId: id } },
    });
    await prisma.offer.deleteMany({
      where: { inquiryId: id },
    });
    await prisma.inquiry.delete({
      where: { id },
    });
    revalidatePath('/admin/inquiries');
    return { success: true };
  } catch (error) {
    console.error('Delete inquiry error:', error);
    return { success: false, error: 'Не удалось удалить заявку' };
  }
}

export async function updateInquiry(
  id: string,
  data: {
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
  }
) {
  try {
    await prisma.inquiry.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/inquiries');
    revalidatePath(`/admin/inquiries/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update inquiry error:', error);
    return { success: false, error: 'Не удалось обновить заявку' };
  }
}

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
}) {
  try {
    const inquiry = await prisma.inquiry.create({ data });
    revalidatePath('/admin/inquiries');
    return { success: true, id: inquiry.id };
  } catch (error) {
    console.error('Create inquiry error:', error);
    return { success: false, error: 'Не удалось создать заявку' };
  }
}

// Dealer actions
export async function deleteDealer(id: string) {
  try {
    await prisma.lead.deleteMany({
      where: { offer: { dealerId: id } },
    });
    await prisma.offer.deleteMany({
      where: { dealerId: id },
    });
    await prisma.dealer.delete({
      where: { id },
    });
    revalidatePath('/admin/dealers');
    return { success: true };
  } catch (error) {
    console.error('Delete dealer error:', error);
    return { success: false, error: 'Не удалось удалить дилера' };
  }
}

export async function updateDealer(id: string, data: { name?: string | null; active?: boolean }) {
  try {
    await prisma.dealer.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/dealers');
    revalidatePath(`/admin/dealers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update dealer error:', error);
    return { success: false, error: 'Не удалось обновить дилера' };
  }
}

export async function createDealer(data: {
  username: string;
  name?: string | null;
  active?: boolean;
}) {
  try {
    const dealer = await prisma.dealer.create({ data });
    revalidatePath('/admin/dealers');
    return { success: true, id: dealer.id };
  } catch (error) {
    console.error('Create dealer error:', error);
    return { success: false, error: 'Не удалось создать дилера' };
  }
}

// Offer actions
export async function deleteOffer(id: string) {
  try {
    await prisma.lead.deleteMany({
      where: { offerId: id },
    });
    await prisma.offer.delete({
      where: { id },
    });
    revalidatePath('/admin/offers');
    return { success: true };
  } catch (error) {
    console.error('Delete offer error:', error);
    return { success: false, error: 'Не удалось удалить предложение' };
  }
}

export async function updateOffer(id: string, data: { price?: number; comment?: string | null }) {
  try {
    await prisma.offer.update({
      where: { id },
      data,
    });
    revalidatePath('/admin/offers');
    revalidatePath(`/admin/offers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update offer error:', error);
    return { success: false, error: 'Не удалось обновить предложение' };
  }
}

export async function createOffer(data: {
  inquiryId: string;
  dealerId: string;
  price: number;
  comment?: string | null;
}) {
  try {
    const offer = await prisma.offer.create({ data });
    revalidatePath('/admin/offers');
    return { success: true, id: offer.id };
  } catch (error) {
    console.error('Create offer error:', error);
    return { success: false, error: 'Не удалось создать предложение' };
  }
}

// Lead actions (read-only, but including delete for completeness)
export async function deleteLead(id: string) {
  try {
    await prisma.lead.delete({
      where: { id },
    });
    revalidatePath('/admin/leads');
    return { success: true };
  } catch (error) {
    console.error('Delete lead error:', error);
    return { success: false, error: 'Не удалось удалить лид' };
  }
}
