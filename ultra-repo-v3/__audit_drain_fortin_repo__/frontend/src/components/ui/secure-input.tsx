import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeInput, validateFormInput, SANITIZE_CONFIG } from "@/lib/sanitize";

export interface SecureInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  sanitizeType?: keyof typeof SANITIZE_CONFIG;
  onSecureChange?: (value: string, isValid: boolean, error?: string) => void;
  showValidation?: boolean;
  required?: boolean;
}

const SecureInput = React.forwardRef<HTMLInputElement, SecureInputProps>(
  ({ 
    className, 
    type = "text", 
    sanitizeType = "text", 
    onSecureChange,
    showValidation = true,
    required = false,
    value,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(
      typeof value === 'string' ? sanitizeInput(value, sanitizeType) : ''
    );
    const [validationError, setValidationError] = React.useState<string | undefined>();
    const [isValid, setIsValid] = React.useState(true);

    // Synchroniser avec les props externes
    React.useEffect(() => {
      if (typeof value === 'string' && value !== internalValue) {
        const sanitized = sanitizeInput(value, sanitizeType);
        setInternalValue(sanitized);
      }
    }, [value, sanitizeType, internalValue]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const validation = validateFormInput(newValue, sanitizeType, required);
      
      setInternalValue(validation.sanitized);
      setValidationError(validation.error);
      setIsValid(validation.isValid);
      
      // Notifier le parent avec les données validées
      onSecureChange?.(validation.sanitized, validation.isValid, validation.error);
    }, [sanitizeType, required, onSecureChange]);

    const inputClassName = cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      !isValid && "border-destructive focus-visible:ring-destructive",
      className
    );

    return (
      <div className="space-y-2">
        <input
          type={type}
          className={inputClassName}
          ref={ref}
          value={internalValue}
          onChange={handleChange}
          aria-invalid={!isValid}
          aria-describedby={validationError ? `${props.id}-error` : undefined}
          {...props}
        />
        
        {showValidation && validationError && (
          <div 
            id={props.id ? `${props.id}-error` : undefined}
            className="text-sm text-destructive flex items-center space-x-2"
            role="alert"
            aria-live="polite"
          >
            <svg 
              className="h-4 w-4 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20" 
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{validationError}</span>
          </div>
        )}
      </div>
    );
  }
);

SecureInput.displayName = "SecureInput";

export { SecureInput };