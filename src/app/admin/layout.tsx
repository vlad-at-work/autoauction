import Link from 'next/link';
import { LayoutDashboard, Users, FileText, Store, Tag, UserCheck } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/admin/buyers', label: 'Покупатели', icon: Users },
  { href: '/admin/inquiries', label: 'Заявки', icon: FileText },
  { href: '/admin/dealers', label: 'Дилеры', icon: Store },
  { href: '/admin/offers', label: 'Предложения', icon: Tag },
  { href: '/admin/leads', label: 'Лиды', icon: UserCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="text-xl font-bold">
            Админ-панель
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
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
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
