import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const RepeatResponse = () => {
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
      const { data, error } = await supabase.functions.invoke("respond-repeat", {
        body: { request_id: id, token, action },
      });
      if (error || (data as any)?.error) {
        setState("error");
        setMessage((data as any)?.error || error?.message || "No se pudo procesar la solicitud.");
        return;
      }
      setState("success");
      setMessage(
        action === "accept"
          ? `Solicitud aceptada. Os asignaremos juntos en la ronda ${(data as any)?.scheduled_round || "siguiente"}.`
          : "Solicitud rechazada.",
      );
    })();
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
            {state === "success" && <CheckCircle2 className="w-5 h-5 text-primary" />}
            {state === "error" && <XCircle className="w-5 h-5 text-destructive" />}
            Solicitud de repetir
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

export default RepeatResponse;
