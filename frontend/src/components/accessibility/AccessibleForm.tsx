import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormFieldProps {
  label: string;
  id: string;
  type?: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  helpText?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
}

export function AccessibleFormField({
  label,
  id,
  type = 'text',
  required = false,
  error,
  success,
  helpText,
  value,
  onChange,
  multiline = false,
  rows = 4,
  autoComplete,
  inputMode,
}: FormFieldProps) {
  const fieldId = `field-${id}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const ariaDescribedBy = [
    helpText && helpId,
    error && errorId,
  ].filter(Boolean).join(' ');

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="form-field mb-6">
      <label 
        htmlFor={fieldId}
        className={cn(
          "block text-sm font-semibold mb-2",
          error && "text-red-600 dark:text-red-400",
          success && "text-green-600 dark:text-green-400"
        )}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="requis">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <InputComponent
          id={fieldId}
          type={multiline ? undefined : type}
          value={value}
          onChange={onChange}
          required={required}
          aria-required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy || undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
          rows={multiline ? rows : undefined}
          className={cn(
            "w-full px-4 py-2 border-2 rounded-lg",
            "focus:outline-none focus:ring-4 focus:ring-primary/20",
            "transition-all duration-200",
            error && "border-red-500 bg-red-50 dark:bg-red-950/20",
            success && "border-green-500 bg-green-50 dark:bg-green-950/20",
            !error && !success && "border-gray-300 dark:border-gray-600"
          )}
        />

        {/* Status Icons */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute right-3 top-3"
            >
              <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </motion.div>
          )}
          {success && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute right-3 top-3"
            >
              <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p id={helpId} className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="alert"
            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RadioGroupProps {
  label: string;
  name: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
}

export function AccessibleRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required = false,
  error,
}: RadioGroupProps) {
  const groupId = `radio-group-${name}`;
  const errorId = `${groupId}-error`;

  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={`${groupId}-label`}
      aria-describedby={error ? errorId : undefined}
      aria-required={required}
      aria-invalid={error ? 'true' : 'false'}
      className="mb-6"
    >
      <legend id={`${groupId}-label`} className="text-sm font-semibold mb-3">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="requis">
            *
          </span>
        )}
      </legend>

      <div className="space-y-2">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "flex items-center p-3 border-2 rounded-lg cursor-pointer",
                "hover:bg-gray-50 dark:hover:bg-gray-800",
                "transition-all duration-200",
                value === option.value && "border-primary bg-primary/5",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className="mr-3 w-4 h-4 text-primary focus:ring-4 focus:ring-primary/20"
              />
              <span className={cn(
                "text-sm",
                option.disabled && "text-gray-500"
              )}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface CheckboxProps {
  label: string;
  id: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  error?: string;
  helpText?: string;
}

export function AccessibleCheckbox({
  label,
  id,
  checked = false,
  onChange,
  required = false,
  error,
  helpText,
}: CheckboxProps) {
  const checkboxId = `checkbox-${id}`;
  const errorId = `${checkboxId}-error`;
  const helpId = `${checkboxId}-help`;

  const ariaDescribedBy = [
    helpText && helpId,
    error && errorId,
  ].filter(Boolean).join(' ');

  return (
    <div className="mb-6">
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex items-start cursor-pointer",
          error && "text-red-600"
        )}
      >
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          required={required}
          aria-required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={ariaDescribedBy || undefined}
          className={cn(
            "mt-1 mr-3 w-5 h-5 rounded",
            "text-primary focus:ring-4 focus:ring-primary/20",
            "transition-all duration-200",
            error && "border-red-500"
          )}
        />
        <div className="flex-1">
          <span className="text-sm font-medium">
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="requis">
                *
              </span>
            )}
          </span>
          {helpText && (
            <p id={helpId} className="mt-1 text-sm text-gray-600">
              {helpText}
            </p>
          )}
        </div>
      </label>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-red-600 ml-8">
          {error}
        </p>
      )}
    </div>
  );
}

interface FormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
  ariaLabel?: string;
}

export function AccessibleForm({
  children,
  onSubmit,
  className,
  ariaLabel,
}: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      aria-label={ariaLabel}
      noValidate // We handle validation ourselves for better accessibility
    >
      <div role="group">
        {children}
      </div>
    </form>
  );
}

// Composant pour les messages de validation globaux
export function FormValidationSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-500 rounded-lg"
    >
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
        Veuillez corriger les erreurs suivantes :
      </h3>
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="text-sm text-red-600 dark:text-red-400">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
}