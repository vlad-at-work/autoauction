'use client';

import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageTransition } from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { getInquiryById, type Inquiry, type InquiryOffer } from '@/lib/api/inquiries';

export default function OfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [offer, setOffer] = useState<InquiryOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const inquiryId = params.inquiryId as string;
  const offerId = params.offerId as string;

  useEffect(() => {
    let cancelled = false;

    const loadOffer = async () => {
      // Get user ID from WebApp
      const webApp = window.WebApp;
      const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;

      if (!platformUserId) {
        router.replace('/app');
        return;
      }

      const inquiryData = await getInquiryById(inquiryId, platformUserId);

      if (cancelled) return;

      if (!inquiryData) {
        router.replace('/app/dashboard');
        return;
      }

      const foundOffer = inquiryData.offers.find((o) => o.id === offerId);

      if (!foundOffer) {
        router.replace(`/app/inquiry/${inquiryId}`);
        return;
      }

      setInquiry(inquiryData);
      setOffer(foundOffer);
      setLoading(false);
    };

    loadOffer();

    return () => {
      cancelled = true;
    };
  }, [inquiryId, offerId, router]);

  const handleAcceptOffer = () => {
    toast.info('Функция скоро будет доступна');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (!inquiry || !offer) {
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen w-full">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Предложение от дилера</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-4">
                <div>
                  <div className="text-muted-foreground mb-1 text-sm">Цена</div>
                  <div className="text-3xl font-bold">{offer.price.toLocaleString('ru-RU')} ₽</div>
                </div>

                {offer.comment && (
                  <div>
                    <div className="text-muted-foreground mb-1 text-sm">Комментарий</div>
                    <p className="text-base">{offer.comment}</p>
                  </div>
                )}

                <div>
                  <div className="text-muted-foreground mb-1 text-sm">Время подачи</div>
                  <p className="text-base">
                    {formatDistanceToNow(new Date(offer.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </div>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex gap-3 p-4">
                  <AlertCircle className="text-primary size-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Внимание</p>
                    <p className="text-muted-foreground mt-1">
                      Принимая предложение, ваши контактные данные (имя, телефон, email) будут
                      переданы дилеру.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleAcceptOffer} size="lg" className="w-full">
                Принять предложение
              </Button>
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/app/inquiry/${inquiryId}`}>
                <ArrowLeft className="mr-2 size-4" />
                Назад к заявке
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
