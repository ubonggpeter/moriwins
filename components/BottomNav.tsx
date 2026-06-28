'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke="white" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
      </svg>
    ),
  },
  {
    href: '/games',
    label: 'Games',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke="white" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.345a.961.961 0 00.986-.98v0a.645.645 0 01.658-.643 48.422 48.422 0 014.163.3c-.186-1.613-.293-3.25-.315-4.907a.656.656 0 01.658-.663v0c.355 0 .676.186.959.401.29.221.634.349 1.003.349 1.036 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25a1.647 1.647 0 00-1.003.349c-.283.215-.604.401-.959.401v0a.641.641 0 01-.658-.643 49.926 49.926 0 00-.293-3.61.644.644 0 01.657-.643h0c.31 0 .555.261.532.571a48.773 48.773 0 01-.642 5.056" />
      </svg>
    ),
  },
  {
    href: '/deposit',
    label: 'Deposit',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke="white" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? 'white' : 'none'} stroke="white" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/8">
      <div className="max-w-[430px] mx-auto flex items-center justify-around h-16 px-2">
        {ITEMS.map(item => {
          const active = pathname === item.href || (item.href === '/games' && pathname.startsWith('/games'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[56px]"
            >
              <span className={active ? 'opacity-100' : 'opacity-35'}>
                {item.icon(active)}
              </span>
              <span className={`text-[10px] tracking-wide ${active ? 'text-white' : 'text-white/35'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
