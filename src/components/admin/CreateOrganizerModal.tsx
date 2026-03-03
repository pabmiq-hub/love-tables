import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  display_name: string;
}

interface Module {
  id: string;
  code: string;
  name: string;
}

interface CreateOrganizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  modules: Module[];
  onCreateOrganizer: (data: {
    email: string;
    password: string;
    company_name: string;
    contact_phone: string;
    plan_id: string;
    active_modules: string[];
  }) => Promise<{ success: boolean; email?: string; error?: string }>;
}

export function CreateOrganizerModal({
  open,
  onOpenChange,
  plans,
  modules,
  onCreateOrganizer,
}: CreateOrganizerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");
  const [createdPassword, setCreatedPassword] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [planId, setPlanId] = useState("");
  const [activeModules, setActiveModules] = useState<string[]>(["professional"]);
  const [isWhiteLabel, setIsWhiteLabel] = useState(true);

  const handleWhiteLabelToggle = (checked: boolean) => {
    setIsWhiteLabel(checked);
    if (checked) {
      setActiveModules(["professional"]);
    }
  };

  const handleModuleToggle = (code: string) => {
    if (isWhiteLabel) return;
    setActiveModules((prev) =>
      prev.includes(code)
        ? prev.filter((m) => m !== code)
        : [...prev, code]
    );
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setCompanyName("");
    setContactPhone("");
    setPlanId("");
    setActiveModules(["professional"]);
    setIsWhiteLabel(true);
    setCreated(false);
    setCreatedEmail("");
    setCreatedPassword("");
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      toast({
        title: "Campos obligatorios",
        description: "Email y contraseña son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onCreateOrganizer({
        email,
        password,
        company_name: companyName,
        contact_phone: contactPhone,
        plan_id: planId,
        active_modules: activeModules,
      });

      if (result.success) {
        setCreated(true);
        setCreatedEmail(email);
        setCreatedPassword(password);
        toast({
          title: "Organizador creado",
          description: `Se ha creado el organizador ${email} correctamente.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el organizador.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles" });
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear organizador</DialogTitle>
          <DialogDescription>
            Crea un nuevo organizador con acceso inmediato a la plataforma.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Organizador creado correctamente</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Comunica estas credenciales al organizador:
            </p>
            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{createdEmail}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdEmail)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs text-muted-foreground">Contraseña</Label>
                  <p className="font-mono text-sm">{createdPassword}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => copyToClipboard(createdPassword)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* White label preset */}
            <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
              <Checkbox
                id="whitelabel"
                checked={isWhiteLabel}
                onCheckedChange={handleWhiteLabelToggle}
              />
              <div className="flex-1">
                <label htmlFor="whitelabel" className="text-sm font-medium cursor-pointer">
                  Marca Blanca Profesional
                </label>
                <p className="text-xs text-muted-foreground">
                  Solo módulo profesional. El organizador podrá subir su logo.
                </p>
              </div>
              {isWhiteLabel && (
                <Badge variant="secondary" className="text-xs">Preset</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="organizador@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="flex gap-1">
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña temporal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="shrink-0 text-xs"
                  >
                    Auto
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nombre de empresa</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Empresa S.L."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Módulos</Label>
              <div className="flex gap-2">
                {modules.map((mod) => (
                  <Badge
                    key={mod.code}
                    variant={activeModules.includes(mod.code) ? "default" : "outline"}
                    className={`cursor-pointer ${isWhiteLabel && mod.code !== "professional" ? "opacity-40 cursor-not-allowed" : ""}`}
                    onClick={() => handleModuleToggle(mod.code)}
                  >
                    {mod.name || mod.code}
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear organizador
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
