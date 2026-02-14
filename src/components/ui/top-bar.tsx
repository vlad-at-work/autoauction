import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function TopBar({ disableNewInquiry = false }: { disableNewInquiry?: boolean }) {
  return (
    <div className="bg-background border-border sticky top-0 z-40 flex items-center justify-between border-b px-5 py-4">
      <div className="text-3xl font-bold">A</div>
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
