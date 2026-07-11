import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Phone, Calendar, Heart, Users, Table2, Edit, Building2, Briefcase, Target, Lightbulb, Copy, Key, Cake, Languages, RotateCcw, Megaphone, Sparkles, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantData {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  age_range: string | null;
  preferred_age_range: string | null;
  preference: string | null;
  dating_preference: string | null;
  gender: string | null;
  phone: string | null;
  checked_in: boolean;
  verification_code: string | null;
  selection_submitted_at?: string | null;
  // Professional fields
  company_name?: string | null;
  entity_type?: "client" | "provider" | null;
  sector?: string | null;
  company_size?: string | null;
  needs?: string[] | null;
  solutions?: string[] | null;
  business_interests?: string[] | null;
  // Extended registration fields
  birth_date?: string | null;
  spoken_languages?: string[] | null;
  is_returning_participant?: boolean | null;
  marketing_consent?: boolean | null;
  payment_status?: string | null;
  paid_at?: string | null;
  wrapped_profile_id?: string | null;
  created_at?: string | null;
}

interface TableData {
  round: number;
  tables: { id: string; name: string }[][];
}

interface Selection {
  selector_id: string;
  selected_id: string;
  selection_type: string | null;
}

interface ParticipantDetailModalProps {
  participant: ParticipantData;
  tables: TableData[];
  selections: Selection[];
  participants: ParticipantData[];
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
  isProfessional?: boolean;
  eventStatus?: string;
  onAssignToTables?: (participant: ParticipantData) => void;
}

