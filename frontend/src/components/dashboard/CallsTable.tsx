import { memo, useMemo, useCallback } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Call } from "@/types";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface CallsTableProps {
  calls: Call[];
  showActions?: boolean;
  onSortChange?: (key: "date"|"duration"|"status"|"service"|"tag") => void;
  sortKey?: "date"|"duration"|"status"|"service"|"tag";
  sortDir?: "asc"|"desc";
}

const CallsTable = memo<CallsTableProps>(function CallsTable({ calls, showActions = true, onSortChange, sortKey, sortDir }) {
  // Memoized utility functions
  const formatTime = useCallback((date: Date) => {
    return new Date(date).toLocaleTimeString("fr-CA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Memoized style functions
  const getPriorityBadgeStyles = useMemo(() => ({
    "P1": "bg-red-600 text-white",
    "P2": "bg-orange-600 text-white", 
    "P3": "bg-yellow-600 text-white",
    "P4": "bg-green-600 text-white",
    "default": "bg-gray-600 text-white"
  }), []);

  const getStatusBadgeStyles = useMemo(() => ({
    "completed": "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
    "transferred": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
    "active": "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400",
    "failed": "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
    "default": "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400"
  }), []);

  const getStatusLabel = useMemo(() => ({
    "completed": "Complété",
    "transferred": "Transféré",
    "active": "Actif",
    "failed": "Échoué"
  }), []);

  const getServiceFromMetadata = useCallback((metadata: any) => {
    if (metadata?.service) return metadata.service;
    if (metadata?.scenario) return metadata.scenario;
    return "Service non spécifié";
  }, []);

  // Memoized sort handlers
  const handleSort = useCallback((key: "date"|"duration"|"status"|"service"|"tag") => {
    onSortChange?.(key);
  }, [onSortChange]);

  // Memoized empty state
  const emptyState = useMemo(() => (
    <div className="text-center py-8 text-muted-foreground" data-testid="text-no-calls">
      Aucun appel disponible
    </div>
  ), []);

  if (calls.length === 0) {
    return emptyState;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button className="text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                aria-label="Trier par date"
                aria-sort={sortKey==="date" ? (sortDir==="asc"?"ascending":"descending") : "none"}
                onClick={() => handleSort("date")}>Heure</button>
            </TableHead>
            <TableHead>Numéro</TableHead>
            <TableHead>
              <button className="text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                aria-label="Trier par durée"
                aria-sort={sortKey==="duration" ? (sortDir==="asc"?"ascending":"descending") : "none"}
                onClick={() => handleSort("duration")}>Durée</button>
            </TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>
              <button className="text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                aria-label="Trier par statut"
                aria-sort={sortKey==="status" ? (sortDir==="asc"?"ascending":"descending") : "none"}
                onClick={() => handleSort("status")}>Statut</button>
            </TableHead>
            <TableHead>
              <button className="text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                aria-label="Trier par service"
                aria-sort={sortKey==="service" ? (sortDir==="asc"?"ascending":"descending") : "none"}
                onClick={() => handleSort("service")}>Service</button>
            </TableHead>
            <TableHead>
              <button className="text-left font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                aria-label="Trier par tag"
                aria-sort={sortKey==="tag" ? (sortDir==="asc"?"ascending":"descending") : "none"}
                onClick={() => handleSort("tag")}>Tag</button>
            </TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id} className="hover:bg-muted/50" data-testid={`row-call-${call.id}`}>
              <TableCell className="text-sm text-foreground" data-testid={`text-time-${call.id}`}>
                {formatTime(call.startTime)}
              </TableCell>
              <TableCell className="text-sm font-mono text-foreground" data-testid={`text-phone-${call.id}`}>
                {call.phoneNumber}
              </TableCell>
              <TableCell className="text-sm text-foreground" data-testid={`text-duration-${call.id}`}>
                {formatDuration(call.duration)}
              </TableCell>
              <TableCell>
                <span
                  className={cn("px-2 py-1 text-xs font-medium rounded-full", 
                    getPriorityBadgeStyles[call.priority as keyof typeof getPriorityBadgeStyles] || 
                    getPriorityBadgeStyles.default)}
                  data-testid={`badge-priority-${call.id}`}
                >
                  {call.priority}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={cn("px-2 py-1 text-xs rounded-full", 
                    getStatusBadgeStyles[call.status as keyof typeof getStatusBadgeStyles] || 
                    getStatusBadgeStyles.default)}
                  data-testid={`badge-status-${call.id}`}
                >
                  {getStatusLabel[call.status as keyof typeof getStatusLabel] || call.status}
                </span>
              </TableCell>
              <TableCell className="text-sm text-foreground" data-testid={`text-service-${call.id}`}>
                {getServiceFromMetadata(call.metadata)}
              </TableCell>
              <TableCell className="text-sm text-foreground" data-testid={`text-tag-${call.id}`}>
                {call.metadata?.['tag'] ?? call.metadata?.['intent'] ?? "—"}
              </TableCell>
              {showActions && (
                <TableCell>
                  <Link href={`/calls/${call.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                      data-testid={`button-view-${call.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

export default CallsTable;
