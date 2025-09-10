import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AlertBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function AlertBanner({ message, onDismiss }: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-6 py-3 flex items-center justify-between animate-pulse-urgent" data-testid="banner-alert">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium" data-testid="text-alert-message">
          {message}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="hover:bg-red-700 text-destructive-foreground"
        data-testid="button-dismiss-alert"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
