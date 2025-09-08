import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Phone, Clock, User, MapPin, PlayCircle, Save, FileText } from "lucide-react";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import AudioPlayer from "@/components/calls/AudioPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCall } from "@/hooks/useCalls";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function CallDetail() {
  const { id } = useParams();
  const { data: call, isLoading } = useCall(id!);
  const [notes, setNotes] = useState("");
  
  useEffect(() => {
    if (call?.guillaumeNotes) {
      setNotes(call.guillaumeNotes);
    }
  }, [call]);
  
  // Mutation pour sauvegarder les notes
  const saveNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await fetch(`/api/calls/${id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: newNotes })
      });
      if (!response.ok) throw new Error('Failed to save notes');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes sauvegardes",
        description: "Vos notes ont t enregistres avec succes."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/calls/${id}`] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les notes.",
        variant: "destructive"
      });
    }
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-red-600 text-white";
      case "P2":
        return "bg-orange-600 text-white";
      case "P3":
        return "bg-yellow-600 text-white";
      case "P4":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
      case "transferred":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400";
      case "active":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main id="main" role="main" className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-background">
        <Sidebar />
        <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
          <Header title="Appel introuvable" subtitle="L'appel demandé n'existe pas" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Appel introuvable</h2>
              <p className="text-muted-foreground">L'appel avec l'ID {id} n'existe pas.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-background">
      <Sidebar />
      <main id="main" role="main" className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={`Appel ${call.phoneNumber}`} 
          subtitle={formatDateTime(call.startTime)} 
        />

        <div className="flex-1 overflow-y-auto p-6">
          {/* Call Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Informations de l'appel</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Numéro:</span>
                  <span className="font-mono" data-testid="text-call-phone">{call.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durée:</span>
                  <span data-testid="text-call-duration">{formatDuration(call.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priorité:</span>
                  <Badge className={cn(getPriorityColor(call.priority))} data-testid="badge-call-priority">
                    {call.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={cn(getStatusColor(call.status))} data-testid="badge-call-status">
                    {call.status}
                  </Badge>
                </div>
                {call.serviceType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span data-testid="text-call-service">{call.serviceType}</span>
                  </div>
                )}
                {call.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adresse:</span>
                    <span data-testid="text-call-address">{call.customerAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Début</div>
                  <div className="font-medium" data-testid="text-call-start">
                    {formatDateTime(call.startTime)}
                  </div>
                </div>
                {call.endTime && (
                  <div>
                    <div className="text-sm text-muted-foreground">Fin</div>
                    <div className="font-medium" data-testid="text-call-end">
                      {formatDateTime(call.endTime)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Métadonnées</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {call.metadata && Object.keys(call.metadata).length > 0 ? (
                  Object.entries(call.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span data-testid={`text-metadata-${key}`}>{String(value)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm">Aucune métadonnée disponible</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enregistrement audio */}
          {call.recordingUrl && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PlayCircle className="h-5 w-5" />
                  <span>Enregistrement de l'appel</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer audioUrl={call.recordingUrl} />
              </CardContent>
            </Card>
          )}
          
          {/* Probleme description */}
          {call.problemDescription && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Description du probleme</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4" data-testid="text-problem-description">
                  {call.problemDescription}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Transcript */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              {call.transcript ? (
                <div className="prose max-w-none">
                  <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed" data-testid="text-call-transcript">
                    {call.transcript}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune transcription disponible
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Notes de Guillaume */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Notes de Guillaume</span>
                <Button
                  size="sm"
                  onClick={() => saveNotesMutation.mutate(notes)}
                  disabled={saveNotesMutation.isPending}
                  variant="secondary"
                  data-testid="button-save-notes"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveNotesMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes sur cet appel, actions prises, suivi requis..."
                className="min-h-[120px]"
                data-testid="input-guillaume-notes"
              />
              {call.guillaumeNotes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Derniere modification: {new Date().toLocaleString('fr-CA')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
