import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeInput, validateFormInput, SANITIZE_CONFIG } from "@/lib/sanitize";

export interface SecureTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  sanitizeType?: keyof typeof SANITIZE_CONFIG;
  onSecureChange?: (value: string, isValid: boolean, error?: string) => void;
  showValidation?: boolean;
  required?: boolean;
  maxLength?: number;
}

const SecureTextarea = React.forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ 
    className, 
    sanitizeType = "basic", 
    onSecureChange,
    showValidation = true,
    required = false,
    maxLength = 1000,
    value,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(
      typeof value === 'string' ? sanitizeInput(value, sanitizeType) : ''
    );
    const [validationError, setValidationError] = React.useState<string | undefined>();
    const [isValid, setIsValid] = React.useState(true);
    const [charCount, setCharCount] = React.useState(0);

    // Synchroniser avec les props externes
    React.useEffect(() => {
      if (typeof value === 'string' && value !== internalValue) {
        const sanitized = sanitizeInput(value, sanitizeType);
        setInternalValue(sanitized);
        setCharCount(sanitized.length);
      }
    }, [value, sanitizeType, internalValue]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let newValue = e.target.value;
      
      // Limite de caractères
      if (newValue.length > maxLength) {
        newValue = newValue.substring(0, maxLength);
      }
      
      const validation = validateFormInput(newValue, sanitizeType, required);
      
      setInternalValue(validation.sanitized);
      setValidationError(validation.error);
      setIsValid(validation.isValid);
      setCharCount(validation.sanitized.length);
      
      // Notifier le parent avec les données validées
      onSecureChange?.(validation.sanitized, validation.isValid, validation.error);
    }, [sanitizeType, required, maxLength, onSecureChange]);

    const textareaClassName = cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical",
      !isValid && "border-destructive focus-visible:ring-destructive",
      className
    );

    return (
      <div className="space-y-2">
        <textarea
          className={textareaClassName}
          ref={ref}
          value={internalValue}
          onChange={handleChange}
          aria-invalid={!isValid}
          aria-describedby={[
            validationError ? `${props.id}-error` : '',
            `${props.id}-count`
          ].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        
        <div className="flex justify-between items-start">
          {showValidation && validationError && (
            <div 
              id={props.id ? `${props.id}-error` : undefined}
              className="text-sm text-destructive flex items-center space-x-2 flex-1"
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
          
          <div 
            id={props.id ? `${props.id}-count` : undefined}
            className={cn(
              "text-xs text-muted-foreground",
              charCount > maxLength * 0.9 && "text-orange-500",
              charCount >= maxLength && "text-destructive"
            )}
            aria-live="polite"
          >
            {charCount}/{maxLength}
          </div>
        </div>
      </div>
    );
  }
);

SecureTextarea.displayName = "SecureTextarea";

export { SecureTextarea };