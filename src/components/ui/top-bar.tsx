import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <div className="bg-background border-border sticky top-0 z-40 flex items-center justify-between border-b px-5 py-4">
      <div className="text-3xl font-bold">A</div>
      <Button asChild size="icon" className="rounded-full size-12">
        <Link href="/app/form?new=1">
          <Plus className="size-6" />
        </Link>
      </Button>
    </div>
  );
}
