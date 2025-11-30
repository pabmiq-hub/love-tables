import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart, ArrowLeft, Upload, Users, Clock, Table2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CreateEvent = () => {
  const [step, setStep] = useState(1);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [rounds, setRounds] = useState(5);
  const [tableSize, setTableSize] = useState(2);
  const [roundDuration, setRoundDuration] = useState(5);
  const [matchPreference, setMatchPreference] = useState("both");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setExcelFile(file);
        toast({
          title: "Archivo cargado",
          description: `${file.name} se ha cargado correctamente`,
        });
      } else {
        toast({
          title: "Error",
          description: "Por favor, sube un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateEvent = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      toast({
        title: "Evento creado",
        description: "Las mesas se han generado correctamente",
      });
      navigate("/admin/events/1");
      setIsLoading(false);
    }, 2000);
  };

  const nextStep = () => {
    if (step === 1 && (!eventName || !eventDate)) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SpeedMatch</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">Configura los detalles de tu speed dating</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 mx-2 rounded ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>Define los datos principales del evento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Nombre del evento</Label>
                <Input
                  id="eventName"
                  placeholder="Ej: Speed Dating Valencia"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Fecha del evento</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventLocation">Ubicación (opcional)</Label>
                <Input
                  id="eventLocation"
                  placeholder="Ej: Restaurante El Encuentro"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>
              <Button variant="hero" className="w-full mt-4" onClick={nextStep}>
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Configuración del evento</CardTitle>
              <CardDescription>Define las reglas y parámetros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label>Número de rondas: {rounds}</Label>
                    <Slider
                      value={[rounds]}
                      onValueChange={(v) => setRounds(v[0])}
                      min={3}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Table2 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <Label>Participantes por mesa: {tableSize}</Label>
                    <Slider
                      value={[tableSize]}
                      onValueChange={(v) => setTableSize(v[0])}
                      min={2}
                      max={6}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label>Duración por ronda: {roundDuration} minutos</Label>
                    <Slider
                      value={[roundDuration]}
                      onValueChange={(v) => setRoundDuration(v[0])}
                      min={3}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de conexiones</Label>
                  <Select value={matchPreference} onValueChange={setMatchPreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Amistad y romance</SelectItem>
                      <SelectItem value="friendship">Solo amistad</SelectItem>
                      <SelectItem value="romance">Solo romance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Atrás
                </Button>
                <Button variant="hero" className="flex-1" onClick={nextStep}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Upload participants */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Cargar participantes</CardTitle>
              <CardDescription>
                Sube un archivo Excel con la información de los participantes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  {excelFile ? (
                    <>
                      <p className="font-medium text-foreground">{excelFile.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">Haz clic para cambiar el archivo</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">Arrastra tu archivo Excel aquí</p>
                      <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
                    </>
                  )}
                </label>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Formato del Excel:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Nombre y apellidos</strong></li>
                  <li>• <strong>Rango de edad</strong> (ej: 25-30)</li>
                  <li>• <strong>Rango de edad preferido</strong> (ej: 25-35)</li>
                  <li>• <strong>Preferencia</strong> (amistad / amistad y ligue)</li>
                  <li>• <strong>Género</strong> (hombre / mujer / otro)</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={prevStep}>
                  Atrás
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleCreateEvent}
                  disabled={!excelFile || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando mesas...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Crear evento y generar mesas
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CreateEvent;
