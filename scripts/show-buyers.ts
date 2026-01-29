/**
 * Show all buyers with their chat IDs for testing
 */

import { prisma } from '../src/lib/db';

async function showBuyers() {
  const buyers = await prisma.buyer.findMany({
    select: {
      id: true,
      platform: true,
      platformUserId: true,
      platformChatId: true,
      platformUserName: true,
      createdAt: true,
      _count: {
        select: { inquiries: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 Found ${buyers.length} buyers:\n`);

  buyers.forEach((buyer) => {
    console.log('─'.repeat(60));
    console.log(`Platform: ${buyer.platform}`);
    console.log(`User ID: ${buyer.platformUserId}`);
    console.log(`Chat ID: ${buyer.platformChatId || '(not set)'}`);
    console.log(`Name: ${buyer.platformUserName || '(not set)'}`);
    console.log(`Inquiries: ${buyer._count.inquiries}`);
    console.log(`Created: ${buyer.createdAt.toLocaleString()}`);
  });

  console.log('─'.repeat(60));
  console.log('\n💡 To test notification, copy the Chat ID and run:');
  console.log('   bun run scripts/test-max-notification.ts <chat_id>\n');

  await prisma.$disconnect();
}

showBuyers().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
