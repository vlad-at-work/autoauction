import Link from 'next/link';
import { LayoutDashboard, Users, FileText, Store, Tag, CheckCircle } from 'lucide-react';

import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';

const navItems = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/buyers', label: 'Покупатели', icon: Users },
  { href: '/admin/inquiries', label: 'Заявки', icon: FileText },
  { href: '/admin/dealers', label: 'Дилеры', icon: Store },
  { href: '/admin/offers', label: 'Предложения', icon: Tag },
  { href: '/admin/transactions', label: 'Транзакции', icon: CheckCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const mobileNavItems = navItems.map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 border-r bg-card md:block">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo3.png" alt="" className="h-10 w-auto object-contain" />
          <Link href="/admin" prefetch={false} className="text-xl font-bold">
            Админ-панель
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:hidden">
          <AdminMobileNav items={mobileNavItems} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo3.png" alt="" className="h-8 w-auto object-contain" />
          <Link href="/admin" prefetch={false} className="text-base font-bold">
            Админ-панель
          </Link>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
