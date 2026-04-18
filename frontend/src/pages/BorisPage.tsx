const BorisPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
      {/* Центральный зелёный круг с иконкой */}
      <div className="mb-8 flex items-center justify-center w-32 h-32 bg-[#25D366] rounded-full shadow-lg shadow-[#25D366]/30">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {/* Заголовок */}
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Борис</h1>
      
      {/* Подзаголовок */}
      <p className="text-lg text-gray-500 mb-4 text-center">
        Ваш умный помощник
      </p>

      {/* Описание */}
      <p className="text-sm text-gray-400 text-center max-w-sm mb-12">
        Скоро здесь — принимает заказы голосом и текстом
      </p>

      {/* Кнопка демо */}
      <button
        disabled
        className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-full opacity-50 cursor-not-allowed"
      >
        Попробовать демо
      </button>
    </div>
  );
};

export default BorisPage;
