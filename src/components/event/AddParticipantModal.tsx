import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { 
  Participant, 
  AGE_RANGES, 
  PREFERRED_AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

interface AddParticipantModalProps {
  onClose: () => void;
  onAdd: (participant: Participant) => void;
}

const AddParticipantModal = ({ onClose, onAdd }: AddParticipantModalProps) => {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [preferredAgeRange, setPreferredAgeRange] = useState("");
  const [preference, setPreference] = useState("Amistad y ligue");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    const participant: Participant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      age: parseInt(ageRange.split('–')[0]) || 0,
      ageRange,
      preferredAgeRange,
      preference,
      gender,
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
              <Label>Rango de edad</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu rango de edad" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((range) => (
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
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Rango de edad preferido</Label>
              <Select value={preferredAgeRange} onValueChange={setPreferredAgeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el rango que buscas" />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Preferencia</Label>
              <Select value={preference} onValueChange={setPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREFERENCES.map((pref) => (
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
                    {DATING_PREFERENCES.map((pref) => (
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
