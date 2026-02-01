import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <div className="bg-background border-border sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3">
      <div className="text-2xl font-bold">A</div>
      <Button asChild size="icon" className="rounded-full">
        <Link href="/app/form?new=1">
          <Plus className="size-5" />
        </Link>
      </Button>
    </div>
  );
}
