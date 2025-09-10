import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { CheckCircle2, AlertCircle, X, Settings, Phone, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  critical: boolean;
  icon: React.ReactNode;
  action?: string;
}

interface OnboardingChecklistProps {
  onDismiss: () => void;
}

export default function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const [tasks, setTasks] = useState<OnboardingTask[]>([
    {
      id: "company-profile",
      title: "Profil entreprise configuré",
      description: "Vérifier les informations Drain Fortin et certification CMMTQ",
      completed: false,
      critical: true,
      icon: <Settings className="h-4 w-4" />,
      action: "/settings"
    },
    {
      id: "paul-prompts",
      title: "Prompts de Paul configurés",
      description: "Messages d'accueil et réponses de Paul aux clients",
      completed: false,
      critical: true,
      icon: <Phone className="h-4 w-4" />,
      action: "/settings/prompts"
    },
    {
      id: "guillaume-constraints",
      title: "Contraintes Guillaume activées",
      description: "Règles de transfert et limitations business",
      completed: false,
      critical: true,
      icon: <Shield className="h-4 w-4" />,
      action: "/settings/constraints"
    },
    {
      id: "pricing-configured",
      title: "Grille tarifaire Québec",
      description: "Prix Rive-Sud, drain français, alésage, gainage",
      completed: false,
      critical: false,
      icon: <Settings className="h-4 w-4" />,
      action: "/settings/pricing"
    },
    {
      id: "test-call",
      title: "Premier test d'appel",
      description: "Tester Paul avec un scénario d'urgence P1",
      completed: false,
      critical: false,
      icon: <Phone className="h-4 w-4" />,
      action: "/test"
    }
  ]);

  useEffect(() => {
    checkTasksStatus();
  }, []);

  const checkTasksStatus = async () => {
    try {
      const profile = await (await fetch('/api/settings/company_profile')).json();
      const constraints = await (await fetch('/api/constraints')).json();
      const settings = await (await fetch('/api/settings')).json();

      setTasks(prev => prev.map(task => {
        switch (task.id) {
          case "company-profile":
            return { ...task, completed: !!(profile?.licenses?.rbq || String(profile?.tagline || '').includes('certifié')) };
          case "guillaume-constraints":
            return { ...task, completed: Number(constraints?.rules?.length || 0) > 0 };
          case "paul-prompts":
            return { ...task, completed: Array.isArray(settings) && settings.some((s: any) => String(s.key).includes('prompts')) };
          case "pricing-configured":
            return { ...task, completed: Array.isArray(settings) && settings.some((s: any) => s.key === 'pricing') };
          default:
            return task;
        }
      }));
    } catch (error) {
      logger.error('Erreur vérification onboarding:', error);
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const criticalPending = tasks.filter(t => !t.completed && t.critical).length;

  if (completedTasks === tasks.length) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Configuration initiale — Guillaume</CardTitle>
            {criticalPending > 0 && (
              <Badge variant="destructive" className="text-xs">{criticalPending} critiques</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Complétez ces étapes pour optimiser Paul. {completedTasks}/{tasks.length} terminées
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-background">
              <div className="flex items-center gap-3">
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="flex items-center gap-2">
                    {task.icon}
                    {task.critical && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </div>
                )}
                <div>
                  <h4 className={`font-medium ${task.completed ? 'text-green-700 dark:text-green-400' : ''}`}>{task.title}</h4>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
              {!task.completed && task.action && (
                <Button size="sm" variant="outline" asChild>
                  <a href={task.action} data-testid={`button-configure-${task.id}`}>Configurer</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

