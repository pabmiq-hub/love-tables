import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertCircle, FileSpreadsheet, Users } from "lucide-react";
import { Participant } from "@/lib/excelParser";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExcelPreviewModalProps {
  participants: Participant[];
  errors: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const ExcelPreviewModal = ({ participants, errors, onConfirm, onCancel }: ExcelPreviewModalProps) => {
  const [selectedTab, setSelectedTab] = useState<"preview" | "errors">("preview");

  const getGenderBadge = (gender: string) => {
    switch (gender) {
      case "Mujer":
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 text-xs">Mujer</Badge>;
      case "Hombre":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Hombre</Badge>;
      case "No binario":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs">No binario</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{gender}</Badge>;
    }
  };

  const getPreferenceBadge = (preference: string) => {
    if (preference === "Amistad y ligue") {
      return <Badge className="bg-primary/20 text-primary text-xs">Amistad y ligue</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Solo amistad</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Vista previa del Excel</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {participants.length} participantes encontrados
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={selectedTab === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("preview")}
            >
              <Users className="w-4 h-4 mr-2" />
              Participantes ({participants.length})
            </Button>
            {errors.length > 0 && (
              <Button
                variant={selectedTab === "errors" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setSelectedTab("errors")}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Avisos ({errors.length})
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {selectedTab === "preview" ? (
              <div className="space-y-2">
                {participants.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No se encontraron participantes válidos</p>
                  </div>
                ) : (
                  participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {participant.ageRange || "Sin rango"} • Busca: {participant.preferredAgeRange || "Sin preferencia"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getGenderBadge(participant.gender)}
                        {getPreferenceBadge(participant.preference)}
                        {participant.datingPreference && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                            {participant.datingPreference.length > 20 
                              ? participant.datingPreference.substring(0, 20) + "..." 
                              : participant.datingPreference}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-3 pt-4 mt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              variant="hero" 
              className="flex-1" 
              onClick={onConfirm}
              disabled={participants.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar {participants.length} participantes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelPreviewModal;
