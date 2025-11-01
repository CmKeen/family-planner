import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-auto h-9 gap-2 border-0 bg-transparent hover:bg-accent focus:ring-offset-0">
        <Globe className="h-4 w-4" />
        <SelectValue>
          {t(`language.${i18n.language}`)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="fr">{t('language.fr')}</SelectItem>
        <SelectItem value="en">{t('language.en')}</SelectItem>
        <SelectItem value="nl">{t('language.nl')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
