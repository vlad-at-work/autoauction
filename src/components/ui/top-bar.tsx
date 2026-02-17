import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function TopBar({ disableNewInquiry = false }: { disableNewInquiry?: boolean }) {
  return (
    <div className="bg-background border-border sticky top-0 z-40 flex items-center justify-between border-b px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo1.png" alt="" className="h-10 w-auto object-contain" />
      {disableNewInquiry ? (
        <Button
          size="icon"
          className="rounded-full size-12 bg-gray-300 hover:bg-gray-300 cursor-not-allowed"
          disabled
        >
          <Plus className="size-6" />
        </Button>
      ) : (
        <Button asChild size="icon" className="rounded-full size-12">
          <Link href="/app/form?new=1">
            <Plus className="size-6" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function TopBarWithBack({
  backHref,
  backText,
  disableNewInquiry = false,
}: {
  backHref: string;
  backText: string;
  disableNewInquiry?: boolean;
}) {
  return (
    <div className="bg-background border-border sticky top-0 z-40 border-b">
      {/* Back button row */}
      <div className="flex items-center px-5 py-3 border-b border-gray-100">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-gray-600 hover:text-gray-900"
        >
          <Link href={backHref}>
            <ArrowLeft className="mr-1 size-4" />
            {backText}
          </Link>
        </Button>
      </div>
      {/* Original header */}
      <div className="flex items-center justify-between px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo1.png" alt="" className="h-10 w-auto object-contain" />
        {disableNewInquiry ? (
          <Button
            size="icon"
            className="rounded-full size-12 bg-gray-300 hover:bg-gray-300 cursor-not-allowed"
            disabled
          >
            <Plus className="size-6" />
          </Button>
        ) : (
          <Button asChild size="icon" className="rounded-full size-12">
            <Link href="/app/form?new=1">
              <Plus className="size-6" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
