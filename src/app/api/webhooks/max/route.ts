/**
 * MAX Webhook Handler - MAXIMUM LOGGING VERSION
 */

import { NextResponse } from 'next/server';
import { sendMaxMessage } from '@/lib/notifications/max';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';

type BotType = 'customer' | 'dealer';

export async function POST(request: Request) {
  console.warn('[=== WEBHOOK START ===]');
  console.warn('[WEBHOOK] Timestamp:', new Date().toISOString());
  console.warn('[WEBHOOK] Request URL:', request.url);
  console.warn('[WEBHOOK] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));

  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    console.warn('[WEBHOOK] Parsed botType:', botType);
    console.warn('[WEBHOOK] Query params:', Object.fromEntries(url.searchParams.entries()));

    // Read raw body for logging
    const rawBody = await request.text();
    console.warn('[WEBHOOK] Raw body length:', rawBody.length);
    console.warn('[WEBHOOK] Raw body:', rawBody.substring(0, 2000));

    // Parse JSON
    let update: Record<string, unknown>;
    try {
      update = JSON.parse(rawBody);
      console.warn('[WEBHOOK] JSON parsed successfully');
    } catch (parseErr) {
      console.error('[WEBHOOK] JSON parse error:', parseErr);
      console.error('[WEBHOOK] Failed body:', rawBody.substring(0, 500));
      return NextResponse.json({ ok: true });
    }

    const updateType = update.update_type as string;
    console.warn('[WEBHOOK] Update type:', updateType);
    console.warn('[WEBHOOK] Full update object keys:', Object.keys(update));

    // Extract fields with extensive logging
    const userId =
      (update.user as Record<string, unknown>)?.user_id ||
      ((update.message as Record<string, unknown>)?.sender as Record<string, unknown>)?.user_id;
    console.warn('[WEBHOOK] Extracted userId:', userId);
    console.warn('[WEBHOOK] update.user:', JSON.stringify(update.user));
    console.warn('[WEBHOOK] update.message:', JSON.stringify(update.message)?.substring(0, 500));

    const startPayload = (update.start_payload || update.start_param) as string;
    console.warn('[WEBHOOK] start_payload:', update.start_payload);
    console.warn('[WEBHOOK] start_param:', update.start_param);
    console.warn('[WEBHOOK] Final startPayload:', startPayload);

    const messageText =
      (((update.message as Record<string, unknown>)?.body as Record<string, unknown>)
        ?.text as string) || '';
    console.warn('[WEBHOOK] messageText:', messageText);

    const firstName =
      ((update.user as Record<string, unknown>)?.first_name as string) ||
      (((update.message as Record<string, unknown>)?.sender as Record<string, unknown>)
        ?.first_name as string) ||
      'User';
    console.warn('[WEBHOOK] firstName:', firstName);

    console.warn('[WEBHOOK] Summary:', {
      updateType,
      botType,
      userId,
      startPayload,
      messageText: messageText?.substring(0, 100),
      firstName,
    });

    // Handle events
    if (updateType === 'bot_started') {
      console.warn('[WEBHOOK] Processing bot_started event');

      if (!userId) {
        console.warn('[WEBHOOK] ERROR: No userId in bot_started');
        return NextResponse.json({ ok: true });
      }

      console.warn('[WEBHOOK] Checking for invite. startPayload:', startPayload);

      if (botType === 'dealer' && startPayload?.startsWith('setup_')) {
        console.warn('[WEBHOOK] → Invoking handleDealerInvite with:', {
          userId,
          firstName,
          startPayload,
        });
        await handleDealerInvite(Number(userId), firstName, startPayload);
      } else if (botType === 'dealer') {
        console.warn('[WEBHOOK] → Invoking regular dealer welcome');
        const result = await sendMaxMessage(
          Number(userId),
          `👋 Welcome to AutoAuction Dealer Panel, ${firstName}!\n\nOpen the mini-app from the menu below to access your account.`,
          [],
          'dealer'
        );
        console.warn('[WEBHOOK] Regular dealer welcome result:', result);
      } else {
        console.warn('[WEBHOOK] → Invoking buyer welcome');
        const result = await sendMaxMessage(
          Number(userId),
          `👋 Welcome to AutoAuction, ${firstName}!\n\nOpen the mini-app to create car inquiries.`,
          [],
          'customer'
        );
        console.warn('[WEBHOOK] Buyer welcome result:', result);
      }
    }

    if (updateType === 'message_created' && messageText.startsWith('/start')) {
      console.warn('[WEBHOOK] Processing /start command');

      if (!userId) {
        console.warn('[WEBHOOK] ERROR: No userId in message_created');
        return NextResponse.json({ ok: true });
      }

      const param = messageText.substring(7).trim();
      console.warn('[WEBHOOK] Extracted param from /start:', param);

      if (botType === 'dealer' && param?.startsWith('setup_')) {
        console.warn('[WEBHOOK] → Invoking handleDealerInvite with param:', param);
        await handleDealerInvite(Number(userId), firstName, param);
      } else if (botType === 'dealer') {
        console.warn('[WEBHOOK] → Regular dealer /start');
        const result = await sendMaxMessage(
          Number(userId),
          `👋 Welcome to AutoAuction Dealer Panel, ${firstName}!`,
          [],
          'dealer'
        );
        console.warn('[WEBHOOK] Result:', result);
      } else {
        console.warn('[WEBHOOK] → Buyer /start');
        const result = await sendMaxMessage(
          Number(userId),
          `👋 Welcome to AutoAuction, ${firstName}!`,
          [],
          'customer'
        );
        console.warn('[WEBHOOK] Result:', result);
      }
    }

    if (
      updateType !== 'bot_started' &&
      !(updateType === 'message_created' && messageText.startsWith('/start'))
    ) {
      console.warn(`[WEBHOOK] Unhandled update_type: ${updateType}`);
    }

    console.warn('[=== WEBHOOK END ===]');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[=== WEBHOOK CRITICAL ERROR ===]');
    console.error('[WEBHOOK] Error:', err);
    console.error('[WEBHOOK] Stack:', (err as Error).stack);
    return NextResponse.json({ ok: true });
  }
}

