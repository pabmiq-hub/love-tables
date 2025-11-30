import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { Participant } from "@/lib/excelParser";

interface AddParticipantModalProps {
  onClose: () => void;
  onAdd: (participant: Participant) => void;
}

const AddParticipantModal = ({ onClose, onAdd }: AddParticipantModalProps) => {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [preferredAgeRange, setPreferredAgeRange] = useState("");
  const [preference, setPreference] = useState("Amistad y ligue");
  const [gender, setGender] = useState("Otro");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    const participant: Participant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      age: parseInt(ageRange.split('-')[0]) || 0,
      ageRange,
      preferredAgeRange,
      preference,
      gender,
    };
    
    onAdd(participant);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-scale-in">
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageRange">Rango de edad</Label>
                <Input
                  id="ageRange"
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  placeholder="Ej: 25-30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferredAge">Edad preferida</Label>
                <Input
                  id="preferredAge"
                  value={preferredAgeRange}
                  onChange={(e) => setPreferredAgeRange(e.target.value)}
                  placeholder="Ej: 25-35"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Preferencia</Label>
              <Select value={preference} onValueChange={setPreference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amistad y ligue">Amistad y ligue</SelectItem>
                  <SelectItem value="Solo amistad">Solo amistad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Género</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mujer">Mujer</SelectItem>
                  <SelectItem value="Hombre">Hombre</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
