import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AGE_RANGES,
  GENDERS,
  PREFERENCES,
  DATING_PREFERENCES,
} from "@/lib/excelParser";

// Default professional options
const DEFAULT_SECTORS = [
  "Tecnología", "Finanzas", "Salud", "Educación", "Retail", 
  "Industria", "Servicios", "Consultoría", "Marketing", "Legal"
];

const DEFAULT_COMPANY_SIZES = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
];

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
  // Professional fields
  company_name?: string | null;
  entity_type?: "client" | "provider" | null;
  sector?: string | null;
  company_size?: string | null;
  needs?: string[] | null;
  solutions?: string[] | null;
  business_interests?: string[] | null;
}

export interface EventCustomPreferences {
  ageRanges?: string[];
  genders?: string[];
  preferences?: string[];
  datingPreferences?: string[];
}

export interface ProfessionalConfig {
  sectors?: string[];
  companySizes?: string[];
  rotationType?: "client_fixed" | "provider_fixed";
}

interface EditParticipantModalProps {
  participant: ParticipantData;
  onClose: () => void;
  onSave: (updated: ParticipantData) => void;
  customPreferences?: EventCustomPreferences;
  isProfessional?: boolean;
  professionalConfig?: ProfessionalConfig;
}

const EditParticipantModal = ({ 
  participant, 
  onClose, 
  onSave, 
  customPreferences,
  isProfessional = false,
  professionalConfig,
}: EditParticipantModalProps) => {
  // Use custom preferences if provided, otherwise use defaults
  const ageRanges = customPreferences?.ageRanges || [...AGE_RANGES];
  const genders = customPreferences?.genders || [...GENDERS];
  const preferences = customPreferences?.preferences || [...PREFERENCES];
  const datingPreferences = customPreferences?.datingPreferences || [...DATING_PREFERENCES];
  const preferredAgeRanges = [...ageRanges, "Cualquier rango"];
  
  // Professional options
  const sectors = professionalConfig?.sectors || DEFAULT_SECTORS;
  const companySizes = professionalConfig?.companySizes || DEFAULT_COMPANY_SIZES;
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Social fields
  const [formData, setFormData] = useState({
    name: participant.name,
    email: participant.email || "",
    phone: participant.phone || "",
    age_range: participant.age_range || "",
    preferred_age_range: participant.preferred_age_range || "",
    preference: participant.preference || "",
    dating_preference: participant.dating_preference || "",
    gender: participant.gender || "",
  });

  // Professional fields
  const [professionalData, setProfessionalData] = useState({
    company_name: participant.company_name || "",
    entity_type: participant.entity_type || "",
    sector: participant.sector || "",
    company_size: participant.company_size || "",
    needs: (participant.needs || []).join(", "),
    solutions: (participant.solutions || []).join(", "),
    business_interests: (participant.business_interests || []).join(", "),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const updateData: Record<string, unknown> = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
    };

    if (isProfessional) {
      // Add professional fields
      updateData.company_name = professionalData.company_name.trim() || null;
      updateData.entity_type = professionalData.entity_type || null;
      updateData.sector = professionalData.sector || null;
      updateData.company_size = professionalData.company_size || null;
      updateData.needs = professionalData.needs
        ? professionalData.needs.split(",").map(s => s.trim()).filter(Boolean)
        : null;
      updateData.solutions = professionalData.solutions
        ? professionalData.solutions.split(",").map(s => s.trim()).filter(Boolean)
        : null;
      updateData.business_interests = professionalData.business_interests
        ? professionalData.business_interests.split(",").map(s => s.trim()).filter(Boolean)
        : null;
    } else {
      // Add social fields
      updateData.age_range = formData.age_range || null;
      updateData.preferred_age_range = formData.preferred_age_range || null;
      updateData.preference = formData.preference || null;
      updateData.dating_preference = formData.dating_preference || null;
      updateData.gender = formData.gender || null;
    }

    const { error } = await supabase
      .from("participants")
      .update(updateData)
      .eq("id", participant.id);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el participante",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Participante actualizado",
      description: `${formData.name} ha sido actualizado correctamente`,
    });

    onSave({
      ...participant,
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      ...(isProfessional ? {
        company_name: professionalData.company_name.trim() || null,
        entity_type: (professionalData.entity_type as "client" | "provider") || null,
        sector: professionalData.sector || null,
        company_size: professionalData.company_size || null,
        needs: professionalData.needs
          ? professionalData.needs.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        solutions: professionalData.solutions
          ? professionalData.solutions.split(",").map(s => s.trim()).filter(Boolean)
          : null,
        business_interests: professionalData.business_interests
          ? professionalData.business_interests.split(",").map(s => s.trim()).filter(Boolean)
          : null,
      } : {
        age_range: formData.age_range || null,
        preferred_age_range: formData.preferred_age_range || null,
        preference: formData.preference || null,
        dating_preference: formData.dating_preference || null,
        gender: formData.gender || null,
      }),
    });
  };

  const renderSocialFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="gender">Género</Label>
        <Select
          value={formData.gender}
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar género" />
          </SelectTrigger>
          <SelectContent>
            {genders.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="age_range">Rango de edad</Label>
        <Select
          value={formData.age_range}
          onValueChange={(value) => setFormData({ ...formData, age_range: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rango" />
          </SelectTrigger>
          <SelectContent>
            {ageRanges.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferred_age_range">Rango de edad preferido</Label>
        <Select
          value={formData.preferred_age_range}
          onValueChange={(value) => setFormData({ ...formData, preferred_age_range: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar preferencia" />
          </SelectTrigger>
          <SelectContent>
            {preferredAgeRanges.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preference">Tipo de conexión</Label>
        <Select
          value={formData.preference}
          onValueChange={(value) => setFormData({ ...formData, preference: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {preferences.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dating_preference">Preferencia de ligue</Label>
        <Select
          value={formData.dating_preference}
          onValueChange={(value) => setFormData({ ...formData, dating_preference: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar preferencia" />
          </SelectTrigger>
          <SelectContent>
            {datingPreferences.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  const renderProfessionalFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="company_name">Nombre de empresa *</Label>
        <Input
          id="company_name"
          value={professionalData.company_name}
          onChange={(e) => setProfessionalData({ ...professionalData, company_name: e.target.value })}
          placeholder="Empresa S.L."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entity_type">Tipo de entidad *</Label>
        <Select
          value={professionalData.entity_type}
          onValueChange={(value) => setProfessionalData({ ...professionalData, entity_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="client">Cliente</SelectItem>
            <SelectItem value="provider">Proveedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sector">Sector</Label>
        <Select
          value={professionalData.sector}
          onValueChange={(value) => setProfessionalData({ ...professionalData, sector: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar sector" />
          </SelectTrigger>
          <SelectContent>
            {sectors.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_size">Tamaño de empresa</Label>
        <Select
          value={professionalData.company_size}
          onValueChange={(value) => setProfessionalData({ ...professionalData, company_size: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tamaño" />
          </SelectTrigger>
          <SelectContent>
            {companySizes.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {professionalData.entity_type === "client" && (
        <div className="space-y-2">
          <Label htmlFor="needs">Necesidades (separadas por coma)</Label>
          <Textarea
            id="needs"
            value={professionalData.needs}
            onChange={(e) => setProfessionalData({ ...professionalData, needs: e.target.value })}
            placeholder="Ej: Marketing digital, Desarrollo web, Consultoría"
            rows={2}
          />
        </div>
      )}

      {professionalData.entity_type === "provider" && (
        <div className="space-y-2">
          <Label htmlFor="solutions">Soluciones que ofrece (separadas por coma)</Label>
          <Textarea
            id="solutions"
            value={professionalData.solutions}
            onChange={(e) => setProfessionalData({ ...professionalData, solutions: e.target.value })}
            placeholder="Ej: SEO, Diseño gráfico, Asesoría legal"
            rows={2}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="business_interests">Intereses de negocio (separados por coma)</Label>
        <Textarea
          id="business_interests"
          value={professionalData.business_interests}
          onChange={(e) => setProfessionalData({ ...professionalData, business_interests: e.target.value })}
          placeholder="Ej: Expansión, Internacionalización, Networking"
          rows={2}
        />
      </div>
    </>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isProfessional ? "Editar participante B2B" : "Editar participante"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+34 600 000 000"
            />
          </div>

          {isProfessional ? renderProfessionalFields() : renderSocialFields()}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditParticipantModal;
