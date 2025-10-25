import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = ['fr', 'en', 'nl'];
  const languageLabels = { fr: 'EN', en: 'NL', nl: 'FR' };

  const toggleLanguage = () => {
    const currentIndex = languages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
      title={t('language.switch')}
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {languageLabels[i18n.language as keyof typeof languageLabels] || 'FR'}
      </span>
    </Button>
  );
}
