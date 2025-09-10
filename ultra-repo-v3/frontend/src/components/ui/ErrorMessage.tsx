import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className = '' }: ErrorMessageProps) {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md w-full">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{message}</p>
        </div>
      </div>
    </div>
  )
}