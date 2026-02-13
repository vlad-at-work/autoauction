'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface Offer {
  id: string;
  price: number;
  comment?: string | null;
  createdAt: Date;
  transaction: {
    id: string;
    acceptedAt: Date;
  } | null;
}

export function OfferCard({
  offer,
  dealerName,
  isMyOffer,
  isFirstOffer,
  formatPrice,
  formatRelativeTime,
}: {
  offer: Offer;
  dealerName: string | null;
  isMyOffer: boolean;
  isFirstOffer: boolean;
  formatPrice: (price: number) => string;
  formatRelativeTime: (date: Date) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderClass = isMyOffer
    ? offer.transaction
      ? 'border-green-200 bg-green-50'
      : 'border-gray-200 bg-gray-50'
    : offer.transaction
      ? 'border-orange-200 bg-orange-50'
      : 'border-gray-200 bg-gray-50';

  const hasComment = offer.comment && offer.comment.trim().length > 0;
  const commentPreview =
    hasComment && offer.comment && offer.comment.length > 80
      ? `${offer.comment.substring(0, 80)}…`
      : offer.comment;
  const isCommentTruncated = hasComment && offer.comment && offer.comment.length > 80;

  return (
    <button
      onClick={() => hasComment && setIsExpanded(!isExpanded)}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${borderClass} ${
        hasComment ? 'cursor-pointer hover:opacity-90' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dealerName && <span className="text-muted-foreground text-sm">{dealerName}</span>}
          <span className="font-medium">{formatPrice(offer.price)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(offer.createdAt)}
          </span>
          {offer.transaction ? (
            <Badge
              variant="outline"
              className={`${
                isMyOffer
                  ? 'bg-green-100 border-green-200 text-green-700'
                  : 'border-orange-300 text-orange-700'
              }`}
            >
              {isMyOffer ? '✓ Принято' : 'Принято'}
            </Badge>
          ) : (
            isFirstOffer &&
            isMyOffer && (
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                Актуальное
              </Badge>
            )
          )}
        </div>
      </div>

      {hasComment && (
        <div className="mt-2">
          <p className="text-muted-foreground text-sm">
            {isExpanded ? offer.comment : commentPreview}
          </p>
          {isCommentTruncated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-primary mt-1 text-xs font-medium underline underline-offset-2"
            >
              {isExpanded ? 'Скрыть' : 'Показать полностью'}
            </button>
          )}
        </div>
      )}
    </button>
  );
}
