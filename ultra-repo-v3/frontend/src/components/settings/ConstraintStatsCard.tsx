import { Card, CardContent } from '@/components/ui/card';
import { Shield, CheckCircle, XCircle, Target } from 'lucide-react';

interface ConstraintStatsCardProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    activationRate: number;
  };
}

export default function ConstraintStatsCard({ stats }: ConstraintStatsCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Contraintes</p>
              <p className="text-2xl font-bold text-drain-orange-600">{stats.total}</p>
            </div>
            <Shield className="h-8 w-8 text-drain-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Actives</p>
              <p className="text-2xl font-bold text-drain-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-drain-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactives</p>
              <p className="text-2xl font-bold text-drain-steel-600">{stats.inactive}</p>
            </div>
            <XCircle className="h-8 w-8 text-drain-steel-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taux d'Activation</p>
              <p className="text-2xl font-bold text-drain-orange-600">{stats.activationRate}%</p>
            </div>
            <Target className="h-8 w-8 text-drain-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}