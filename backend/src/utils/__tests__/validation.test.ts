import { passwordSchema, emailSchema } from '../validation';
import { ZodError } from 'zod';

describe('Password Validation Schema', () => {
  describe('Length Requirements', () => {
    it('should reject password with less than 12 characters', () => {
      expect(() => passwordSchema.parse('Short1!')).toThrow(ZodError);
      expect(() => passwordSchema.parse('Pass1!')).toThrow(ZodError);
      expect(() => passwordSchema.parse('Test123!')).toThrow(ZodError);
    });

    it('should accept password with exactly 12 characters', () => {
      expect(() => passwordSchema.parse('ValidPass1!@')).not.toThrow();
    });

    it('should accept password with more than 12 characters', () => {
      expect(() => passwordSchema.parse('VerySecurePassword123!')).not.toThrow();
    });
  });

  describe('Complexity Requirements', () => {
    it('should reject password without uppercase letter', () => {
      expect(() => passwordSchema.parse('lowercase123!@#')).toThrow(ZodError);
    });

    it('should reject password without lowercase letter', () => {
      expect(() => passwordSchema.parse('UPPERCASE123!@#')).toThrow(ZodError);
    });

    it('should reject password without number', () => {
      expect(() => passwordSchema.parse('NoNumbersHere!@#')).toThrow(ZodError);
    });

    it('should reject password without special character', () => {
      expect(() => passwordSchema.parse('NoSpecialChar123')).toThrow(ZodError);
    });

    it('should accept password with all requirements', () => {
      expect(() => passwordSchema.parse('ComplexPass123!@')).not.toThrow();
    });
  });

  describe('Common Weak Passwords', () => {
    const weakPasswords = [
      '12345678',
      'password',
      'qwertyuiop',
      'aaaaaaaa',
      'password1',
      'Password1' // Missing special char
    ];

    weakPasswords.forEach((password) => {
      it(`should reject weak password: "${password}"`, () => {
        expect(() => passwordSchema.parse(password)).toThrow(ZodError);
      });
    });
  });

  describe('Special Characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];

    specialChars.forEach((char) => {
      it(`should accept password with special character "${char}"`, () => {
        expect(() => passwordSchema.parse(`ValidPass123${char}`)).not.toThrow();
      });
    });
  });

  describe('Strong Password Examples', () => {
    const strongPasswords = [
      'MySecurePass123!',
      'Tr0ub4dor&3Extended',
      'correct-horse-battery-staple-1!A',
      'P@ssw0rd123456',
      'Str0ng!Pa$$w0rd',
      'My Pass Word 123!' // With spaces
    ];

    strongPasswords.forEach((password) => {
      it(`should accept strong password: "${password}"`, () => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should reject password with only spaces', () => {
      expect(() => passwordSchema.parse('            ')).toThrow(ZodError);
    });

    it('should accept very long password', () => {
      const longPassword = 'ThisIsAVeryLongPasswordThatMeetsAllRequirements123!@#$%^&*()';
      expect(() => passwordSchema.parse(longPassword)).not.toThrow();
    });
  });
});

describe('Email Validation Schema', () => {
  it('should accept valid email addresses', () => {
    expect(() => emailSchema.parse('test@example.com')).not.toThrow();
    expect(() => emailSchema.parse('user.name+tag@example.co.uk')).not.toThrow();
  });

  it('should reject invalid email addresses', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow(ZodError);
    expect(() => emailSchema.parse('@example.com')).toThrow(ZodError);
    expect(() => emailSchema.parse('test@')).toThrow(ZodError);
  });
});
