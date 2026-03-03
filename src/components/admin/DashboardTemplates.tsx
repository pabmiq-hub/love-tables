import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Mail, Calendar } from "lucide-react";
import { FormTemplateEditor } from "./templates/FormTemplateEditor";
import { EmailTemplateManager } from "./templates/EmailTemplateManager";
import { EventTemplateManager } from "./templates/EventTemplateManager";

export function DashboardTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Plantillas</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona plantillas reutilizables para formularios, correos y eventos
        </p>
      </div>

      <Tabs defaultValue="forms" className="w-full">
        <TabsList>
          <TabsTrigger value="forms" className="gap-1.5">
            <FileText className="h-4 w-4" /> Formularios
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-1.5">
            <Mail className="h-4 w-4" /> Correos
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="mt-6">
          <FormTemplateEditor />
        </TabsContent>
        <TabsContent value="emails" className="mt-6">
          <EmailTemplateManager />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
