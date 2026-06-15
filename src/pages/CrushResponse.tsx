import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Heart } from "lucide-react";

const CrushResponse = () => {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = params.get("id");
    const token = params.get("token");
    const action = params.get("action");
    if (!id || !token || !action) {
      setState("error");
      setMessage("Enlace incompleto.");
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("respond-crush", {
        body: { request_id: id, token, action },
      });
      if (error || (data as any)?.error) {
        setState("error");
        setMessage((data as any)?.error || error?.message || "No se pudo procesar el flechazo.");
        return;
      }
      setState("success");
      if (action === "accept") {
        const round = (data as any)?.scheduled_round;
        setMessage(
          round
            ? `¡Flechazo mutuo! Ambos recibiréis los datos de contacto por email y os asignaremos juntos en la ronda ${round}.`
            : "¡Flechazo mutuo! Ambos recibiréis los datos de contacto por email."
        );
      } else {
        setMessage("Has rechazado el flechazo. Gracias por responder.");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
            {state === "success" && <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />}
            {state === "error" && <XCircle className="w-5 h-5 text-destructive" />}
            Flechazo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {state === "loading" ? "Procesando..." : message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrushResponse;
