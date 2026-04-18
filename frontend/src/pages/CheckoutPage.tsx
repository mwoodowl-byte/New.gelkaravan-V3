import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '@/api/orders';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Корзина пуста');
      return;
    }

    setLoading(true);
    try {
      const order = await ordersAPI.createOrder({ comment: comment.trim() || undefined });
      clearCart();
      toast.success('Заказ успешно оформлен!');
      navigate(`/orders/${order.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка оформления заказа');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🛒</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
        <p className="text-gray-500 text-sm mb-6">Сначала добавьте товары</p>
        <button
          onClick={() => navigate('/catalog')}
          className="px-6 h-12 bg-orange-600 text-white font-semibold rounded-xl active:scale-98 transition-transform"
        >
          В каталог
        </button>
      </div>
    );
  }

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
        <h1 className="font-bold text-gray-900 text-base">Оформление заказа</h1>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Товары */}
        <div className="bg-white border-b-8 border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ваш заказ</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{item.product_name}</p>
                  {item.variant_label && (
                    <p className="text-xs text-gray-400">{item.variant_label}</p>
                  )}
                </div>
                <div className="text-right ml-3">
                  <p className="text-gray-800 font-semibold">
                    {(item.price * item.quantity).toLocaleString('ru-RU')}₽
                  </p>
                  <p className="text-xs text-gray-400">{item.quantity} шт × {item.price}₽</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Комментарий */}
        <div className="bg-white p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Комментарий к заказу (необязательно)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Например: срочно нужно к выходным"
            className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>

      {/* Итого + кнопка */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-bottom">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500">Итого к оплате:</span>
          <span className="text-2xl font-bold text-gray-900">
            {total.toLocaleString('ru-RU')}₽
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 bg-green-600 text-white font-semibold rounded-2xl active:scale-98 disabled:opacity-50 transition-all shadow-lg shadow-green-600/20"
        >
          {loading ? 'Оформление...' : 'Подтвердить заказ'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          После оформления менеджер свяжется с вами для уточнения деталей
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
