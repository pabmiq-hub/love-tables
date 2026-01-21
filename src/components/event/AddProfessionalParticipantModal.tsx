import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Building2, User, Briefcase } from "lucide-react";
import { 
  DEFAULT_SECTORS, 
  DEFAULT_COMPANY_SIZES, 
  DEFAULT_NEEDS, 
  DEFAULT_SOLUTIONS,
  ProfessionalPreferences 
} from "./ProfessionalPreferencesEditor";

export interface ProfessionalParticipant {
  id: string;
  name: string; // Contact person name
  email?: string;
  phone?: string;
  companyName: string;
  entityType: "client" | "provider";
  sector: string;
  companySize: string;
  needs?: string[];
  solutions?: string[];
  businessInterests?: string;
}

interface ProfessionalConfig {
  rotation_type?: "client_fixed" | "provider_fixed";
  sectors?: string[];
  predefined_needs?: string[];
  predefined_solutions?: string[];
}

interface AddProfessionalParticipantModalProps {
  onClose: () => void;
  onAdd: (participant: ProfessionalParticipant) => void;
  customPreferences?: Partial<ProfessionalPreferences>;
  professionalConfig?: ProfessionalConfig;
}

const AddProfessionalParticipantModal = ({
  onClose,
  onAdd,
  customPreferences,
  professionalConfig
}: AddProfessionalParticipantModalProps) => {
  // Contact info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Company info
  const [companyName, setCompanyName] = useState("");
  const [entityType, setEntityType] = useState<"client" | "provider">("client");
  const [sector, setSector] = useState("");
  const [companySize, setCompanySize] = useState("");
  
  // Needs/Solutions (depends on entity type)
  const [needsText, setNeedsText] = useState("");
  const [solutionsText, setSolutionsText] = useState("");
  const [businessInterests, setBusinessInterests] = useState("");

  // Use professionalConfig sectors if available, otherwise customPreferences or defaults
  const sectors = professionalConfig?.sectors || customPreferences?.sectors || [...DEFAULT_SECTORS];
  const companySizes = customPreferences?.companySizes || [...DEFAULT_COMPANY_SIZES];

  const handleSubmit = () => {
    if (!name.trim() || !companyName.trim() || !sector || !companySize) {
      return;
    }

    const participant: ProfessionalParticipant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      companyName: companyName.trim(),
      entityType,
      sector,
      companySize,
      needs: entityType === "client" && needsText.trim() 
        ? needsText.split(",").map(n => n.trim()).filter(Boolean) 
        : undefined,
      solutions: entityType === "provider" && solutionsText.trim() 
        ? solutionsText.split(",").map(s => s.trim()).filter(Boolean) 
        : undefined,
      businessInterests: businessInterests.trim() || undefined,
    };

    onAdd(participant);
    onClose();
  };

  const isValid = name.trim() && companyName.trim() && sector && companySize;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Añadir participante B2B
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="w-4 h-4" />
              Información de la empresa
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de empresa *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Tech Solutions SL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityType">Tipo de entidad *</Label>
              <Select value={entityType} onValueChange={(v) => setEntityType(v as "client" | "provider")}>
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente - Busca servicios/productos</SelectItem>
                  <SelectItem value="provider">Proveedor - Ofrece servicios/productos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Sector *</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Selecciona sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Tamaño *</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger id="companySize">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Person Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="w-4 h-4" />
              Persona de contacto
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre y apellidos *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María García López"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>
          </div>

          {/* Needs/Solutions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              {entityType === "client" ? "Necesidades" : "Soluciones que ofrece"}
            </div>

            {entityType === "client" ? (
              <div className="space-y-2">
                <Label htmlFor="needs">¿Qué necesita? (separar por comas)</Label>
                <Textarea
                  id="needs"
                  value={needsText}
                  onChange={(e) => setNeedsText(e.target.value)}
                  placeholder="Ej: Software CRM, Consultoría estratégica, Marketing digital"
                  rows={2}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="solutions">¿Qué ofrece? (separar por comas)</Label>
                <Textarea
                  id="solutions"
                  value={solutionsText}
                  onChange={(e) => setSolutionsText(e.target.value)}
                  placeholder="Ej: Desarrollo web, Apps móviles, Cloud computing"
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="interests">Intereses de negocio (opcional)</Label>
              <Input
                id="interests"
                value={businessInterests}
                onChange={(e) => setBusinessInterests(e.target.value)}
                placeholder="Ej: Expansión internacional, Innovación tecnológica"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              variant="hero" 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!isValid}
            >
              Añadir participante
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddProfessionalParticipantModal;
