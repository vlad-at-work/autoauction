import type { MockInquiry } from '@/lib/debug/mock-data';
import { MOCK_USERS } from '@/lib/debug/mock-data';

export async function getMyInquiries(
  platformUserId: string,
  platform: string,
  debugMode?: { enabled: boolean; useMockData: boolean; mockUserId: string | null }
): Promise<MockInquiry[]> {
  if (debugMode?.enabled && debugMode.useMockData && debugMode.mockUserId) {
    return MOCK_USERS[debugMode.mockUserId]?.inquiries || [];
  }

  try {
    const res = await fetch(
      `/api/buyers/me/inquiries?platformUserId=${platformUserId}&platform=${platform}`
    );

    if (!res.ok) {
      throw new Error('Failed to fetch inquiries');
    }

    return (await res.json()) as MockInquiry[];
  } catch (error) {
    console.error('Get inquiries error:', error);
    return [];
  }
}

export async function getInquiryById(
  inquiryId: string,
  platformUserId: string,
  debugMode?: { enabled: boolean; useMockData: boolean; mockUserId: string | null }
): Promise<MockInquiry | null> {
  if (debugMode?.enabled && debugMode.useMockData && debugMode.mockUserId) {
    const user = MOCK_USERS[debugMode.mockUserId];
    return user?.inquiries.find((inq) => inq.id === inquiryId) || null;
  }

  try {
    const res = await fetch(`/api/inquiries/${inquiryId}?platformUserId=${platformUserId}`);

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as MockInquiry;
  } catch (error) {
    console.error('Get inquiry error:', error);
    return null;
  }
}
