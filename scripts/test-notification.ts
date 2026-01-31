import { notifyBuyerOfNewOffer } from '../src/lib/notifications/index';

const buyer = {
  platform: 'TELEGRAM' as const,
  platformUserId: '478130318',
  platformChatId: '478130318',
};

notifyBuyerOfNewOffer(buyer, 'test-inquiry-id', 'test-offer-id', 'Vesta', 'SW Cross', 1500000)
  .then((result) => {
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
