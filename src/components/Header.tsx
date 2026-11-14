import { ShoppingBag } from 'lucide-react';

export type ActiveView = 'home' | 'map' | 'saved' | 'upload';

interface HeaderProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  savedCount: number;
  cartCount: number;
  onOpenCart: () => void;
}

export function Header({
  activeView,
  onNavigate,
  savedCount,
  cartCount,
  onOpenCart,
}: HeaderProps) {
  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'home', label: 'Galleries' },
    { id: 'map', label: 'Spot Map' },
    { id: 'saved', label: savedCount > 0 ? `Saved (${savedCount})` : 'Saved' },
    { id: 'upload', label: 'Upload' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B0D11]/95 backdrop-blur-sm border-b border-zinc-800/90">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-editorial text-2xl font-semibold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
        >
          Meridian
        </button>

        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 sm:gap-8 overflow-x-auto"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Cart ({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}
