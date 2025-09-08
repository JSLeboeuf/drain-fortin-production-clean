/**
 * Type Guards and Validators
 * Runtime type checking utilities for improved type safety
 */

// Generic type guard function type
export type TypeGuard<T> = (value: unknown) => value is T;

// Primitive type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

export const isNull = (value: unknown): value is null => {
  return value === null;
};

export const isUndefined = (value: unknown): value is undefined => {
  return value === undefined;
};

export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return value == null;
};

// Object type guards
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isArray = <T = unknown>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

export const isFunction = (value: unknown): value is Function => {
  return typeof value === 'function';
};

export const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isPromise = <T = unknown>(value: unknown): value is Promise<T> => {
  return (
    value instanceof Promise ||
    (isObject(value) && 
     'then' in value && 
     isFunction(value.then) &&
     'catch' in value &&
     isFunction(value.catch))
  );
};

// Complex type guards
export const hasProperty = <K extends string | number | symbol>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> => {
  return isObject(obj) && key in obj;
};

export const hasProperties = <K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> => {
  return isObject(obj) && keys.every(key => key in obj);
};

// Validation helpers
export const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.trim().length > 0;
};

export const isPositiveNumber = (value: unknown): value is number => {
  return isNumber(value) && value > 0;
};

export const isEmail = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

export const isUrl = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const isPhoneNumber = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
};

// Array validation
export const isNonEmptyArray = <T = unknown>(value: unknown): value is T[] => {
  return isArray(value) && value.length > 0;
};

export const isArrayOf = <T>(
  value: unknown,
  guard: TypeGuard<T>
): value is T[] => {
  return isArray(value) && value.every(guard);
};

// Object validation
export const isObjectWithKeys = <K extends string>(
  value: unknown,
  keys: K[]
): value is Record<K, unknown> => {
  return isObject(value) && keys.every(key => key in value);
};

export const isObjectMatching = <T extends Record<string, TypeGuard<any>>>(
  value: unknown,
  schema: T
): value is { [K in keyof T]: T[K] extends TypeGuard<infer U> ? U : never } => {
  if (!isObject(value)) return false;
  
  return Object.entries(schema).every(([key, guard]) => {
    return hasProperty(value, key) && guard(value[key]);
  });
};

// Union type helpers
export const oneOf = <T extends readonly unknown[]>(
  value: unknown,
  options: T
): value is T[number] => {
  return options.includes(value);
};

// Error type guard
export const isError = (value: unknown): value is Error => {
  return value instanceof Error || (
    isObject(value) &&
    'message' in value &&
    isString(value.message) &&
    'name' in value &&
    isString(value.name)
  );
};

// Safe JSON parsing with type guard
export const parseJsonSafe = <T>(
  json: string,
  guard?: TypeGuard<T>
): T | null => {
  try {
    const parsed = JSON.parse(json);
    if (guard && !guard(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// Type assertion with runtime check
export function assertType<T>(
  value: unknown,
  guard: TypeGuard<T>,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(message || `Type assertion failed`);
  }
}

// Exhaustive check for discriminated unions
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Branded types for additional type safety
export type Brand<T, B> = T & { __brand: B };

export const createBrand = <T, B extends string>(
  value: T,
  brand: B,
  validator?: (value: T) => boolean
): Brand<T, B> => {
  if (validator && !validator(value)) {
    throw new Error(`Invalid ${brand} value`);
  }
  return value as Brand<T, B>;
};

// Common branded types
export type EmailString = Brand<string, 'Email'>;
export type UrlString = Brand<string, 'Url'>;
export type PhoneString = Brand<string, 'Phone'>;
export type NonEmptyString = Brand<string, 'NonEmpty'>;
export type PositiveNumber = Brand<number, 'Positive'>;

export const toEmail = (value: string): EmailString => {
  return createBrand(value, 'Email', isEmail);
};

export const toUrl = (value: string): UrlString => {
  return createBrand(value, 'Url', isUrl);
};

export const toPhone = (value: string): PhoneString => {
  return createBrand(value, 'Phone', isPhoneNumber);
};

export const toNonEmptyString = (value: string): NonEmptyString => {
  return createBrand(value, 'NonEmpty', isNonEmptyString);
};

export const toPositiveNumber = (value: number): PositiveNumber => {
  return createBrand(value, 'Positive', isPositiveNumber);
};