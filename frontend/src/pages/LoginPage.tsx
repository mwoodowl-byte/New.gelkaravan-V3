import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleRequestCode = async () => {
    if (phone.replace(/\D/g, '').length < 11) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    setLoading(true);
    try {
      await authAPI.requestCode(phone.replace(/\D/g, ''));
      toast.success('Код отправлен на ваш телефон');
      setStep('code');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 4) {
      toast.error('Введите 4-значный код');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyCode(phone.replace(/\D/g, ''), code);
      login(response.access_token, response.user);
      toast.success('Вы успешно вошли!');
      navigate('/catalog');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center px-6 pt-20 pb-8">
      {/* Лого */}
      <div className="mb-12 text-center">
        <div className="text-4xl font-bold text-orange-600 mb-2">GelKaravan</div>
        <div className="text-sm text-gray-500">Оптовый склад сувениров</div>
      </div>

      {/* Форма */}
      <div className="w-full max-w-sm">
        {step === 'phone' ? (
          <div className="space-y-4">
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
              onClick={handleRequestCode}
              disabled={loading || phone.replace(/\D/g, '').length < 11}
              className="w-full h-14 bg-orange-600 text-white font-semibold rounded-2xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-600/30"
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-2 ml-1">
                Код из СМС
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={handleCodeChange}
                placeholder="____"
                maxLength={4}
                className="w-full h-14 px-4 bg-white border border-gray-200 rounded-2xl text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                disabled={loading}
                autoFocus
              />
            </div>
            
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 4}
              className="w-full h-14 bg-orange-600 text-white font-semibold rounded-2xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-600/30"
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>

            <button
              onClick={() => {
                setStep('phone');
                setCode('');
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              disabled={loading}
            >
              ← Изменить номер
            </button>
          </div>
        )}

        {/* Информация о закрытой регистрации */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 leading-relaxed">
            Для получения доступа обратитесь к менеджеру
          </p>
        </div>
      </div>

      {/* Декоративные элементы */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-orange-200 rounded-full blur-3xl opacity-30" />
    </div>
  );
};

export default LoginPage;
