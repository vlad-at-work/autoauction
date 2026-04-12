/**
 * Integration test: dealer invite token lifecycle
 * Requires a live Postgres DB (run with: bun run test:integration)
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '@/lib/db';
import { cleanupTestData } from '../happy/test-cleanup';
import { generateInviteToken, isInviteTokenValid } from '@/lib/auth/dealer-invite';

const TEST_PREFIX = `test_integ_invite_${Date.now()}_`;

describe('Dealer invite flow (live DB)', () => {
  beforeAll(async () => {
    await cleanupTestData(TEST_PREFIX);
  });

  afterAll(async () => {
    await cleanupTestData(TEST_PREFIX);
    await prisma.$disconnect();
  });

  it('generates unique token and writes to DB', async () => {
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_invite1`,
        name: 'Invite Test Dealer',
        inviteToken: token,
        inviteTokenExpiresAt: expiresAt,
        active: true,
      },
    });

    expect(dealer.inviteToken).toBe(token);
    expect(dealer.inviteTokenExpiresAt).toBeInstanceOf(Date);

    // Lookup by token
    const found = await prisma.dealer.findFirst({
      where: { inviteToken: token, deletedAt: null },
      select: { id: true, name: true, inviteTokenExpiresAt: true },
    });
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Invite Test Dealer');
    expect(isInviteTokenValid(found!.inviteTokenExpiresAt)).toBe(true);
  });

  it('expired token is detected by isInviteTokenValid', async () => {
    const token = generateInviteToken();
    const expiredAt = new Date(Date.now() - 1000); // already expired

    await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_invite2`,
        name: 'Expired Token Dealer',
        inviteToken: token,
        inviteTokenExpiresAt: expiredAt,
        active: true,
      },
    });

    const found = await prisma.dealer.findFirst({
      where: { inviteToken: token },
      select: { inviteTokenExpiresAt: true },
    });
    expect(found).not.toBeNull();
    expect(isInviteTokenValid(found!.inviteTokenExpiresAt)).toBe(false);
  });

  it('token is unique — duplicate token insert fails', async () => {
    const token = generateInviteToken();

    await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_invite3`,
        name: 'First',
        inviteToken: token,
        inviteTokenExpiresAt: new Date(Date.now() + 86_400_000),
        active: true,
      },
    });

    let threw = false;
    try {
      await prisma.dealer.create({
        data: {
          username: `${TEST_PREFIX}dealer_invite4`,
          name: 'Duplicate Token',
          inviteToken: token,
          inviteTokenExpiresAt: new Date(Date.now() + 86_400_000),
          active: true,
        },
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('updating token replaces the old one', async () => {
    const firstToken = generateInviteToken();
    const secondToken = generateInviteToken();

    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_invite5`,
        name: 'Rotating Token',
        inviteToken: firstToken,
        inviteTokenExpiresAt: new Date(Date.now() + 86_400_000),
        active: true,
      },
    });

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        inviteToken: secondToken,
        inviteTokenExpiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    const updated = await prisma.dealer.findUnique({
      where: { id: dealer.id },
      select: { inviteToken: true },
    });
    expect(updated!.inviteToken).toBe(secondToken);
    expect(updated!.inviteToken).not.toBe(firstToken);
  });
});
