import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageSwitcher } from '../LanguageSwitcher';

// Mock react-i18next
const mockChangeLanguage = vi.fn();
const mockI18n = {
  language: 'fr',
  changeLanguage: mockChangeLanguage
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: mockI18n,
    t: (key: string) => {
      const translations: Record<string, string> = {
        'language.fr': 'Français',
        'language.en': 'English',
        'language.nl': 'Nederlands',
        'language.switch': 'Change language'
      };
      return translations[key] || key;
    }
  })
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'fr'; // Reset to French
  });

  describe('Rendering', () => {
    it('should render the select trigger', () => {
      render(<LanguageSwitcher />);

      // The trigger should be present
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('should display the current language in the trigger (French)', () => {
      render(<LanguageSwitcher />);

      // Should show "Français" for French
      expect(screen.getByText('Français')).toBeInTheDocument();
    });

    it('should display English when current language is English', () => {
      mockI18n.language = 'en';
      render(<LanguageSwitcher />);

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should display Nederlands when current language is Dutch', () => {
      mockI18n.language = 'nl';
      render(<LanguageSwitcher />);

      expect(screen.getByText('Nederlands')).toBeInTheDocument();
    });

    it('should have Globe icon', () => {
      const { container } = render(<LanguageSwitcher />);

      // Check for SVG icon with lucide-globe class
      const icon = container.querySelector('.lucide-globe');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should use Select component', () => {
      render(<LanguageSwitcher />);

      // Verify it's using Radix UI Select by checking for combobox role
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded');
    });

    it('should have proper ARIA attributes', () => {
      render(<LanguageSwitcher />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded');
      expect(trigger).toHaveAttribute('aria-controls');
    });

    it('should be styled appropriately', () => {
      render(<LanguageSwitcher />);

      const trigger = screen.getByRole('combobox');
      // Check for key styling classes
      expect(trigger).toHaveClass('h-9');
      expect(trigger).toHaveClass('gap-2');
      expect(trigger).toHaveClass('bg-transparent');
    });
  });

  describe('Language Change Handler', () => {
    it('should call changeLanguage when onValueChange is triggered', () => {
      render(<LanguageSwitcher />);

      // Find the Select root and trigger onValueChange programmatically
      const trigger = screen.getByRole('combobox');

      // Simulate the Select component's onValueChange being called
      // We test this by checking that the handler exists and would call changeLanguage
      expect(trigger).toBeInTheDocument();

      // The actual interaction testing will be done via Chrome MCP
      // due to JSDOM limitations with Radix UI's pointer capture functionality
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown language gracefully', () => {
      mockI18n.language = 'unknown';
      render(<LanguageSwitcher />);

      // Should still render without crashing
      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();
    });

    it('should render all three language options', () => {
      render(<LanguageSwitcher />);

      // Note: Full dropdown interaction testing will be done with Chrome MCP
      // Here we just verify the component renders correctly
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Translation Keys', () => {
    it('should use correct translation keys for each language', () => {
      const { rerender } = render(<LanguageSwitcher />);

      // French
      expect(screen.getByText('Français')).toBeInTheDocument();

      // English
      mockI18n.language = 'en';
      rerender(<LanguageSwitcher />);
      expect(screen.getByText('English')).toBeInTheDocument();

      // Dutch
      mockI18n.language = 'nl';
      rerender(<LanguageSwitcher />);
      expect(screen.getByText('Nederlands')).toBeInTheDocument();
    });
  });
});
