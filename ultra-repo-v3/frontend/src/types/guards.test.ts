/**
 * Test Suite for Type Guards
 * Validates runtime type checking and branded type safety
 */

import { vi } from 'vitest';
import {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isFunction,
  isNull,
  isUndefined,
  isDefined,
  isNonEmpty,
  isEmail,
  isUrl,
  isPhoneNumber,
  isDate,
  isValidJSON,
  parseJsonSafe,
  assertNever,
  createBrandedType,
  matchesSchema
} from './guards';

describe('Type Guards', () => {
  describe('Primitive Type Guards', () => {
    describe('isString', () => {
      it('should return true for strings', () => {
        expect(isString('')).toBe(true);
        expect(isString('hello')).toBe(true);
        expect(isString(String('test'))).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString([])).toBe(false);
        expect(isString({})).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('should return true for numbers', () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-456)).toBe(true);
        expect(isNumber(3.14)).toBe(true);
        expect(isNumber(Number.MAX_VALUE)).toBe(true);
      });

      it('should return false for non-numbers', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(NaN)).toBe(false);
        expect(isNumber(Infinity)).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
      });
    });

    describe('isBoolean', () => {
      it('should return true for booleans', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean(Boolean(1))).toBe(true);
      });

      it('should return false for non-booleans', () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });
  });

  describe('Complex Type Guards', () => {
    describe('isArray', () => {
      it('should return true for arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(new Array(10))).toBe(true);
      });

      it('should return false for non-arrays', () => {
        expect(isArray({})).toBe(false);
        expect(isArray('array')).toBe(false);
        expect(isArray(null)).toBe(false);
      });

      it('should work with element type guard', () => {
        const stringArray = ['a', 'b', 'c'];
        const mixedArray = ['a', 1, 'c'];
        
        expect(isArray(stringArray, isString)).toBe(true);
        expect(isArray(mixedArray, isString)).toBe(false);
      });
    });

    describe('isObject', () => {
      it('should return true for plain objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: 'value' })).toBe(true);
        expect(isObject(Object.create(null))).toBe(true);
      });

      it('should return false for non-objects', () => {
        expect(isObject(null)).toBe(false);
        expect(isObject([])).toBe(false);
        expect(isObject('object')).toBe(false);
        expect(isObject(new Date())).toBe(false);
        expect(isObject(/regex/)).toBe(false);
      });
    });
  });

  describe('Validation Guards', () => {
    describe('isEmail', () => {
      it('should return true for valid emails', () => {
        expect(isEmail('test@example.com')).toBe(true);
        expect(isEmail('user.name@domain.co.uk')).toBe(true);
        expect(isEmail('user+tag@example.org')).toBe(true);
      });

      it('should return false for invalid emails', () => {
        expect(isEmail('invalid-email')).toBe(false);
        expect(isEmail('@example.com')).toBe(false);
        expect(isEmail('user@')).toBe(false);
        expect(isEmail('user@.com')).toBe(false);
        expect(isEmail('')).toBe(false);
      });
    });

    describe('isUrl', () => {
      it('should return true for valid URLs', () => {
        expect(isUrl('https://example.com')).toBe(true);
        expect(isUrl('http://localhost:3000')).toBe(true);
        expect(isUrl('https://sub.domain.com/path?query=1#hash')).toBe(true);
      });

      it('should return false for invalid URLs', () => {
        expect(isUrl('not-a-url')).toBe(false);
        expect(isUrl('ftp://example.com')).toBe(false);
        expect(isUrl('//example.com')).toBe(false);
        expect(isUrl('')).toBe(false);
      });
    });

    describe('isPhoneNumber', () => {
      it('should return true for valid phone numbers', () => {
        expect(isPhoneNumber('+1-555-123-4567')).toBe(true);
        expect(isPhoneNumber('(555) 123-4567')).toBe(true);
        expect(isPhoneNumber('555.123.4567')).toBe(true);
        expect(isPhoneNumber('15551234567')).toBe(true);
      });

      it('should return false for invalid phone numbers', () => {
        expect(isPhoneNumber('123')).toBe(false);
        expect(isPhoneNumber('not-a-phone')).toBe(false);
        expect(isPhoneNumber('')).toBe(false);
      });
    });
  });

  describe('Utility Guards', () => {
    describe('isDefined', () => {
      it('should return true for defined values', () => {
        expect(isDefined('')).toBe(true);
        expect(isDefined(0)).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined([])).toBe(true);
        expect(isDefined({})).toBe(true);
      });

      it('should return false for undefined values', () => {
        expect(isDefined(undefined)).toBe(false);
        expect(isDefined(null)).toBe(false);
      });
    });

    describe('isNonEmpty', () => {
      it('should return true for non-empty values', () => {
        expect(isNonEmpty('text')).toBe(true);
        expect(isNonEmpty([1, 2, 3])).toBe(true);
        expect(isNonEmpty({ key: 'value' })).toBe(true);
      });

      it('should return false for empty values', () => {
        expect(isNonEmpty('')).toBe(false);
        expect(isNonEmpty([])).toBe(false);
        expect(isNonEmpty({})).toBe(false);
        expect(isNonEmpty(null)).toBe(false);
        expect(isNonEmpty(undefined)).toBe(false);
      });
    });
  });

  describe('JSON Guards', () => {
    describe('isValidJSON', () => {
      it('should return true for valid JSON strings', () => {
        expect(isValidJSON('{"key": "value"}')).toBe(true);
        expect(isValidJSON('[1, 2, 3]')).toBe(true);
        expect(isValidJSON('"string"')).toBe(true);
        expect(isValidJSON('123')).toBe(true);
        expect(isValidJSON('true')).toBe(true);
      });

      it('should return false for invalid JSON strings', () => {
        expect(isValidJSON('{invalid}')).toBe(false);
        expect(isValidJSON('[1, 2, 3')).toBe(false);
        expect(isValidJSON('undefined')).toBe(false);
        expect(isValidJSON('')).toBe(false);
      });
    });

    describe('parseJsonSafe', () => {
      it('should parse valid JSON with type guard', () => {
        const jsonString = '{"name": "John", "age": 30}';
        const schema = (obj: any): obj is { name: string; age: number } => 
          isObject(obj) && isString(obj.name) && isNumber(obj.age);
        
        const result = parseJsonSafe(jsonString, schema);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('John');
          expect(result.data.age).toBe(30);
        }
      });

      it('should handle invalid JSON', () => {
        const invalidJson = '{invalid json';
        const result = parseJsonSafe(invalidJson, isObject);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Invalid JSON');
        }
      });

      it('should handle type guard failure', () => {
        const jsonString = '{"not": "expected"}';
        const schema = (obj: any): obj is { name: string; age: number } => 
          isObject(obj) && isString(obj.name) && isNumber(obj.age);
        
        const result = parseJsonSafe(jsonString, schema);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Type validation failed');
        }
      });
    });
  });

  describe('Schema Matching', () => {
    describe('matchesSchema', () => {
      it('should validate objects against schema', () => {
        const schema = {
          name: isString,
          age: isNumber,
          active: isBoolean
        };
        
        const validObject = {
          name: 'John',
          age: 30,
          active: true
        };
        
        const invalidObject = {
          name: 'John',
          age: '30', // Wrong type
          active: true
        };
        
        expect(matchesSchema(validObject, schema)).toBe(true);
        expect(matchesSchema(invalidObject, schema)).toBe(false);
      });

      it('should handle optional properties', () => {
        const schema = {
          required: isString,
          optional: (val: any) => val === undefined || isString(val)
        };
        
        const objectWithOptional = { required: 'test', optional: 'value' };
        const objectWithoutOptional = { required: 'test' };
        
        expect(matchesSchema(objectWithOptional, schema)).toBe(true);
        expect(matchesSchema(objectWithoutOptional, schema)).toBe(true);
      });
    });
  });

  describe('Branded Types', () => {
    describe('createBrandedType', () => {
      it('should create branded type validators', () => {
        const isUserId = createBrandedType<string, 'UserId'>(
          isString,
          (val) => val.length > 0 && val.startsWith('user_')
        );
        
        expect(isUserId('user_123')).toBe(true);
        expect(isUserId('invalid')).toBe(false);
        expect(isUserId(123 as any)).toBe(false);
      });

      it('should work with numeric branded types', () => {
        const isPositiveInt = createBrandedType<number, 'PositiveInt'>(
          isNumber,
          (val) => Number.isInteger(val) && val > 0
        );
        
        expect(isPositiveInt(5)).toBe(true);
        expect(isPositiveInt(-5)).toBe(false);
        expect(isPositiveInt(3.14)).toBe(false);
        expect(isPositiveInt('5' as any)).toBe(false);
      });
    });
  });

  describe('Exhaustive Checks', () => {
    describe('assertNever', () => {
      it('should throw for unexpected values', () => {
        const unexpectedValue = 'unexpected' as never;
        
        expect(() => assertNever(unexpectedValue)).toThrow(
          'Unexpected value: unexpected'
        );
      });

      it('should be used in exhaustive switch statements', () => {
        type Status = 'loading' | 'success' | 'error';
        
        function handleStatus(status: Status) {
          switch (status) {
            case 'loading':
              return 'Loading...';
            case 'success':
              return 'Success!';
            case 'error':
              return 'Error occurred';
            default:
              return assertNever(status);
          }
        }
        
        expect(handleStatus('loading')).toBe('Loading...');
        expect(handleStatus('success')).toBe('Success!');
        expect(handleStatus('error')).toBe('Error occurred');
      });
    });
  });
});