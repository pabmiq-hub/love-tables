import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import MultiSelectAge from "@/components/ui/multi-select-age";
import { 
  Participant, 
  AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

export interface EventCustomPreferences {
  ageRanges?: string[];
  genders?: string[];
  preferences?: string[];
  datingPreferences?: string[];
}

interface AddParticipantModalProps {
  onClose: () => void;
  onAdd: (participant: Participant) => void;
  customPreferences?: EventCustomPreferences;
}

const AddParticipantModal = ({ onClose, onAdd, customPreferences }: AddParticipantModalProps) => {
  // Use custom preferences if provided, otherwise use defaults
  const ageRanges = customPreferences?.ageRanges || [...AGE_RANGES];
  const genders = customPreferences?.genders || [...GENDERS];
  const preferences = customPreferences?.preferences || [...PREFERENCES];
  const datingPreferences = customPreferences?.datingPreferences || [...DATING_PREFERENCES];
  const preferredAgeRanges = [...ageRanges, "Cualquier rango de edad"];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [preference, setPreference] = useState(preferences[0] || "Amistad y ligue");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    const preferredAgeRange = selectedAgeRanges.join(', ');
    
    const participant: Participant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      age: parseInt(ageRange.split('–')[0]) || 0,
      ageRange,
      preferredAgeRange,
      preference,
      gender,
      phone: phone.trim() || undefined,
    };
    
    if (preference === "Amistad y ligue" && datingPreference) {
      participant.datingPreference = datingPreference;
    }
    
    onAdd(participant);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle>Añadir Participante</CardTitle>
          <CardDescription>Introduce los datos del nuevo participante</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre y apellidos *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María García López"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +34 612 345 678"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rango de edad</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu rango de edad" />
                </SelectTrigger>
                <SelectContent>
                  {ageRanges.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Género</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu género" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Rango de edad preferido (puedes seleccionar varios)</Label>
              <MultiSelectAge
                options={preferredAgeRanges}
                selected={selectedAgeRanges}
                onChange={setSelectedAgeRanges}
                placeholder="Selecciona los rangos que buscas"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Preferencia</Label>
              <Select value={preference} onValueChange={setPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {preferences.map((pref) => (
                    <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {preference === "Amistad y ligue" && (
              <div className="space-y-2">
                <Label>Preferencia acerca de ligue</Label>
                <Select value={datingPreference} onValueChange={setDatingPreference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu preferencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {datingPreferences.map((pref) => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="hero" className="flex-1">
                Añadir
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddParticipantModal;