async function handleDealerInvite(userId: number, firstName: string, param: string) {
  console.warn('[=== HANDLE INVITE START ===]');
  console.warn('[INVITE] userId:', userId);
  console.warn('[INVITE] firstName:', firstName);
  console.warn('[INVITE] param:', param);

  const parts = param.split('_');
  console.warn('[INVITE] Split parts:', parts);
  console.warn('[INVITE] Parts length:', parts.length);

  if (parts.length < 3) {
    console.warn('[INVITE] ERROR: Invalid format, need at least 3 parts');
    const result = await sendMaxMessage(userId, '❌ Invalid invite link.', [], 'dealer');
    console.warn('[INVITE] Sent error message, result:', result);
    return;
  }

  const dealerId = parts[1];
  const token = parts.slice(2).join('_');
  console.warn('[INVITE] dealerId:', dealerId);
  console.warn('[INVITE] token length:', token.length);
  console.warn('[INVITE] token:', token.substring(0, 20) + '...');

  console.warn('[INVITE] Querying database for dealer...');
  let dealer;
  try {
    dealer = await prisma.dealer.findFirst({
      where: {
        id: dealerId,
        inviteToken: token,
        deletedAt: null,
      },
      select: { id: true, name: true, inviteTokenExpiresAt: true },
    });
    console.warn('[INVITE] Database query result:', dealer);
  } catch (dbErr) {
    console.error('[INVITE] DATABASE ERROR:', dbErr);
    return;
  }

  if (!dealer) {
    console.warn('[INVITE] ERROR: Dealer not found for id:', dealerId, 'token exists:', !!token);
    const result = await sendMaxMessage(userId, '❌ Invite link is invalid.', [], 'dealer');
    console.warn('[INVITE] Sent invalid message, result:', result);
    return;
  }

  console.warn('[INVITE] Found dealer:', dealer.name);
  console.warn('[INVITE] Token expires at:', dealer.inviteTokenExpiresAt);
  console.warn('[INVITE] Current time:', new Date());
  console.warn('[INVITE] Is valid?', isInviteTokenValid(dealer.inviteTokenExpiresAt));

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    console.warn('[INVITE] ERROR: Token expired');
    const result = await sendMaxMessage(userId, '❌ Invite link expired.', [], 'dealer');
    console.warn('[INVITE] Sent expired message, result:', result);
    return;
  }

  // Include the invite code prominently so user can copy-paste it
  const messageText = `👋 Welcome, ${dealer.name || 'Dealer'}!

Your invite code:
\`${param}\`

1️⃣ Copy the code above
2️⃣ Open the mini-app below  
3️⃣ Paste the code to activate`;
  console.warn('[INVITE] Sending welcome message...');
  console.warn('[INVITE] Message text:', messageText);

  const result = await sendMaxMessage(userId, messageText, [], 'dealer');
  console.warn('[INVITE] sendMaxMessage result:', result);

  if (result.success) {
    console.warn('[INVITE] SUCCESS: Welcome message sent');
  } else {
    console.error('[INVITE] FAILED to send welcome:', result.error);
  }

  console.warn('[=== HANDLE INVITE END ===]');
}
