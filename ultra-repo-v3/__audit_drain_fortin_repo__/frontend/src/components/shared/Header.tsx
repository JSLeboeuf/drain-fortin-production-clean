import { Bell, UserCircle, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { data: companyProfile } = useQuery({ queryKey: ["/api/settings/company_profile"] });

  return (
    <header className="bg-gradient-to-r from-background-solid via-background-solid to-primary/5 border-b border-border px-6 py-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">{title}</h1>
            </div>
            {companyProfile && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/30 text-sm font-medium px-3 py-1 shadow-sm">
                  <Shield className="h-4 w-4 mr-1" />
                  {(companyProfile as any)?.tagline || "Maître plombier certifié CMMTQ"}
                </Badge>
                {(companyProfile as any)?.licenses?.rbq && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary border-secondary/30 text-sm font-medium px-3 py-1 shadow-sm">
                    RBQ {(companyProfile as any).licenses.rbq}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              {subtitle && (
                <p className="text-base text-muted-foreground font-medium" data-testid="header-subtitle">{subtitle}</p>
              )}
              <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed quebec-accent pl-4 mt-2">
                Paul, assistant virtuel — appel enregistré. {(companyProfile as any)?.mission || ''}
              </p>
            </div>

            {(companyProfile as any)?.service_areas && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{(companyProfile as any)?.service_areas?.primary?.join(", ") || "Québec"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(companyProfile as any)?.technology_focus && (
            <div className="flex items-center gap-2">
              {(companyProfile as any).technology_focus.gps_equipment && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/20">GPS</Badge>
              )}
              {(companyProfile as any).technology_focus.eco_solutions && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950/20">Écologique</Badge>
              )}
              {(companyProfile as any).technology_focus.tv_inspection && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/20">Inspection TV</Badge>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-profile">
              <UserCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
