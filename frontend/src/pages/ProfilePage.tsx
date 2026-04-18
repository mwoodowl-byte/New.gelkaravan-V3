import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из аккаунта');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base">Профиль</h1>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Информация о пользователе */}
        <div className="bg-white p-4 border-b-8 border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.full_name}</p>
              <p className="text-sm text-gray-500">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                user.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {user.is_active ? 'Активен' : 'Ожидает одобрения'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {user.role === 'admin' ? 'Администратор' : user.role === 'manager' ? 'Менеджер' : 'Клиент'}
            </span>
          </div>
        </div>

        {/* Меню */}
        <div className="bg-white p-4">
          <div className="space-y-1">
            <button
              onClick={() => navigate('/orders')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📦</span>
                <span className="text-sm font-medium text-gray-800">Мои заказы</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button
              onClick={() => navigate('/catalog')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <span className="text-sm font-medium text-gray-800">Каталог</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>
        </div>

        {/* Выход */}
        <div className="bg-white p-4 mt-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium active:bg-red-100 transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>Выйти из аккаунта</span>
          </button>
        </div>

        {/* Информация о приложении */}
        <div className="p-4 text-center">
          <p className="text-xs text-gray-400">GelKaravan v2.0</p>
          <p className="text-xs text-gray-400 mt-1">Оптовый склад сувениров</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
