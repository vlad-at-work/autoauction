/**
 * Update buyer's chat_id for notifications
 */

import { prisma } from '../src/lib/db';

const userId = '20325912'; // Your MAX user ID
const chatId = '20325912'; // In MAX, chat_id usually equals user_id for private chats

async function updateChatId() {
  const buyer = await prisma.buyer.update({
    where: {
      platform_platformUserId: {
        platform: 'MAX',
        platformUserId: userId,
      },
    },
    data: {
      platformChatId: chatId,
    },
  });

  console.log('✅ Updated buyer chat_id:', buyer.platformChatId);
}

updateChatId()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
