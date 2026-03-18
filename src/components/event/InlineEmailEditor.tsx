import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InlineEmailEditorProps {
  participantId: string;
  currentEmail: string | null;
  onEmailUpdated: (newEmail: string) => void;
}

const InlineEmailEditor = ({
  participantId,
  currentEmail,
  onEmailUpdated,
}: InlineEmailEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "El email no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Por favor, introduce un email válido",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("participants")
      .update({ email })
      .eq("id", participantId);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el email",
        variant: "destructive",
      });
      return;
    }

    onEmailUpdated(email);
    setIsEditing(false);
    toast({
      title: "Email actualizado",
      description: "El email se ha guardado correctamente",
    });
  };

  const handleCancel = () => {
    setEmail(currentEmail || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          className="h-7 text-xs w-40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{currentEmail ? "Editar email" : "Añadir email"}</TooltipContent>
    </Tooltip>
  );
};

export default InlineEmailEditor;
