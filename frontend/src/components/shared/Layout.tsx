import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const itemCount = useCartStore((state) => state.getItemCount());

  const leftTabs = [
    { path: '/catalog', icon: '📋', label: 'Каталог' },
    { path: '/cart', icon: '🛒', label: 'Корзина', badge: itemCount },
  ];

  const rightTabs = [
    { path: '/orders', icon: '📦', label: 'Заказы' },
    { path: '/profile', icon: '👤', label: 'Профиль' },
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="flex h-full max-w-md mx-auto relative">
          {/* Левые кнопки */}
          {leftTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                  isActive ? 'text-orange-600' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <span className="text-xl">{tab.icon}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* Центральная кнопка Борис */}
          <div className="flex-1 flex flex-col items-center justify-end pb-1">
            <Link
              to="/boris"
              className="flex flex-col items-center -mt-[15px] active:scale-95 transition-transform duration-150"
            >
              <div className="w-[60px] h-[60px] bg-[#25D366] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,211,102,0.4)]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <span className="text-[10px] font-medium text-gray-500 mt-1">Борис</span>
            </Link>
          </div>

          {/* Правые кнопки */}
          {rightTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                  isActive ? 'text-orange-600' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <span className="text-xl">{tab.icon}</span>
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