const ParticipantDetailModal = ({
  participant,
  tables,
  selections,
  participants,
  onClose,
  onEdit,
  canEdit,
  isProfessional = false,
  eventStatus,
  onAssignToTables,
}: ParticipantDetailModalProps) => {
  const { toast } = useToast();
  const [wrappedProfile, setWrappedProfile] = useState<{ hobbies_ranked: string[] | null; answers: Record<string, unknown> | null } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!participant.wrapped_profile_id) { setWrappedProfile(null); return; }
      const { data } = await supabase
        .from("wrapped_profiles")
        .select("hobbies_ranked, answers")
        .eq("id", participant.wrapped_profile_id)
        .maybeSingle();
      if (!cancel) setWrappedProfile(data as any);
    })();
    return () => { cancel = true; };
  }, [participant.wrapped_profile_id]);

  const formatBirthDate = (d?: string | null) => {
    if (!d) return null;
    try {
      const date = new Date(`${d}T12:00:00`);
      return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
    } catch { return d; }
  };

  // Find tables where this participant sat
  const getParticipantTables = () => {
    const participantTables: { round: number; tableNumber: number; tablemates: { id: string; name: string }[] }[] = [];
    
    tables.forEach(roundData => {
      roundData.tables.forEach((table, tableIndex) => {
        const isAtTable = table.some(p => p.id === participant.id);
        if (isAtTable) {
          const tablemates = table.filter(p => p.id !== participant.id);
          participantTables.push({ round: roundData.round, tableNumber: tableIndex + 1, tablemates });
        }
      });
    });
    
    return participantTables;
  };

  // Get selections made by this participant
  const getSelectionsBy = () => {
    return selections
      .filter(s => s.selector_id === participant.id)
      .map(s => {
        const selected = participants.find(p => p.id === s.selected_id);
        return { ...s, selectedName: selected?.name || "Desconocido" };
      });
  };

  // Get selections where this participant was selected
  const getSelectionsOf = () => {
    return selections
      .filter(s => s.selected_id === participant.id)
      .map(s => {
        const selector = participants.find(p => p.id === s.selector_id);
        return { ...s, selectorName: selector?.name || "Desconocido" };
      });
  };

  const participantTables = getParticipantTables();
  const selectionsBy = getSelectionsBy();
  const selectionsOf = getSelectionsOf();

  const getGenderBadge = (gender: string | null) => {
    if (!gender) return null;
    switch (gender) {
      case "Mujer":
        return <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Mujer</Badge>;
      case "Hombre":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Hombre</Badge>;
      default:
        return <Badge variant="secondary">{gender}</Badge>;
    }
  };

  const getEntityTypeBadge = (entityType: string | null | undefined) => {
    if (!entityType) return null;
    switch (entityType) {
      case "client":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Cliente</Badge>;
      case "provider":
        return <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Proveedor</Badge>;
      default:
        return <Badge variant="secondary">{entityType}</Badge>;
    }
  };

  const getSelectionTypeBadge = (type: string | null) => {
    if (isProfessional) {
      return <Badge className="bg-emerald-500 text-white"><Briefcase className="w-3 h-3 mr-1" />Conexión</Badge>;
    }
    switch (type) {
      case "dating":
        return <Badge className="bg-pink-500 text-white"><Heart className="w-3 h-3 mr-1" />Ligue</Badge>;
      case "both":
        return (
          <div className="flex gap-1">
            <Badge className="bg-blue-500 text-white"><Users className="w-3 h-3 mr-1" />Amistad</Badge>
            <Badge className="bg-pink-500 text-white"><Heart className="w-3 h-3 mr-1" />Ligue</Badge>
          </div>
        );
      default:
        return <Badge className="bg-blue-500 text-white"><Users className="w-3 h-3 mr-1" />Amistad</Badge>;
    }
  };

  const renderSocialDetails = () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <User className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Género</p>
          <div>{getGenderBadge(participant.gender) || "No especificado"}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Rango de edad</p>
          <p className="font-medium">{participant.age_range || "No especificado"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Busca rango</p>
          <p className="font-medium">{participant.preferred_age_range || "Sin preferencia"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Users className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Tipo de conexión</p>
          <p className="font-medium">{participant.preference || "No especificado"}</p>
        </div>
      </div>

      {participant.dating_preference && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Heart className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Preferencia de ligue</p>
            <p className="font-medium">{participant.dating_preference}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfessionalDetails = () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Building2 className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Empresa</p>
          <p className="font-medium">{participant.company_name || "No especificado"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Briefcase className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Tipo de entidad</p>
          <div>{getEntityTypeBadge(participant.entity_type) || "No especificado"}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Briefcase className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Sector</p>
          <p className="font-medium">{participant.sector || "No especificado"}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Building2 className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm text-muted-foreground">Tamaño empresa</p>
          <p className="font-medium">{participant.company_size || "No especificado"}</p>
        </div>
      </div>

      {participant.entity_type === "client" && participant.needs && participant.needs.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Target className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Necesidades</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {participant.needs.map((need, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{need}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {participant.entity_type === "provider" && participant.solutions && participant.solutions.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Lightbulb className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Soluciones</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {participant.solutions.map((solution, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{solution}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {participant.business_interests && participant.business_interests.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">Intereses de negocio</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {participant.business_interests.map((interest, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{interest}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                participant.checked_in 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gradient-primary text-primary-foreground"
              }`}>
                {participant.checked_in ? "✓" : participant.name.charAt(0)}
              </div>
              <div>
                <span className="text-xl">{participant.name}</span>
                {participant.checked_in && (
                  <Badge variant="outline" className="ml-2 text-xs">Check-in ✅</Badge>
                )}
                {isProfessional && participant.company_name && (
                  <p className="text-sm text-muted-foreground">{participant.company_name}</p>
                )}
              </div>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              <User className="w-4 h-4 mr-1" />
              Detalles
            </TabsTrigger>
            <TabsTrigger value="tables" className="flex-1">
              <Table2 className="w-4 h-4 mr-1" />
              {isProfessional ? "Reuniones" : "Mesas"}
            </TabsTrigger>
            <TabsTrigger value="selections" className="flex-1">
              {isProfessional ? <Briefcase className="w-4 h-4 mr-1" /> : <Heart className="w-4 h-4 mr-1" />}
              {isProfessional ? "Conexiones" : "Selecciones"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {isProfessional ? renderProfessionalDetails() : renderSocialDetails()}
            
            {/* Verification Code */}
            {participant.verification_code && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">Código de acceso</p>
                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Key className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Código de verificación</p>
                    <p className="font-mono text-lg font-bold tracking-widest text-primary">{participant.verification_code}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(participant.verification_code!);
                      toast({ title: "Copiado", description: "Código copiado al portapapeles" });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Contact info - shown for both types */}
            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-medium text-muted-foreground mb-2">Contacto</p>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{participant.email || "No registrado"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{participant.phone || "No registrado"}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tables" className="mt-4 space-y-4">
            {participantTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Table2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{isProfessional ? "No hay reuniones asignadas" : "No hay mesas asignadas"}</p>
                {eventStatus === "active" && onAssignToTables && (
                  <Button
                    className="mt-3"
                    onClick={() => onAssignToTables(participant)}
                  >
                    <Table2 className="w-4 h-4 mr-1" />
                    Asignar a mesas
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {participantTables.map(({ round, tableNumber, tablemates }) => (
                  <div key={round} className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-2">Ronda {round} — Mesa {tableNumber}</p>
                    <div className="flex flex-wrap gap-2">
                      {tablemates.map(mate => (
                        <Badge key={mate.id} variant="secondary">
                          {mate.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="selections" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                  {isProfessional ? "Conectó con" : "Seleccionó a"} ({selectionsBy.length})
                </h4>
                {selectionsBy.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {isProfessional ? "No hizo conexiones" : "No hizo selecciones"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectionsBy.map(s => (
                      <div key={s.selected_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span>{s.selectedName}</span>
                        {getSelectionTypeBadge(s.selection_type)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">
                  {isProfessional ? "Le conectaron" : "Le seleccionaron"} ({selectionsOf.length})
                </h4>
                {selectionsOf.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {isProfessional ? "Nadie le conectó" : "Nadie le seleccionó"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectionsOf.map(s => (
                      <div key={s.selector_id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span>{s.selectorName}</span>
                        {getSelectionTypeBadge(s.selection_type)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {participant.selection_submitted_at && (
                <p className="text-xs text-muted-foreground text-center">
                  Enviado: {new Date(participant.selection_submitted_at).toLocaleString("es-ES")}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantDetailModal;
