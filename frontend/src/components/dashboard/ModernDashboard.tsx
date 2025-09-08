/**
 * Modern Dashboard - Dashboard moderne avec animations et UX améliorée
 * Utilise les nouveaux composants et hooks personnalisés
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ModernDataTable, DataTableColumn, DataTableAction } from '@/components/ui/modern-data-table';
import { useModernNotification } from '@/components/ui/modern-toaster';
import { useAppStore } from '@/stores/useAppStore';
import { useIntersectionObserver } from '@/hooks/useAdvancedHooks';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  subtitle?: string;
  trend?: number[];
  loading?: boolean;
}

function ModernMetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: IconComponent, 
  subtitle,
  trend = [],
  loading = false 
}: MetricCardProps) {
  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true });

  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600', 
    neutral: 'text-muted-foreground'
  };

  const changeIcon = changeType === 'positive' ? ArrowUpRight : changeType === 'negative' ? ArrowDownRight : null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="premium-glow hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="skeleton-loader h-8 w-20" />
              <div className="skeleton-loader h-4 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <motion.span 
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {value}
                </motion.span>
                
                {change !== undefined && changeIcon && (
                  <div className={cn("flex items-center gap-1 text-sm", changeColor[changeType])}>
                    {React.createElement(changeIcon, { size: 16 })}
                    {Math.abs(change)}%
                  </div>
                )}
              </div>
              
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}

              {/* Mini trend chart */}
              {trend.length > 0 && (
                <div className="mt-3 h-2 flex items-end gap-0.5">
                  {trend.slice(-20).map((point, index) => (
                    <motion.div
                      key={index}
                      className="bg-primary/30 rounded-sm flex-1 min-w-[2px]"
                      style={{ height: `${(point / Math.max(...trend)) * 100}%` }}
                      initial={{ height: 0 }}
                      animate={{ height: `${(point / Math.max(...trend)) * 100}%` }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LiveActivityFeed() {
  const [activities] = useState([
    { id: 1, type: 'call', message: 'Nouvel appel reçu de +1-514-555-0123', time: '2 min', priority: 'high' },
    { id: 2, type: 'conversion', message: 'Lead converti en client', time: '15 min', priority: 'success' },
    { id: 3, type: 'alert', message: 'Seuil de conversion atteint', time: '1h', priority: 'warning' },
    { id: 4, type: 'system', message: 'Mise à jour système effectuée', time: '2h', priority: 'info' },
  ]);

  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'conversion': return CheckCircle2;
      case 'alert': return AlertTriangle;
      default: return Activity;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-amber-600 bg-amber-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <Card className="h-96 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activité en direct
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={isIntersecting ? { opacity: 1 } : { opacity: 0 }}
            className="space-y-1"
          >
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.type);
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg",
                    getPriorityColor(activity.priority)
                  )}>
                    <IconComponent size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Il y a {activity.time}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickStatsGrid() {
  const notify = useModernNotification();
  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true });

  const stats = [
    {
      title: "Appels aujourd'hui",
      value: "42",
      change: 12,
      changeType: 'positive' as const,
      icon: Phone,
      trend: [30, 35, 28, 42, 38, 45, 42]
    },
    {
      title: "Revenus générés",
      value: "$12,450",
      change: 8,
      changeType: 'positive' as const,
      icon: DollarSign,
      trend: [8000, 9500, 11200, 10800, 12450]
    },
    {
      title: "Taux de conversion",
      value: "68%",
      change: -3,
      changeType: 'negative' as const,
      icon: TrendingUp,
      trend: [65, 68, 71, 69, 68]
    },
    {
      title: "Clients actifs",
      value: "156",
      change: 5,
      changeType: 'positive' as const,
      icon: Users,
      trend: [140, 145, 150, 152, 156]
    }
  ];

  const handleTestNotification = () => {
    notify.success("Test de notification", "Système de notifications modernes activé!");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isIntersecting ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ModernMetricCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Insights */}
        <Card className="premium-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Efficacité des appels</span>
                <span className="text-sm text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Satisfaction client</span>
                <span className="text-sm text-muted-foreground">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>

            <Button 
              onClick={handleTestNotification}
              className="w-full mt-4"
              variant="outline"
            >
              Tester les notifications
            </Button>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card className="premium-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Tendances récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Durée moyenne appel</span>
                <Badge variant="secondary">4m 32s</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Temps de réponse</span>
                <Badge variant="secondary">1.2s</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Score qualité</span>
                <Badge variant="default">9.2/10</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Activity */}
        <LiveActivityFeed />
      </div>
    </motion.div>
  );
}

export function ModernDashboard() {
  const { user } = useAppStore();
  
  // Données d'exemple pour la table
  const callsData = [
    { id: 1, phone: '+1-514-555-0123', duration: '4:32', status: 'Terminé', type: 'Entrant', date: '2024-01-08 14:30' },
    { id: 2, phone: '+1-514-555-0456', duration: '2:15', status: 'Manqué', type: 'Entrant', date: '2024-01-08 14:25' },
    { id: 3, phone: '+1-514-555-0789', duration: '6:45', status: 'Terminé', type: 'Sortant', date: '2024-01-08 14:20' },
  ];

  const callColumns: DataTableColumn[] = [
    {
      id: 'phone',
      header: 'Numéro',
      accessorKey: 'phone',
      sortable: true,
    },
    {
      id: 'duration', 
      header: 'Durée',
      accessorKey: 'duration',
      sortable: true,
    },
    {
      id: 'status',
      header: 'Statut',
      accessorKey: 'status',
      cell: ({ value }) => (
        <Badge 
          variant={value === 'Terminé' ? 'default' : value === 'Manqué' ? 'destructive' : 'secondary'}
        >
          {value}
        </Badge>
      )
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      sortable: true,
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'date',
      sortable: true,
    },
  ];

  const callActions: DataTableAction[] = [
    {
      id: 'view',
      label: 'Voir détails',
      icon: Phone,
      onClick: (row) => console.log('View call:', row),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user?.name || 'Guillaume'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de votre activité système Paul aujourd'hui.
        </p>
      </motion.div>

      {/* Quick Stats */}
      <QuickStatsGrid />

      {/* Recent Calls Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Appels récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ModernDataTable
              data={callsData}
              columns={callColumns}
              actions={callActions}
              searchable
              pagination={false}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}