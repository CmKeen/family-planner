import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* 404 Number */}
        <div className="text-8xl font-bold text-indigo-600 mb-4">404</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('notFound.title')}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          {t('notFound.description')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {/* Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('notFound.goBack')}
          </button>

          {/* Go Home Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            {t('notFound.goHome')}
          </button>
        </div>

        {/* Helpful Suggestions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            {t('notFound.suggestions')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => navigate('/recipes')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {t('navigation.recipes')}
            </button>
            <button
              onClick={() => navigate('/family/settings')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {t('navigation.family')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
