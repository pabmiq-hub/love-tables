import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, MessageSquare } from "lucide-react";
import EventSettingsEditor from "./EventSettingsEditor";
import CommunicationSettingsEditor from "./CommunicationSettingsEditor";
import { GroupRound } from "./GroupRoundsEditor";

interface EventSettingsTabsProps {
  eventId: string;
  name: string;
  date: string;
  eventTime: string | null;
  eventLocation: string | null;
  rounds: number;
  tableSize: number;
  roundDuration: number;
  rotationMode: "fixed_host" | "all_rotate";
  genderParity: boolean;
  language: string;
  registrationSubtitle: string | null;
  registrationDescription: string | null;
  customAgeRanges: string[] | null;
  customGenders: string[] | null;
  customPreferences: string[] | null;
  customDatingPreferences: string[] | null;
  module?: string | null;
  professionalConfig?: any;
  groupRounds?: GroupRound[] | null;
  emailTemplate?: any;
  checkinOpensMinutesBefore?: number;
  superLikeEnabled?: boolean;
  codeSendMode?: string;
  eventStatus?: string;
  onUpdate: (updates: Record<string, any>) => void;
}

const EventSettingsTabs = (props: EventSettingsTabsProps) => {
  return (
    <Tabs defaultValue="event" className="w-full">
      <TabsList className="w-full mb-6">
        <TabsTrigger value="event" className="flex-1">
          <Settings2 className="w-4 h-4 mr-2" />
          Ajustes del evento
        </TabsTrigger>
        <TabsTrigger value="communication" className="flex-1">
          <MessageSquare className="w-4 h-4 mr-2" />
          Ajustes de comunicación
        </TabsTrigger>
      </TabsList>

      <TabsContent value="event">
        <EventSettingsEditor {...props} />
      </TabsContent>

      <TabsContent value="communication">
        <CommunicationSettingsEditor
          eventId={props.eventId}
          eventName={props.name}
          language={props.language as "es" | "en"}
          module={props.module}
          onUpdate={props.onUpdate}
        />
      </TabsContent>
    </Tabs>
  );
};

export default EventSettingsTabs;
