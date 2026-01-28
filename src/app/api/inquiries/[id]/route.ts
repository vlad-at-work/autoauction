import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const platformUserId = searchParams.get('platformUserId');

    if (!platformUserId) {
      return NextResponse.json({ error: 'Missing platformUserId' }, { status: 400 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        buyer: {
          select: {
            platformUserId: true,
          },
        },
        offers: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Check ownership
    if (inquiry.buyer.platformUserId !== platformUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { buyer, ...inquiryData } = inquiry;

    return NextResponse.json(inquiryData);
  } catch (error) {
    console.error('Get inquiry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
