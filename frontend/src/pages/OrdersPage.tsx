import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, Order } from '@/api/orders';
import toast from 'react-hot-toast';

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI
      .getOrders()
      .then((data) => setOrders(data))
      .catch(() => toast.error('Ошибка загрузки заказов'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: Order['status']) => {
    const badges = {
      pending: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: 'Подтверждён', color: 'bg-blue-100 text-blue-700' },
      processing: { label: 'Собирается', color: 'bg-purple-100 text-purple-700' },
      shipped: { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-700' },
      delivered: { label: 'Доставлен', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
          <h1 className="font-bold text-gray-900 text-base">Мои заказы</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-5xl">📦</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Заказов пока нет</h2>
          <p className="text-gray-500 text-sm mb-6">Оформите первый заказ из каталога</p>
          <button
            onClick={() => navigate('/catalog')}
            className="px-6 h-12 bg-orange-600 text-white font-semibold rounded-xl active:scale-98 transition-transform"
          >
            Перейти в каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base">Мои заказы</h1>
      </header>

      {/* Список заказов */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-3 space-y-3">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            const date = new Date(order.created_at);
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-98 transition-transform text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Заказ #{order.id}</p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {order.items.length} {order.items.length === 1 ? 'товар' : 'товаров'}
                    </p>
                    <p className="text-base font-bold text-gray-900">
                      {order.total.toLocaleString('ru-RU')}₽
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
