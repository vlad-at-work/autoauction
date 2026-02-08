import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/inquiry-utils';

type OfferCardProps = {
  offer: {
    id: string;
    price: number;
    comment: string | null;
    createdAt: Date;
    dealerName?: string;
  };
  inquiryId: string;
  showAcceptButton?: boolean;
  isAccepted?: boolean;
  isHighlighted?: boolean;
};

/**
 * Stylized offer card matching the reference design
 * Horizontal layout: Price | Dealer Info | Action Button
 */
export function OfferCard({
  offer,
  inquiryId,
  showAcceptButton = false,
  isAccepted = false,
  isHighlighted = false,
}: OfferCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-all ${
        isHighlighted
          ? 'border-amber-200 bg-amber-50 shadow-sm'
          : isAccepted
            ? 'border-green-200 bg-green-50'
            : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Left: Price */}
        <div className="flex-shrink-0 min-w-[100px]">
          <div className="text-xl font-bold text-gray-900">{formatPrice(offer.price)}</div>
          {offer.comment && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[140px]">{offer.comment}</p>
          )}
        </div>

        {/* Middle: Dealer Info */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-gray-900 truncate">
            {offer.dealerName || 'Дилер'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {formatDistanceToNow(new Date(offer.createdAt), {
              addSuffix: true,
              locale: ru,
            })}
          </div>
        </div>

        {/* Right: Action Button */}
        <div className="flex-shrink-0">
          {isAccepted ? (
            <div className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium">
              ✓ Принято
            </div>
          ) : showAcceptButton ? (
            <Link href={`/app/inquiry/${inquiryId}/offer/${offer.id}`}>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-4"
              >
                Выбрать победителем
              </Button>
            </Link>
          ) : (
            <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-500 text-sm">
              Недоступно
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
