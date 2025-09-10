import { Headphones, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveCall } from "@/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface LiveCallCardProps {
  call: LiveCall;
  onListen?: () => void;
  onTransfer?: () => void;
}

export default function LiveCallCard({ call, onListen, onTransfer }: LiveCallCardProps) {
  const [duration, setDuration] = useState(call.duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "P1":
        return "priority-p1 card-premium animate-pulse-urgent border-l-4 border-l-priority-p1";
      case "P2":
        return "priority-p2 card-premium border-l-4 border-l-drain-orange-500";
      case "P3":
        return "priority-p3 card-premium border-l-4 border-l-drain-orange-300";
      case "P4":
        return "priority-p4 card-premium border-l-4 border-l-drain-green-500";
      default:
        return "card-premium border-border bg-card";
    }
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-gradient-to-r from-priority-p1 to-red-700 text-white shadow-lg";
      case "P2":
        return "bg-gradient-to-r from-drain-orange-500 to-drain-orange-600 text-white shadow-lg";
      case "P3":
        return "bg-gradient-to-r from-drain-orange-400 to-drain-orange-500 text-white shadow-lg";
      case "P4":
        return "bg-gradient-to-r from-drain-green-500 to-drain-green-600 text-white shadow-lg";
      default:
        return "bg-drain-steel-500 text-white";
    }
  };

  return (
    <div className={cn("border rounded-lg p-4", getPriorityStyles(call.priority))} data-testid={`card-live-call-${call.id}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getPriorityBadgeStyles(call.priority))} data-testid={`badge-priority-${call.priority}`}>
            {call.priority}
          </span>
          <span className="font-mono text-sm text-foreground" data-testid={`text-phone-${call.id}`}>
            {call.phoneNumber}
          </span>
        </div>
        <span className="text-sm text-muted-foreground" data-testid={`text-duration-${call.id}`}>
          {formatDuration(duration)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-transcript-${call.id}`}>
        {call.transcript || "En attente de transcription..."}
      </p>
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="default"
          onClick={onListen}
          className="text-xs"
          data-testid={`button-listen-${call.id}`}
        >
          <Headphones className="h-3 w-3 mr-1" />
          Écouter
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onTransfer}
          className="text-xs"
          data-testid={`button-transfer-${call.id}`}
        >
          <PhoneCall className="h-3 w-3 mr-1" />
          Transférer
        </Button>
      </div>
    </div>
  );
}
