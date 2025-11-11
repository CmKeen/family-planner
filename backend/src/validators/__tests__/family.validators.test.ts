import { updateMemberSchema } from '../family.validators';
import { ZodError } from 'zod';

describe('Family Validators', () => {
  describe('updateMemberSchema', () => {
    describe('Valid inputs', () => {
      it('should accept valid name update', () => {
        const result = updateMemberSchema.parse({ name: 'John Doe' });
        expect(result.name).toBe('John Doe');
      });

      it('should accept valid role update', () => {
        const result = updateMemberSchema.parse({ role: 'ADMIN' });
        expect(result.role).toBe('ADMIN');
      });

      it('should accept all valid roles', () => {
        const roles = ['ADMIN', 'PARENT', 'MEMBER', 'CHILD'] as const;
        roles.forEach(role => {
          const result = updateMemberSchema.parse({ role });
          expect(result.role).toBe(role);
        });
      });

      it('should accept valid age update', () => {
        const result = updateMemberSchema.parse({ age: 25 });
        expect(result.age).toBe(25);
      });

      it('should accept age of 0', () => {
        const result = updateMemberSchema.parse({ age: 0 });
        expect(result.age).toBe(0);
      });

      it('should accept valid portionFactor update', () => {
        const result = updateMemberSchema.parse({ portionFactor: 1.5 });
        expect(result.portionFactor).toBe(1.5);
      });

      it('should accept minimum portionFactor', () => {
        const result = updateMemberSchema.parse({ portionFactor: 0.1 });
        expect(result.portionFactor).toBe(0.1);
      });

      it('should accept maximum portionFactor', () => {
        const result = updateMemberSchema.parse({ portionFactor: 5.0 });
        expect(result.portionFactor).toBe(5.0);
      });

      it('should accept valid aversions array', () => {
        const result = updateMemberSchema.parse({ aversions: ['peanuts', 'shellfish'] });
        expect(result.aversions).toEqual(['peanuts', 'shellfish']);
      });

      it('should accept valid favorites array', () => {
        const result = updateMemberSchema.parse({ favorites: ['pizza', 'pasta'] });
        expect(result.favorites).toEqual(['pizza', 'pasta']);
      });

      it('should accept multiple valid fields', () => {
        const result = updateMemberSchema.parse({
          name: 'Jane Doe',
          age: 30,
          role: 'PARENT',
          portionFactor: 1.2,
          aversions: ['dairy'],
          favorites: ['sushi']
        });
        expect(result.name).toBe('Jane Doe');
        expect(result.age).toBe(30);
        expect(result.role).toBe('PARENT');
      });

      it('should accept empty object (partial update)', () => {
        const result = updateMemberSchema.parse({});
        expect(result).toEqual({});
      });
    });

    describe('Invalid inputs - Name', () => {
      it('should reject empty name', () => {
        expect(() => updateMemberSchema.parse({ name: '' })).toThrow(ZodError);
      });

      it('should reject name that is too long', () => {
        const longName = 'a'.repeat(256);
        expect(() => updateMemberSchema.parse({ name: longName })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Role', () => {
      it('should reject invalid role', () => {
        expect(() => updateMemberSchema.parse({ role: 'INVALID_ROLE' })).toThrow(ZodError);
      });

      it('should reject lowercase role', () => {
        expect(() => updateMemberSchema.parse({ role: 'admin' })).toThrow(ZodError);
      });

      it('should reject empty role', () => {
        expect(() => updateMemberSchema.parse({ role: '' })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Age', () => {
      it('should reject negative age', () => {
        expect(() => updateMemberSchema.parse({ age: -1 })).toThrow(ZodError);
      });

      it('should reject age over 150', () => {
        expect(() => updateMemberSchema.parse({ age: 151 })).toThrow(ZodError);
      });

      it('should reject non-integer age', () => {
        expect(() => updateMemberSchema.parse({ age: 25.5 })).toThrow(ZodError);
      });

      it('should reject string age', () => {
        expect(() => updateMemberSchema.parse({ age: '25' })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Portion Factor', () => {
      it('should reject portionFactor below 0.1', () => {
        expect(() => updateMemberSchema.parse({ portionFactor: 0.05 })).toThrow(ZodError);
      });

      it('should reject portionFactor above 5.0', () => {
        expect(() => updateMemberSchema.parse({ portionFactor: 5.1 })).toThrow(ZodError);
      });

      it('should reject negative portionFactor', () => {
        expect(() => updateMemberSchema.parse({ portionFactor: -1 })).toThrow(ZodError);
      });

      it('should reject string portionFactor', () => {
        expect(() => updateMemberSchema.parse({ portionFactor: '1.5' })).toThrow(ZodError);
      });
    });

    describe('Invalid inputs - Aversions and Favorites', () => {
      it('should reject non-array aversions', () => {
        expect(() => updateMemberSchema.parse({ aversions: 'peanuts' })).toThrow(ZodError);
      });

      it('should reject aversions with non-string elements', () => {
        expect(() => updateMemberSchema.parse({ aversions: [1, 2, 3] })).toThrow(ZodError);
      });

      it('should reject non-array favorites', () => {
        expect(() => updateMemberSchema.parse({ favorites: 'pizza' })).toThrow(ZodError);
      });

      it('should reject favorites with non-string elements', () => {
        expect(() => updateMemberSchema.parse({ favorites: [1, 2, 3] })).toThrow(ZodError);
      });
    });

    describe('Security - Forbidden field injection', () => {
      it('should strip out forbidden field: id', () => {
        const result = updateMemberSchema.parse({
          name: 'John Doe',
          id: 'malicious-id'
        } as any);
        expect(result).toEqual({ name: 'John Doe' });
        expect((result as any).id).toBeUndefined();
      });

      it('should strip out forbidden field: userId', () => {
        const result = updateMemberSchema.parse({
          name: 'John Doe',
          userId: 'malicious-user-id'
        } as any);
        expect(result).toEqual({ name: 'John Doe' });
        expect((result as any).userId).toBeUndefined();
      });

      it('should strip out forbidden field: familyId', () => {
        const result = updateMemberSchema.parse({
          name: 'John Doe',
          familyId: 'malicious-family-id'
        } as any);
        expect(result).toEqual({ name: 'John Doe' });
        expect((result as any).familyId).toBeUndefined();
      });

      it('should strip out multiple forbidden fields', () => {
        const result = updateMemberSchema.parse({
          name: 'John Doe',
          id: 'bad-id',
          userId: 'bad-user',
          familyId: 'bad-family',
          createdAt: new Date()
        } as any);
        expect(result).toEqual({ name: 'John Doe' });
        expect((result as any).id).toBeUndefined();
        expect((result as any).userId).toBeUndefined();
        expect((result as any).familyId).toBeUndefined();
        expect((result as any).createdAt).toBeUndefined();
      });

      it('should only allow whitelisted fields through', () => {
        const input = {
          name: 'John Doe',
          role: 'PARENT',
          age: 30,
          portionFactor: 1.5,
          aversions: ['peanuts'],
          favorites: ['pizza'],
          // Forbidden fields
          id: 'malicious-id',
          userId: 'malicious-user',
          familyId: 'malicious-family',
          __proto__: { isAdmin: true },
          constructor: { name: 'Evil' }
        } as any;

        const result = updateMemberSchema.parse(input);

        // Only whitelisted fields should exist
        expect(Object.keys(result)).toEqual(
          expect.arrayContaining(['name', 'role', 'age', 'portionFactor', 'aversions', 'favorites'])
        );
        expect(Object.keys(result)).not.toContain('id');
        expect(Object.keys(result)).not.toContain('userId');
        expect(Object.keys(result)).not.toContain('familyId');
        expect(Object.keys(result)).not.toContain('__proto__');
        expect(Object.keys(result)).not.toContain('constructor');
      });
    });
  });
});
