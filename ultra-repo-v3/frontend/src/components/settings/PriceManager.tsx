import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Trash2 } from "lucide-react";

interface PriceManagerProps {
  pricing: {
    base: Record<string, number>;
    surcharges: Record<string, number>;
    discounts: Record<string, number>;
  };
  onSave: (pricing: any) => void;
}

export default function PriceManager({ pricing, onSave }: PriceManagerProps) {
  const [currentPricing, setCurrentPricing] = useState(pricing);

  const handleSave = () => {
    onSave(currentPricing);
  };

  const updatePrice = (category: string, service: string, value: number) => {
    setCurrentPricing(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [service]: value
      }
    }));
  };

  const addService = (category: string, service: string, price: number) => {
    updatePrice(category, service, price);
  };

  const removeService = (category: string, service: string) => {
    setCurrentPricing(prev => {
      const newCategory = { ...prev[category as keyof typeof prev] };
      delete newCategory[service];
      return {
        ...prev,
        [category]: newCategory
      };
    });
  };

  const renderPriceTable = (category: string, title: string, items: Record<string, number>) => (
    <div className="space-y-4">
      <h4 className="font-medium">{title}</h4>
      <div className="space-y-2">
        {Object.entries(items).map(([service, price]) => (
          <div key={service} className="flex items-center space-x-2">
            <Label className="flex-1 capitalize">{service}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => updatePrice(category, service, parseFloat(e.target.value) || 0)}
              className="w-24"
              data-testid={`input-price-${category}-${service}`}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeService(category, service)}
              data-testid={`button-remove-${category}-${service}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Gestionnaire de prix
          <Button
            size="sm"
            onClick={handleSave}
            data-testid="button-save-pricing"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="base">
          <TabsList>
            <TabsTrigger value="base">Prix de base</TabsTrigger>
            <TabsTrigger value="surcharges">Surcharges</TabsTrigger>
            <TabsTrigger value="discounts">Remises</TabsTrigger>
          </TabsList>

          <TabsContent value="base">
            {renderPriceTable("base", "Services de base", currentPricing.base)}
          </TabsContent>

          <TabsContent value="surcharges">
            {renderPriceTable("surcharges", "Surcharges", currentPricing.surcharges)}
          </TabsContent>

          <TabsContent value="discounts">
            {renderPriceTable("discounts", "Remises (%)", currentPricing.discounts)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
