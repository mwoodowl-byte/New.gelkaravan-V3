import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogAPI, Product } from '@/api/catalog';
import { cartAPI } from '@/api/cart';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const ProductPage = () => {
  const { article } = useParams<{ article: string }>();
  const navigate = useNavigate();
  const setItems = useCartStore((state) => state.setItems);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(10);
  const [customQty, setCustomQty] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!article) return;
    
    setLoading(true);
    catalogAPI
      .getProduct(article)
      .then((data) => setProduct(data))
      .catch(() => {
        toast.error('Товар не найден');
        navigate('/catalog');
      })
      .finally(() => setLoading(false));
  }, [article, navigate]);

  const handleVariantToggle = (label: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(label)) {
      newSelected.delete(label);
    } else {
      newSelected.add(label);
    }
    setSelectedVariants(newSelected);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Если есть варианты, но ничего не выбрано
    if (product.variants.length > 0 && selectedVariants.size === 0) {
      toast.error('Выберите хотя бы один вариант');
      return;
    }

    setAdding(true);

    try {
      const variantsToAdd = product.variants.length > 0
        ? Array.from(selectedVariants)
        : [null];

      for (const variantLabel of variantsToAdd) {
        await cartAPI.addToCart({
          article: product.article,
          variant_label: variantLabel,
          quantity: customQty ? parseInt(customQty) : quantity,
        });
      }

      // Обновляем корзину
      const cartData = await cartAPI.getCart();
      setItems(cartData.items);

      toast.success('Товар добавлен в корзину');
      navigate('/cart');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка добавления в корзину');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const qtyButtons = product.is_pack
    ? [1, 2, 3, 5, 10]
    : [5, 10, 20, 50, 100];

  const totalQty = customQty ? parseInt(customQty) : quantity;
  const totalItems = product.is_pack ? totalQty * (product.pack_size || 1) : totalQty;
  const selectedCount = selectedVariants.size || 1;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Шапка */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-orange-600 text-xl active:opacity-70 transition-opacity"
          >
            ←
          </button>
          <span className="font-semibold text-gray-800 text-sm truncate">{product.name}</span>
        </div>
        <button className="text-gray-400 active:opacity-70 transition-opacity">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </header>

      {/* Фото */}
      <div className="relative bg-gray-100 flex items-center justify-center h-56 flex-shrink-0">
        {product.photo_url ? (
          <img src={product.photo_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">{product.article}</span>
        )}
        {product.variants.length > 0 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <span className="bg-black bg-opacity-50 text-white text-xs px-3 py-1 rounded-full">
              {product.variants.length} {product.variants.length === 1 ? 'вариант' : 'вариантов'}
            </span>
          </div>
        )}
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Описание */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-base mb-1">{product.name}</h1>
          <p className="text-sm text-gray-500">
            {product.price}₽ / шт
            {product.is_pack && product.pack_size && (
              <> · Упаковка: {product.pack_size} шт</>
            )}
          </p>
          {product.description && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{product.description}</p>
          )}
        </div>

        {/* Варианты */}
        {product.variants.length > 0 && (
          <>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Варианты</p>
            </div>
            <div>
              {product.variants.map((variant, idx) => {
                const isSelected = selectedVariants.has(variant.label);
                return (
                  <button
                    key={idx}
                    onClick={() => handleVariantToggle(variant.label)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 active:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-orange-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-gray-300 text-orange-600 flex-shrink-0"
                    />
                    <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ${
                      isSelected ? 'bg-orange-100 text-orange-400' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {variant.photo_url ? (
                        <img src={variant.photo_url} alt={variant.label} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        'фото'
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{variant.label}</p>
                      <p className="text-sm text-orange-600 font-semibold">{variant.price}₽</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Количество */}
        <div className="px-4 py-4">
          {product.is_pack && product.pack_size ? (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
              <p className="text-sm font-semibold text-gray-700 mb-1">📦 Упаковка = {product.pack_size} шт</p>
              <p className="text-xs text-gray-500 mb-3">Выберите количество упаковок:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {qtyButtons.map((qty) => (
                  <div key={qty} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        setQuantity(qty);
                        setCustomQty('');
                      }}
                      className={`w-16 h-11 rounded-lg text-sm font-semibold transition-all ${
                        quantity === qty && !customQty
                          ? 'bg-orange-600 text-white border-2 border-orange-600'
                          : 'bg-white text-gray-700 border-2 border-gray-200 active:opacity-70'
                      }`}
                    >
                      {qty} уп
                    </button>
                    <span className="text-xs text-gray-400">({qty * (product.pack_size || 1)} шт)</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="своё"
                  className="w-20 h-11 border-2 border-gray-200 rounded-lg text-center text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-xs text-gray-400">упаковок</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-3">Количество</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {qtyButtons.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => {
                      setQuantity(qty);
                      setCustomQty('');
                    }}
                    className={`w-14 h-11 rounded-lg text-sm font-semibold transition-all ${
                      quantity === qty && !customQty
                        ? 'bg-orange-600 text-white border-2 border-orange-600'
                        : 'bg-white text-gray-700 border-2 border-gray-200 active:opacity-70'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
                <input
                  type="number"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="своё"
                  className="w-20 h-11 border-2 border-gray-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Кнопка добавления */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="w-full h-14 bg-orange-600 text-white font-semibold rounded-2xl active:scale-98 disabled:opacity-50 transition-all shadow-lg shadow-orange-600/20"
        >
          {adding ? (
            'Добавление...'
          ) : (
            <>
              В корзину — {totalItems} шт
              {selectedCount > 1 && ` × ${selectedCount}`}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductPage;
