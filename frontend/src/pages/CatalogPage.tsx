import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogAPI, Category, Product } from '@/api/catalog';
import { useCartStore } from '@/store/cartStore';
import toast from 'react-hot-toast';

const CatalogPage = () => {
  const navigate = useNavigate();
  const itemCount = useCartStore((state) => state.getItemCount());

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedL1, setSelectedL1] = useState<number | null>(null);
  const [selectedL2, setSelectedL2] = useState<number | null>(null);
  const [selectedL3, setSelectedL3] = useState<number | null>(null);
  const [bottomSheetL2Id, setBottomSheetL2Id] = useState<number | null>(null);

  // Загрузка категорий
  useEffect(() => {
    catalogAPI
      .getCategories()
      .then((data) => setCategories(data))
      .catch(() => toast.error('Ошибка загрузки категорий'));
  }, []);

  // Загрузка товаров
  useEffect(() => {
    setLoading(true);
    const categoryId = selectedL3 || selectedL2 || selectedL1 || undefined;
    catalogAPI
      .getProducts({ section_id: categoryId, q: search || undefined })
      .then((data) => {
        setProducts(data.items);
      })
      .catch(() => toast.error('Ошибка загрузки товаров'))
      .finally(() => setLoading(false));
  }, [selectedL1, selectedL2, selectedL3, search]);

  // Категории уровня 1 (родительские)
  const level1Categories = categories.filter((c) => c.parent_id === null);

  // Категории уровня 2 (дочерние выбранной L1)
  const level2Categories = selectedL1
    ? categories.filter((c) => c.parent_id === selectedL1)
    : [];

  // Категории уровня 3 (дочерние выбранной L2)
  const getLevel3Categories = (l2Id: number) => {
    return categories.filter((c) => c.parent_id === l2Id);
  };

  // Проверка, есть ли у L2 дети
  const hasChildren = (l2Id: number) => {
    return categories.some((c) => c.parent_id === l2Id);
  };

  // Обработчик выбора L1
  const handleL1Select = (id: number | null) => {
    setSelectedL1(id);
    setSelectedL2(null);
    setSelectedL3(null);
  };

  // Обработчик клика на L2
  const handleL2Click = (cat: Category) => {
    if (hasChildren(cat.id)) {
      // Открыть bottom sheet
      setBottomSheetL2Id(cat.id);
    } else {
      // Выбрать L2 и фильтровать
      setSelectedL2(cat.id);
      setSelectedL3(null);
    }
  };

  // Обработчик выбора L3
  const handleL3Select = (id: number | null) => {
    setSelectedL3(id);
    setBottomSheetL2Id(null);
  };

  // Закрыть bottom sheet
  const closeBottomSheet = () => {
    setBottomSheetL2Id(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  // Название для bottom sheet
  const bottomSheetTitle = bottomSheetL2Id
    ? categories.find((c) => c.id === bottomSheetL2Id)?.name || ''
    : '';

  // L3 категории для bottom sheet
  const bottomSheetL3Categories = bottomSheetL2Id
    ? getLevel3Categories(bottomSheetL2Id)
    : [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="text-lg font-bold text-orange-600">GelKaravan</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              // Показать модалку поиска или перейти на страницу поиска
            }}
            className="text-gray-500 active:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/cart')}
            className="relative text-gray-500 active:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Поиск */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Найти товар..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 active:opacity-70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Навигация уровень 1 */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto scrollbar-none flex-shrink-0">
        <button
          onClick={() => handleL1Select(null)}
          className={`px-4 h-10 rounded-full text-sm font-medium whitespace-nowrap flex items-center justify-center flex-shrink-0 transition-all ${
            selectedL1 === null
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-white text-gray-700 border border-gray-200 active:opacity-70'
          }`}
        >
          Все
        </button>
        {level1Categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleL1Select(cat.id)}
            className={`px-4 h-10 rounded-full text-sm font-medium whitespace-nowrap flex items-center justify-center flex-shrink-0 transition-all ${
              selectedL1 === cat.id
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 active:opacity-70'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Навигация уровень 2 */}
      {level2Categories.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto scrollbar-none flex-shrink-0">
          <button
            onClick={() => {
              setSelectedL2(null);
              setSelectedL3(null);
            }}
            className={`px-3 h-9 rounded-full text-[13px] font-medium whitespace-nowrap flex items-center justify-center flex-shrink-0 transition-all ${
              selectedL2 === null
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 active:opacity-70'
            }`}
          >
            Все
          </button>
          {level2Categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleL2Click(cat)}
              className={`px-3 h-9 rounded-full text-[13px] font-medium whitespace-nowrap flex items-center gap-1 justify-center flex-shrink-0 transition-all ${
                selectedL2 === cat.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 active:opacity-70'
              }`}
            >
              {cat.name}
              {hasChildren(cat.id) && <span className="text-base">›</span>}
            </button>
          ))}
        </div>
      )}

      {/* Товары */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="bg-gray-200 h-32" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <p className="text-gray-500 text-sm">Товары не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const cleanName = product.name.replace(/^"|"$/g, '').trim();
              const priceDisplay = !product.price || product.price === 0 
                ? 'Цена по запросу' 
                : `${product.price} ₽`;
              const isPriceOnRequest = !product.price || product.price === 0;

              return (
                <button
                  key={product.article}
                  onClick={() => navigate(`/product/${product.article}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-98 transition-transform text-left"
                >
                  <div className="relative bg-gray-100 flex items-center justify-center h-32">
                    {product.photo_url ? (
                      <img
                        src={product.photo_url}
                        alt={cleanName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🖼️</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 mb-0.5">
                      {cleanName}
                    </p>
                    <p className="text-[10px] text-gray-400 mb-1.5">
                      {product.article}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isPriceOnRequest ? 'text-gray-400' : 'text-gray-900'}`}>
                        {priceDisplay}
                      </span>
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center text-lg font-bold active:opacity-80">
                        +
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Sheet для L3 */}
      {bottomSheetL2Id !== null && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeBottomSheet}
          />
          
          {/* Шторка */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 pb-safe max-h-[80vh] flex flex-col">
            {/* Заголовок */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">{bottomSheetTitle}</h3>
              <button 
                onClick={closeBottomSheet}
                className="w-8 h-8 flex items-center justify-center text-gray-400 active:opacity-70"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Список L3 */}
            <div className="overflow-y-auto flex-1">
              <button
                onClick={() => {
                  setSelectedL2(bottomSheetL2Id);
                  setSelectedL3(null);
                  closeBottomSheet();
                }}
                className={`w-full h-11 px-4 text-left text-sm font-medium transition-colors ${
                  selectedL3 === null && selectedL2 === bottomSheetL2Id
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 active:bg-gray-50'
                }`}
              >
                Все
              </button>
              {bottomSheetL3Categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedL2(bottomSheetL2Id);
                    handleL3Select(cat.id);
                  }}
                  className={`w-full h-11 px-4 text-left text-sm font-medium transition-colors ${
                    selectedL3 === cat.id
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 active:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CatalogPage;
