import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartAPI } from '@/api/cart';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, total, setItems, updateQty, removeItem } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    cartAPI
      .getCart()
      .then((data) => setItems(data.items))
      .catch(() => toast.error('Ошибка загрузки корзины'))
      .finally(() => setLoading(false));
  }, [setItems]);

  const handleUpdateQty = async (itemId: number, newQty: number) => {
    if (newQty < 1) {
      handleRemove(itemId);
      return;
    }

    setUpdating(itemId);
    try {
      await cartAPI.updateCart(itemId, { quantity: newQty });
      updateQty(itemId, newQty);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await cartAPI.removeFromCart(itemId);
      removeItem(itemId);
      toast.success('Товар удалён из корзины');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="font-bold text-gray-900 text-base">Корзина</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-5xl">🛒</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Корзина пуста</h2>
          <p className="text-gray-500 text-sm mb-6">Добавьте товары из каталога</p>
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
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base">Корзина</h1>
        <span className="text-sm text-gray-400">
          {items.length} {items.length === 1 ? 'товар' : 'товаров'}
        </span>
      </header>

      {/* Список товаров */}
      <div className="flex-1 overflow-y-auto pb-32">
        {items.map((item) => (
          <div key={item.id} className="bg-white border-b border-gray-100 px-4 py-4">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.product_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">{item.article}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-tight mb-0.5">
                  {item.product_name}
                </p>
                {item.variant_label && (
                  <p className="text-xs text-gray-400 mb-2">{item.variant_label}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                      disabled={updating === item.id}
                      className="w-8 h-8 border-2 border-gray-200 rounded-lg flex items-center justify-center text-gray-600 font-bold active:opacity-70 disabled:opacity-50 transition-opacity"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                      disabled={updating === item.id}
                      className="w-8 h-8 border-2 border-orange-600 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold active:opacity-70 disabled:opacity-50 transition-opacity"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {(item.price * item.quantity).toLocaleString('ru-RU')}₽
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                className="text-gray-300 hover:text-red-400 self-start active:opacity-70 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Итого + кнопка */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-bottom">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">Итого:</span>
          <span className="text-2xl font-bold text-gray-900">
            {total.toLocaleString('ru-RU')}₽
          </span>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="w-full h-14 bg-green-600 text-white font-semibold rounded-2xl active:scale-98 transition-transform shadow-lg shadow-green-600/20"
        >
          Оформить заказ
        </button>
      </div>
    </div>
  );
};

export default CartPage;
