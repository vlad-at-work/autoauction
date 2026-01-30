export type InquiryOffer = {
  id: string;
  price: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  leadsCount?: number;
  dealerName?: string;
};

export type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string | null;
  statusDescription: string | null;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  comment: string | null;
  createdAt: Date;
  expiresAt: Date;
  offers: InquiryOffer[];
  _count: { offers: number };
};

export async function getMyInquiries(platformUserId: string, platform: string): Promise<Inquiry[]> {
  try {
    const res = await fetch(
      `/api/buyers/me/inquiries?platformUserId=${platformUserId}&platform=${platform}`
    );

    if (!res.ok) {
      throw new Error('Failed to fetch inquiries');
    }

    return (await res.json()) as Inquiry[];
  } catch (error) {
    console.error('Get inquiries error:', error);
    return [];
  }
}

export async function getInquiryById(
  inquiryId: string,
  platformUserId: string
): Promise<Inquiry | null> {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}?platformUserId=${platformUserId}`);

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as Inquiry;
  } catch (error) {
    console.error('Get inquiry error:', error);
    return null;
  }
}
