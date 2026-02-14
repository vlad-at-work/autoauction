export type InquiryOffer = {
  id: string;
  price: number;
  comment: string | null;
  createdAt: Date;
  dealerId: string;
  dealerName?: string;
  transaction?: {
    id: string;
    acceptedAt: Date;
  } | null;
};

export type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  model: string;
  submodel: string;
  transmission: string;
  color: string;
  comment: string | null;
  createdAt: Date;
  expiresAt: Date;
  offers?: InquiryOffer[];
  transactions?: {
    id: string;
    dealerId: string;
  }[];
  _count: {
    offers: number;
    transactions?: number;
  };
};

export type InquiryLimits = {
  used: number;
  max: number;
  remaining: number;
  resetsAt: string | null;
};

export type InquiriesResponse = {
  inquiries: Inquiry[];
  limits: InquiryLimits;
};

export async function getMyInquiries(
  initData: string,
  platform: 'max' | 'telegram'
): Promise<{ inquiries: Inquiry[]; limits: InquiryLimits }> {
  try {
    const res = await fetch('/api/buyers/me/inquiries', {
      headers: {
        Authorization: `Bearer ${platform}:customer:${initData}`,
      },
    });

    if (!res.ok) {
      throw new Error('Не удалось загрузить заявки');
    }

    const data = (await res.json()) as InquiriesResponse;

    // Handle legacy response format (array of inquiries)
    if (Array.isArray(data)) {
      return {
        inquiries: data,
        limits: { used: 0, max: 2, remaining: 2, resetsAt: null },
      };
    }

    return data;
  } catch (error) {
    console.error('Get inquiries error:', error);
    return {
      inquiries: [],
      limits: { used: 0, max: 2, remaining: 2, resetsAt: null },
    };
  }
}

export async function getInquiryById(
  inquiryId: string,
  initData: string,
  platform: 'max' | 'telegram'
): Promise<Inquiry | null> {
  try {
    const res = await fetch(`/api/inquiries/${inquiryId}`, {
      headers: {
        Authorization: `Bearer ${platform}:customer:${initData}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as Inquiry;
  } catch (error) {
    console.error('Get inquiry error:', error);
    return null;
  }
}
