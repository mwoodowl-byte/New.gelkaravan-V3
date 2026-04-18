import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 1) return `+7`;
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`;
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error('Введите ваше имя');
      return;
    }
    if (phone.replace(/\D/g, '').length < 11) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    if (!token) {
      toast.error('Неверная ссылка приглашения');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.acceptInvite({
        token,
        full_name: fullName.trim(),
        phone: phone.replace(/\D/g, ''),
      });

      setSuccess(true);

      if (response.status === 'approved' && response.access_token && response.user) {
        // Сразу залогинен
        login(response.access_token, response.user);
        toast.success('Добро пожаловать в GelKaravan!');
        setTimeout(() => navigate('/catalog'), 1500);
      } else {
        // Ожидает одобрения
        setIsPending(true);
        toast.success(response.message || 'Регистрация отправлена на одобрение');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (success && isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ожидайте одобрения</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Ваша заявка отправлена менеджеру. Вы получите уведомление, когда аккаунт будет активирован.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center px-6 pt-16 pb-8">
      {/* Заголовок */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-600/30">
          <span className="text-3xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать!</h1>
        <p className="text-gray-600">Вы приглашены в GelKaravan</p>
      </div>

      {/* Форма */}
      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-2 ml-1">
            Ваше имя и фамилия
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иван Петров"
            className="w-full h-14 px-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 font-medium mb-2 ml-1">
            Номер телефона
          </label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="+7 (___) ___-__-__"
            className="w-full h-14 px-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !fullName.trim() || phone.replace(/\D/g, '').length < 11}
          className="w-full h-14 bg-orange-600 text-white font-semibold rounded-2xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-600/30 mt-6"
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
          После регистрации ваш аккаунт будет проверен менеджером. Это может занять несколько минут.
        </p>
      </div>

      {/* Декоративные элементы */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-orange-200 rounded-full blur-3xl opacity-30" />
    </div>
  );
};

export default InvitePage;
