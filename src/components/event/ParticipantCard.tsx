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
import { Eye, UserCheck, Send, Trash2, Loader2, Mail, Calendar, Key, User, Heart, Users, Handshake, Bell, Sparkles, RotateCcw, FlaskConical, CreditCard, CheckCircle2, BellRing, Cake } from "lucide-react";
import InlineEmailEditor from "./InlineEmailEditor";
import { normalizePreference } from "@/lib/analyticsNormalization";

interface ParticipantCardProps {
  participant: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    age_range?: string | null;
    birth_date?: string | null;
    preference?: string | null;
    entity_type?: string | null;
    company_name?: string | null;
    checked_in?: boolean | null;
    verification_code?: string | null;
    created_at?: string;
    dating_preference?: string | null;
    is_returning_participant?: boolean | null;
    is_fake?: boolean | null;
    payment_status?: string | null;
    paid_at?: string | null;
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
  onSendReminder?: (id: string) => void;
  isSendingReminder?: boolean;
  paymentTrackingEnabled?: boolean;
  onTogglePayment?: (id: string, currentPaid: boolean) => void;
  onSendPaymentReminder?: (id: string) => void;
  isSendingPaymentReminder?: boolean;
  eventStartAt?: Date | null;
}

const getGenderBadge = (gender: string | null) => {
  switch (gender) {
    case "Mujer":
      return { label: "Mujer", className: "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800/50" };
    case "Hombre":
      return { label: "Hombre", className: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50" };
    default:
      return gender ? { label: gender, className: "bg-muted text-muted-foreground border-border" } : null;
  }
};

const getPreferenceConfig = (preference: string | null) => {
  const normalized = normalizePreference(preference);
  switch (normalized) {
    case "Solo amistad":
      return { label: "Amistad", icon: Users, className: "text-sky-500" };
    case "Amistad y Ligue":
      return { label: "Amistad y Ligue", icon: Handshake, className: "text-violet-500" };
    case "Solo ligue":
      return { label: "Ligue", icon: Heart, className: "text-rose-500" };
    default:
      return null;
  }
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
  onSendReminder,
  isSendingReminder,
  paymentTrackingEnabled,
  onTogglePayment,
  onSendPaymentReminder,
  isSendingPaymentReminder,
  eventStartAt,
}: ParticipantCardProps) => {
  const isPaid = participant.payment_status === "paid";
  const paidAtMs = participant.paid_at ? new Date(participant.paid_at).getTime() : null;
  const eventStartMs = eventStartAt ? eventStartAt.getTime() : null;
  const eventStarted = eventStartMs != null && Date.now() >= eventStartMs;
  // "Late" payment = paid within the last hour before the event or after it started
  const isLatePayment =
    isPaid && paidAtMs != null && eventStartMs != null && paidAtMs >= eventStartMs - 60 * 60 * 1000;
  const genderConfig = getGenderBadge(participant.gender);
  const preferenceConfig = !isProfessional ? getPreferenceConfig(participant.preference) : null;
  const registrationDate = participant.created_at ? new Date(participant.created_at) : null;

  return (
    <div
      className={`group relative rounded-lg border bg-card transition-all duration-200 hover:shadow-md animate-fade-in cursor-pointer ${
        participant.checked_in ? "border-primary/30 bg-primary/[0.02]" : "border-border"
      }`}
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={onView}
    >
      <div className="p-4">
        {/* Header: Name + Badges + Actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h4 className="font-semibold text-sm truncate">{participant.name}</h4>
            {participant.is_fake && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300 border-orange-300 dark:border-orange-800/50 shrink-0">
                    <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                    Ficticio
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Participante generado para pruebas</TooltipContent>
              </Tooltip>
            )}
            {!participant.is_fake && participant.is_returning_participant ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 shrink-0">
                    <RotateCcw className="w-2.5 h-2.5 mr-0.5" />
                    Repite
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Ha participado en eventos anteriores</TooltipContent>
              </Tooltip>
            ) : !participant.is_fake ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    Nuevo
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Primera vez que participa</TooltipContent>
              </Tooltip>
            ) : null}
            {participant.checked_in && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-primary/90 shrink-0">
                Check-in
              </Badge>
            )}
            {paymentTrackingEnabled && isPaid && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                Pagado
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
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
                  : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
              }`}>
                {participant.entity_type === "client" ? "Cliente" : "Proveedor"}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onView}>
                  <Eye className="w-3.5 h-3.5" />
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
                    className={`h-7 w-7 ${participant.checked_in ? "bg-primary hover:bg-primary/90" : ""}`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{participant.checked_in ? "Deshacer check-in" : "Hacer check-in"}</TooltipContent>
              </Tooltip>
            )}

            {paymentTrackingEnabled && onTogglePayment && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPaid ? "default" : "outline"}
                    size="icon"
                    onClick={() => onTogglePayment(participant.id, isPaid)}
                    className={`h-7 w-7 ${
                      isPaid
                        ? isLatePayment
                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : "text-muted-foreground hover:text-emerald-600"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPaid
                    ? isLatePayment
                      ? "Pagado en el evento (haz clic para deshacer)"
                      : "Pagado antes del evento (haz clic para deshacer)"
                    : "Marcar como pagado"}
                </TooltipContent>
              </Tooltip>
            )}

            {paymentTrackingEnabled && !isPaid && !eventStarted && participant.email && onSendPaymentReminder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                    disabled={isSendingPaymentReminder}
                    onClick={() => onSendPaymentReminder(participant.id)}
                  >
                    {isSendingPaymentReminder ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BellRing className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar recordatorio de pago</TooltipContent>
              </Tooltip>
            )}




            {participant.email && (
              <>
                {onSendReminder && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                        disabled={isSendingReminder}
                        onClick={() => onSendReminder(participant.id)}
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Enviar recordatorio</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isSendingCode === participant.id}
                      onClick={() => onSendCode(participant.id)}
                    >
                      {isSendingCode === participant.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{participant.verification_code ? "Reenviar código" : "Enviar código"}</TooltipContent>
                </Tooltip>
              </>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
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

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {/* Age range */}
          {!isProfessional && participant.age_range && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span>{participant.age_range}</span>
            </div>
          )}

          {/* Company (professional) */}
          {isProfessional && participant.company_name && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate">{participant.company_name}</span>
            </div>
          )}

          {/* Email */}
          {participant.email && (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{participant.email}</span>
            </div>
          )}

          {/* Birth date */}
          {!isProfessional && participant.birth_date && (() => {
            const bd = new Date(`${participant.birth_date}T12:00:00`);
            if (isNaN(bd.getTime())) return null;
            return (
              <div className="flex items-center gap-1.5">
                <Cake className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                <span>
                  {bd.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            );
          })()}

          {/* Registration date - full format */}
          {registrationDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span>
                {registrationDate.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                {registrationDate.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Preference with icon */}
          {preferenceConfig && (
            <div className="flex items-center gap-1.5">
              <preferenceConfig.icon className={`w-3 h-3 shrink-0 ${preferenceConfig.className}`} />
              <span>{preferenceConfig.label}</span>
            </div>
          )}

          {/* Access code */}
          <div className="flex items-center gap-1.5">
            <Key className={`w-3 h-3 shrink-0 ${participant.verification_code ? "text-primary" : "text-muted-foreground/40"}`} />
            {participant.verification_code ? (
              <span className="font-mono text-xs font-semibold text-primary tracking-wider">
                {participant.verification_code}
              </span>
            ) : (
              <span className="text-muted-foreground/50 italic">Sin código</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantCard;
