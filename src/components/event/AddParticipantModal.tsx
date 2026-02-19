import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const ageRanges = customPreferences?.ageRanges || [...AGE_RANGES];
  const genders = customPreferences?.genders || [...GENDERS];
  const preferences = customPreferences?.preferences || [...PREFERENCES];
  const datingPreferences = customPreferences?.datingPreferences || [...DATING_PREFERENCES];
  const preferredAgeRanges = [...ageRanges, "Cualquier rango de edad"];

  // Filter dating preferences based on selected gender
  const getFilteredDatingPreferences = (selectedGender: string, allPrefs: string[]): string[] => {
    if (!selectedGender) return allPrefs;
    const genderNorm = selectedGender.toLowerCase();
    return allPrefs.filter(pref => {
      const prefLower = pref.toLowerCase();
      if (prefLower.startsWith("soy un hombre")) return genderNorm === "hombre";
      if (prefLower.startsWith("soy una mujer")) return genderNorm === "mujer";
      if (prefLower === "no binario") return genderNorm === "no binario" || genderNorm === "prefiero no decirlo";
      return true;
    });
  };

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [calculatedAgeRange, setCalculatedAgeRange] = useState("");
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [preference, setPreference] = useState(preferences[0] || "Amistad y ligue");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");
  const [isReturningParticipant, setIsReturningParticipant] = useState<string>("");

  const calculateAgeRange = (dateString: string): string => {
    if (!dateString) return "";
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    for (const range of ageRanges) {
      if (range.includes('+')) {
        const num = parseInt(range.replace(/[^0-9]/g, ''));
        if (!isNaN(num) && age >= num) return range;
        continue;
      }
      const parts = range.replace(/–/g, '-').split('-').map(n => parseInt(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && age >= parts[0] && age <= parts[1]) {
        return range;
      }
    }
    return "Otro";
  };

  const getAge = (dateString: string): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (birthDate) {
      setCalculatedAgeRange(calculateAgeRange(birthDate));
    } else {
      setCalculatedAgeRange("");
    }
  }, [birthDate, ageRanges]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate || !gender) return;

    const age = getAge(birthDate);
    if (age < 18) {
      return; // The UI already shows a warning
    }

    const preferredAgeRange = selectedAgeRanges.join(', ');
    
    const participant: Participant = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      age,
      ageRange: calculatedAgeRange,
      preferredAgeRange,
      preference,
      gender,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      birthDate,
      isReturningParticipant: isReturningParticipant === "yes",
    };
    
    if (preference === "Amistad y ligue" && datingPreference) {
      participant.datingPreference = datingPreference;
    }
    
    onAdd(participant);
    onClose();
  };

  const age = birthDate ? getAge(birthDate) : null;
  const isUnder18 = age !== null && age < 18;

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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: tu@email.com"
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
              <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              {calculatedAgeRange && !isUnder18 && (
                <p className="text-xs text-muted-foreground">
                  Rango de edad: <strong>{calculatedAgeRange}</strong>
                </p>
              )}
              {isUnder18 && (
                <p className="text-xs text-destructive font-medium">
                  El participante debe ser mayor de 18 años
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Género *</Label>
              <Select value={gender} onValueChange={(val) => {
                setGender(val);
                if (datingPreference) {
                  const newFiltered = getFilteredDatingPreferences(val, datingPreferences);
                  if (!newFiltered.includes(datingPreference)) {
                    setDatingPreference("");
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona género" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>¿Ha participado en algún evento anterior del organizador? *</Label>
              <RadioGroup value={isReturningParticipant} onValueChange={setIsReturningParticipant}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="returning-yes" />
                  <Label htmlFor="returning-yes" className="font-normal">Sí</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="returning-no" />
                  <Label htmlFor="returning-no" className="font-normal">No</Label>
                </div>
              </RadioGroup>
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
                    {getFilteredDatingPreferences(gender, datingPreferences).map((pref) => (
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
              <Button 
                type="submit" 
                variant="hero" 
                className="flex-1"
                disabled={isUnder18 || !birthDate || !gender || !name.trim()}
              >
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
