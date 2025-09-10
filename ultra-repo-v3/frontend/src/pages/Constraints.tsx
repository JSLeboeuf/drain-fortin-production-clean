import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Settings, Shield, Clock, Users, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Constraints() {
  const [settings, setSettings] = React.useState({
    emergencyResponseTime: 30,
    standardResponseTime: 120,
    autoAssignTechnicians: true,
    requireManagerApproval: false,
    maxCallsPerTechnician: 10,
    priorityOverride: false,
    serviceRadius: 50,
    afterHoursEnabled: true,
  });

  const handleSave = () => {
    toast.success('Contraintes sauvegardées avec succès');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contraintes Opérationnelles</h1>
          <p className="text-muted-foreground mt-2">
            Configurez les règles et contraintes pour l'opération du système
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Shield className="h-4 w-4" />
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="response" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="response">Temps de Réponse</TabsTrigger>
          <TabsTrigger value="assignment">Assignation</TabsTrigger>
          <TabsTrigger value="capacity">Capacité</TabsTrigger>
          <TabsTrigger value="geographic">Zone de Service</TabsTrigger>
        </TabsList>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Temps de Réponse
              </CardTitle>
              <CardDescription>
                Définissez les temps de réponse cibles par priorité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency">Urgence P1 (minutes)</Label>
                  <Input
                    id="emergency"
                    type="number"
                    value={settings.emergencyResponseTime}
                    onChange={(e) => setSettings({ ...settings, emergencyResponseTime: +e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard">Standard P2-P4 (minutes)</Label>
                  <Input
                    id="standard"
                    type="number"
                    value={settings.standardResponseTime}
                    onChange={(e) => setSettings({ ...settings, standardResponseTime: +e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="after-hours"
                  checked={settings.afterHoursEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, afterHoursEnabled: checked })}
                />
                <Label htmlFor="after-hours">Service après heures actif</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Règles d'Assignation
              </CardTitle>
              <CardDescription>
                Configurez l'assignation automatique des techniciens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-assign"
                  checked={settings.autoAssignTechnicians}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoAssignTechnicians: checked })}
                />
                <Label htmlFor="auto-assign">Assignation automatique</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="manager-approval"
                  checked={settings.requireManagerApproval}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireManagerApproval: checked })}
                />
                <Label htmlFor="manager-approval">Approbation requise pour P1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="priority-override"
                  checked={settings.priorityOverride}
                  onCheckedChange={(checked) => setSettings({ ...settings, priorityOverride: checked })}
                />
                <Label htmlFor="priority-override">Permettre changement de priorité</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Limites de Capacité
              </CardTitle>
              <CardDescription>
                Définissez les limites opérationnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max-calls">Maximum d'appels par technicien</Label>
                <Input
                  id="max-calls"
                  type="number"
                  value={settings.maxCallsPerTechnician}
                  onChange={(e) => setSettings({ ...settings, maxCallsPerTechnician: +e.target.value })}
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Limite actuelle: {settings.maxCallsPerTechnician} appels simultanés par technicien
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zone de Service
              </CardTitle>
              <CardDescription>
                Configurez les limites géographiques du service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="radius">Rayon de service (km)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={settings.serviceRadius}
                  onChange={(e) => setSettings({ ...settings, serviceRadius: +e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regions">Régions prioritaires</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="regions">
                    <SelectValue placeholder="Sélectionner les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    <SelectItem value="montreal">Montréal</SelectItem>
                    <SelectItem value="rive-sud">Rive-Sud</SelectItem>
                    <SelectItem value="rive-nord">Rive-Nord</SelectItem>
                    <SelectItem value="laval">Laval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}