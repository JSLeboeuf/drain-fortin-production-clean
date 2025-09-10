import { Badge } from "@/components/ui/badge";

interface DataSourceIndicatorProps {
  source: 'vapi_production' | 'twilio_api_ready' | 'storage_fallback' | 'local_counters';
  className?: string;
}

export default function DataSourceIndicator({ source, className = "" }: DataSourceIndicatorProps) {
  const getSourceInfo = (source: string) => {
    switch (source) {
      case 'vapi_production':
        return { label: '🟢 Production', variant: 'secondary' as const, color: 'text-green-600' };
      case 'twilio_api_ready':
        return { label: '📞 SMS Actif', variant: 'secondary' as const, color: 'text-blue-600' };
      case 'storage_fallback':
        return { label: '💾 Archive', variant: 'outline' as const, color: 'text-orange-600' };
      case 'local_counters':
        return { label: '📊 Local', variant: 'outline' as const, color: 'text-yellow-600' };
      default:
        return { label: '❓ Inconnu', variant: 'destructive' as const, color: 'text-red-600' };
    }
  };

  const info = getSourceInfo(source);

  return (
    <Badge 
      variant={info.variant} 
      className={`text-xs ${info.color} ${className}`}
      title={`Source des données: ${source}`}
    >
      {info.label}
    </Badge>
  );
}