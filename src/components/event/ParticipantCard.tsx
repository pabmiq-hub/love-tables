import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, UserCheck, Send, Trash2, Loader2, Mail, Calendar, Key, User } from "lucide-react";
import InlineEmailEditor from "./InlineEmailEditor";

interface ParticipantCardProps {
  participant: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    age_range?: string | null;
    preference?: string | null;
    entity_type?: string | null;
    company_name?: string | null;
    checked_in?: boolean | null;
    verification_code?: string | null;
    created_at: string;
    dating_preference?: string | null;
  };
  index: number;
  isProfessional: boolean;
  eventStatus: string;
  isSendingCode: string | null;
  onView: () => void;
  onToggleCheckin: (id: string, currentState: boolean | null) => void;
  onSendCode: (id: string) => void;
  onDelete: (id: string) => void;
  onEmailUpdated: (id: string, email: string) => void;
}

const getGenderConfig = (gender: string | null) => {
  switch (gender) {
    case "Mujer":
      return { label: "Mujer", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800" };
    case "Hombre":
      return { label: "Hombre", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
    default:
      return gender ? { label: gender, className: "bg-secondary text-secondary-foreground border-border" } : null;
  }
};

const getInitialColor = (name: string) => {
  const colors = [
    "from-pink-500 to-rose-400",
    "from-violet-500 to-purple-400",
    "from-blue-500 to-cyan-400",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-orange-400",
    "from-red-500 to-pink-400",
    "from-indigo-500 to-blue-400",
    "from-fuchsia-500 to-pink-400",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const ParticipantCard = ({
  participant,
  index,
  isProfessional,
  eventStatus,
  isSendingCode,
  onView,
  onToggleCheckin,
  onSendCode,
  onDelete,
  onEmailUpdated,
}: ParticipantCardProps) => {
  const genderConfig = getGenderConfig(participant.gender);
  const gradientColor = getInitialColor(participant.name);
  const registrationDate = new Date(participant.created_at);

  return (
    <div
      className={`group relative rounded-xl border bg-card transition-all duration-200 hover:shadow-lg hover:border-primary/20 animate-fade-in cursor-pointer overflow-hidden ${
        participant.checked_in ? "border-primary/30 ring-1 ring-primary/10" : "border-border"
      }`}
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={onView}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${gradientColor} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-sm`}>
              {participant.checked_in ? "✓" : participant.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Name + Gender badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-sm truncate max-w-[200px]">
                  {participant.name}
                </h4>
                {participant.checked_in && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-primary/90">
                    Check-in
                  </Badge>
                )}
                {!isProfessional && genderConfig && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-medium ${genderConfig.className}`}>
                    {genderConfig.label}
                  </Badge>
                )}
                {isProfessional && participant.entity_type && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-medium ${
                    participant.entity_type === "client"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200"
                  }`}>
                    {participant.entity_type === "client" ? "Cliente" : "Proveedor"}
                  </Badge>
                )}
              </div>

              {/* Detail chips */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {!isProfessional && participant.age_range && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {participant.age_range}
                  </span>
                )}
                {isProfessional && participant.company_name && (
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    {participant.company_name}
                  </span>
                )}
                {participant.email && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{participant.email}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {registrationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              </div>

              {/* Verification code */}
              <div className="flex items-center gap-1">
                <Key className={`w-3 h-3 ${participant.verification_code ? "text-primary" : "text-muted-foreground/40"}`} />
                {participant.verification_code ? (
                  <span className="font-mono text-xs font-semibold text-primary tracking-wider">
                    {participant.verification_code}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50 italic">Sin código</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onView}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalle</TooltipContent>
            </Tooltip>

            <div className="hidden md:block">
              <InlineEmailEditor
                participantId={participant.id}
                currentEmail={participant.email}
                onEmailUpdated={(newEmail) => onEmailUpdated(participant.id, newEmail)}
              />
            </div>

            {eventStatus === "pending" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={participant.checked_in ? "default" : "outline"}
                    size="icon"
                    onClick={() => onToggleCheckin(participant.id, participant.checked_in)}
                    className={`h-8 w-8 ${participant.checked_in ? "bg-primary hover:bg-primary/90" : ""}`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{participant.checked_in ? "Deshacer check-in" : "Hacer check-in"}</TooltipContent>
              </Tooltip>
            )}

            {participant.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isSendingCode === participant.id}
                    onClick={() => onSendCode(participant.id)}
                  >
                    {isSendingCode === participant.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{participant.verification_code ? "Reenviar código" : "Enviar código"}</TooltipContent>
              </Tooltip>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar participante?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres eliminar a {participant.name}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(participant.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantCard;
