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
          include: {
            dealer: {
              select: {
                username: true,
                name: true,
              },
            },
            _count: {
              select: { leads: true },
            },
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

    // Transform offers to include leadsCount and dealer info
    const transformedInquiry = {
      ...inquiryData,
      offers: inquiryData.offers.map((offer) => ({
        id: offer.id,
        price: offer.price,
        comment: offer.comment,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        leadsCount: offer._count.leads,
        dealerName: offer.dealer.name || offer.dealer.username,
      })),
    };

    return NextResponse.json(transformedInquiry);
  } catch (error) {
    console.error('Get inquiry error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
