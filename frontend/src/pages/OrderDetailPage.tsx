import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI, Order } from '@/api/orders';
import toast from 'react-hot-toast';

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    
    ordersAPI
      .getOrder(parseInt(orderId))
      .then((data) => setOrder(data))
      .catch(() => {
        toast.error('Заказ не найден');
        navigate('/orders');
      })
      .finally(() => setLoading(false));
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const getStatusBadge = (status: Order['status']) => {
    const badges = {
      pending: { label: 'Ожидает подтверждения', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
      confirmed: { label: 'Подтверждён', color: 'bg-blue-100 text-blue-700', icon: '✅' },
      processing: { label: 'Собирается', color: 'bg-purple-100 text-purple-700', icon: '📦' },
      shipped: { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-700', icon: '🚚' },
      delivered: { label: 'Доставлен', color: 'bg-green-100 text-green-700', icon: '🎉' },
      cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700', icon: '❌' },
    };
    return badges[status] || badges.pending;
  };

  const badge = getStatusBadge(order.status);
  const date = new Date(order.created_at);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-orange-600 text-xl active:opacity-70 transition-opacity"
        >
          ←
        </button>
        <h1 className="font-bold text-gray-900 text-base">Заказ #{order.id}</h1>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Статус */}
        <div className="bg-white p-4 border-b-8 border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{badge.icon}</span>
            <div>
              <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                {badge.label}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {date.toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Товары */}
        <div className="bg-white p-4 border-b-8 border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Состав заказа</h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                  {item.variant_label && (
                    <p className="text-xs text-gray-400">{item.variant_label}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {item.quantity} шт × {item.price.toLocaleString('ru-RU')}₽
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-gray-900">
                    {item.subtotal.toLocaleString('ru-RU')}₽
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Комментарий */}
        {order.comment && (
          <div className="bg-white p-4 border-b-8 border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Комментарий</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{order.comment}</p>
          </div>
        )}

        {/* Итого */}
        <div className="bg-white p-4">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700">Итого:</span>
            <span className="text-2xl font-bold text-gray-900">
              {order.total.toLocaleString('ru-RU')}₽
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
