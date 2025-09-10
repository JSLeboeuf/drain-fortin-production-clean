import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Search, Filter, Download, Inbox } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import CallsTable from "@/components/dashboard/CallsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getCalls } from "@/lib/services";
import { CallFilters } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Calls() {
  const [filters, setFilters] = useState<CallFilters>({});
  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: getCalls,
    staleTime: 60_000,
  });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<"date"|"duration"|"status">("date");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const updateFilter = (key: keyof CallFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportCalls = async () => {
    try {
      // Check if we have data to export
      if (!calls || calls.length === 0) {
        toast({
          title: "Aucune donnée à exporter",
          description: "Il n'y a aucun appel à exporter pour le moment.",
          variant: "destructive"
        });
        return;
      }

      logger.info("Starting CSV export...");

      // Prepare CSV data with proper headers
      const csvHeaders = [
        "ID",
        "Date",
        "Durée (s)",
        "De",
        "Statut",
        "Priorité",
        "Service",
        "Coût ($)",
        "Notes"
      ];

      // Convert calls data to CSV rows
      const csvRows = calls.map(call => {
        const date = call.startTime ? new Date(call.startTime).toLocaleString('fr-CA') : 'N/A';
        const duration = call.duration || 0;
        const from = call.phoneNumber || call.customer?.phone || 'Inconnu';
        const status = call.status || 'inconnu';
        const priority = call.metadata?.priority || call.priority || 'P4';
        const service = call.metadata?.service || call.metadata?.scenario || 'N/A';
        const cost = call.cost || call.metadata?.cost || 0;
        const notes = call.summary || call.metadata?.notes || '';

        // Escape CSV values (handle commas, quotes, newlines)
        const escapeCSV = (value: any) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        return [
          escapeCSV(call.id),
          escapeCSV(date),
          escapeCSV(duration),
          escapeCSV(from),
          escapeCSV(status),
          escapeCSV(priority),
          escapeCSV(service),
          escapeCSV(cost),
          escapeCSV(notes)
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calls_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: `${calls.length} appels exportés vers CSV avec succès.`,
        variant: "default"
      });

      logger.info(`CSV export completed: ${calls.length} calls exported`);

    } catch (error) {
      logger.error("CSV export failed", error);
      
      toast({
        title: "Erreur d'export",
        description: "Une erreur s'est produite lors de l'export. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestion des appels" 
          subtitle="Liste complète et filtrage des appels" 
        />

        <div className="flex-1 overflow-y-auto p-6" data-panel>
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par numéro..."
                    aria-label="Rechercher un appel"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-calls"
                  />
                </div>

                <Select value={filters.priority || ""} onValueChange={(value) => updateFilter("priority", value)}>
                  <SelectTrigger data-testid="select-priority-filter">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1 - Urgence</SelectItem>
                    <SelectItem value="P2">P2 - Important</SelectItem>
                    <SelectItem value="P3">P3 - Normal</SelectItem>
                    <SelectItem value="P4">P4 - Faible</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status || ""} onValueChange={(value) => updateFilter("status", value)}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="transferred">Transféré</SelectItem>
                    <SelectItem value="failed">Échec</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                    <Filter className="h-4 w-4 mr-2" />
                    Effacer
                  </Button>
                  <Button variant="outline" onClick={exportCalls} data-testid="button-export-calls">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls tri/pagination */}
          <div className="sticky top-0 z-10 -mt-6 pt-6 pb-2 bg-gray-50/80 dark:bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/60 dark:supports-[backdrop-filter]:bg-background/60 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-muted-foreground">Trier par</label>
              <select className="border rounded px-2 py-1 text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} aria-label="Trier les appels">
                <option value="date">Date</option>
                <option value="duration">Durée</option>
                <option value="status">Statut</option>
              </select>
              <select className="border rounded px-2 py-1 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} aria-label="Sens du tri">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <div className="ml-3 flex items-center gap-2">
                <label className="text-muted-foreground">Par page</label>
                <select className="border rounded px-2 py-1 text-sm" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Taille de page">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-muted-foreground" aria-live="polite">Page {page}</div>
            <div className="h-px bg-border absolute left-0 right-0 bottom-0"></div>
          </div>

          {/* Calls Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Appels ({calls?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4"><TableSkeleton rows={8} /></div>
              ) : calls ? (
                <>
                  {(() => {
                    const filtered = calls.filter(c =>
                      debouncedSearch ? (c.phoneNumber || "").toLowerCase().includes(debouncedSearch.toLowerCase()) : true
                    );
                    const valueOf = (c:any, key:string) => {
                      if (key === "date") return new Date(c.startTime).getTime();
                      if (key === "duration") return c.duration;
                      if (key === "status") return String(c.status);
                      if (key === "service") return String(c.metadata?.service || c.metadata?.scenario || "");
                      if (key === "tag") return String(c.metadata?.tag || c.metadata?.intent || "");
                      return 0;
                    };
                    const sorted = filtered.sort((a, b) => {
                      const av = valueOf(a, sortKey);
                      const bv = valueOf(b, sortKey);
                      const cmp = typeof av === 'number' && typeof bv === 'number' ? (av - bv) : String(av).localeCompare(String(bv));
                      return cmp * (sortDir === "asc" ? 1 : -1);
                    });
                    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
                    const clampedPage = Math.min(page, totalPages);
                    if (clampedPage !== page) setPage(clampedPage);
                    const slice = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
                    return (
                      <>
                        <CallsTable calls={slice} sortKey={sortKey} sortDir={sortDir} onSortChange={(key)=>{
                          setSortDir(d => sortKey===key ? (d==='asc'?'desc':'asc') : 'desc');
                          setSortKey(key as any);
                        }} />
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-xs text-muted-foreground">{sorted.length} appels</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={clampedPage<=1} onClick={() => setPage(p=>Math.max(1,p-1))}>Précédent</Button>
                            <span className="text-xs">Page {clampedPage} / {totalPages}</span>
                            <Button variant="outline" size="sm" disabled={clampedPage>=totalPages} onClick={() => setPage(p=>Math.min(totalPages,p+1))}>Suivant</Button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
                  <div className="text-sm text-muted-foreground mb-4">
                    Aucun appel pour l’instant. Revenez bientôt — on peaufine.
                  </div>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">Retour au tableau de bord</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
