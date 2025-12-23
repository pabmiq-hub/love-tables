import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AGE_RANGES,
  GENDERS,
  PREFERENCES,
  DATING_PREFERENCES,
} from "@/lib/excelParser";

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
}

interface EditParticipantModalProps {
  participant: ParticipantData;
  onClose: () => void;
  onSave: (updated: ParticipantData) => void;
}

const EditParticipantModal = ({ participant, onClose, onSave }: EditParticipantModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
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

    const { error } = await supabase
      .from("participants")
      .update({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        age_range: formData.age_range || null,
        preferred_age_range: formData.preferred_age_range || null,
        preference: formData.preference || null,
        dating_preference: formData.dating_preference || null,
        gender: formData.gender || null,
      })
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
      age_range: formData.age_range || null,
      preferred_age_range: formData.preferred_age_range || null,
      preference: formData.preference || null,
      dating_preference: formData.dating_preference || null,
      gender: formData.gender || null,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar participante</DialogTitle>
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
                {GENDERS.map(g => (
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
                {AGE_RANGES.map(r => (
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
                <SelectItem value="Cualquier rango">Cualquier rango</SelectItem>
                {AGE_RANGES.map(r => (
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
                {PREFERENCES.map(p => (
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
                {DATING_PREFERENCES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
