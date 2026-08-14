import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarPlus, Copy, Check, Link2, Repeat, Trash2, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  buildSeriesUrl,
  createSeries,
  createSeriesEventsFromBase,
  listSeries,
  slugifySeries,
  updateSeries,
  type EventSeries,
  type SeriesDateEntry,
} from "@/lib/eventSeries";

interface EventSeriesManagerProps {
  /** auth user id of the organizer (events.organizer_id) */
  organizerUserId: string;
  organizerSlug?: string | null;
  /** currently linked series */
  seriesId?: string | null;
  /** base event used to clone future dates (omit when creating a new event) */
  eventId?: string | null;
  onSeriesChange: (seriesId: string | null) => void;
  /** used only when there is no base event yet (creation flow) */
  pendingDates?: SeriesDateEntry[];
  onPendingDatesChange?: (dates: SeriesDateEntry[]) => void;
  compact?: boolean;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const EventSeriesManager = ({
  organizerUserId,
  organizerSlug,
  seriesId,
  eventId,
  onSeriesChange,
  pendingDates,
  onPendingDatesChange,
  compact,
}: EventSeriesManagerProps) => {
  const { toast } = useToast();
  const [series, setSeries] = useState<EventSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [mode, setMode] = useState<"existing" | "new">(seriesId ? "existing" : "new");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugDraft, setSlugDraft] = useState("");

  const [dates, setDates] = useState<SeriesDateEntry[]>(pendingDates || []);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("19:30");
  const [creatingEvents, setCreatingEvents] = useState(false);

  const current = useMemo(() => series.find((s) => s.id === seriesId) || null, [series, seriesId]);
  const isRecurring = Boolean(seriesId);

  useEffect(() => {
    if (!organizerUserId) return;
    setLoading(true);
    listSeries(organizerUserId)
      .then(setSeries)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [organizerUserId]);

  useEffect(() => {
    setSlugDraft(current?.slug || "");
    if (seriesId) setMode("existing");
  }, [current?.slug, seriesId]);

  const updateDates = (next: SeriesDateEntry[]) => {
    setDates(next);
    onPendingDatesChange?.(next);
  };

  const handleCreateSeries = async () => {
    if (!newName.trim()) {
      toast({ title: "Falta el nombre", description: "Indica un nombre para la serie", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await createSeries(organizerUserId, newName, newSlug || newName);
      setSeries((prev) => [created, ...prev]);
      onSeriesChange(created.id);
      setNewName("");
      setNewSlug("");
      toast({ title: "Serie creada", description: `Enlace compartido: /s/${created.slug}` });
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudo crear la serie", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlug = async () => {
    if (!current) return;
    const clean = slugifySeries(slugDraft);
    if (!clean) {
      toast({ title: "Enlace inválido", description: "Usa letras, números y guiones", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateSeries(current.id, { slug: clean });
      setSeries((prev) => prev.map((s) => (s.id === current.id ? { ...s, slug: clean } : s)));
      toast({ title: "Enlace actualizado", description: `/s/${clean}` });
    } catch {
      toast({ title: "Error", description: "Ese enlace ya está en uso", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!current) return;
    navigator.clipboard.writeText(buildSeriesUrl(current.slug, organizerSlug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddDate = () => {
    if (!selectedDay) return;
    const iso = toISO(selectedDay);
    if (dates.some((d) => d.date === iso && d.time === selectedTime)) return;
    updateDates([...dates, { date: iso, time: selectedTime }].sort((a, b) => a.date.localeCompare(b.date)));
    setSelectedDay(undefined);
  };

  const handleCreateFutureEvents = async () => {
    if (!eventId || !seriesId || dates.length === 0) return;
    setCreatingEvents(true);
    try {
      const ids = await createSeriesEventsFromBase(eventId, seriesId, dates);
      updateDates([]);
      toast({
        title: "Eventos creados",
        description: `Se han creado ${ids.length} evento(s) futuros de la serie con la misma configuración.`,
      });
    } catch {
      toast({ title: "Error", description: "No se pudieron crear los eventos", variant: "destructive" });
    } finally {
      setCreatingEvents(false);
    }
  };

  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="w-4 h-4" />
          Evento recurrente (serie)
        </CardTitle>
        <CardDescription>
          Reutiliza un mismo enlace para todas las ediciones. El siguiente evento solo se abre en ese enlace
          cuando el vigente ya está cerrado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-base">Marcar como evento recurrente</Label>
            <p className="text-xs text-muted-foreground">Asocia este evento a una serie con enlace compartido</p>
          </div>
          <Switch
            checked={isRecurring}
            onCheckedChange={(checked) => {
              if (!checked) {
                onSeriesChange(null);
                updateDates([]);
              } else if (series.length > 0) {
                setMode("existing");
                onSeriesChange(series[0].id);
              } else {
                setMode("new");
              }
            }}
          />
        </div>

        {(isRecurring || mode === "new") && (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
                disabled={series.length === 0}
              >
                Asociar a serie existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                <Plus className="w-3 h-3 mr-1" />
                Nueva serie
              </Button>
            </div>

            {mode === "existing" ? (
              <div className="space-y-2">
                <Label>Serie</Label>
                <Select value={seriesId || ""} onValueChange={(v) => onSeriesChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Cargando..." : "Selecciona una serie"} />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — /s/{s.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre de la serie</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Slow Friending Barcelona"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL compartida (opcional)</Label>
                  <Input
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="slow-friending-bcn"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="button" onClick={handleCreateSeries} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Crear serie
                  </Button>
                </div>
              </div>
            )}

            {current && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{current.name}</Badge>
                  <span className="text-xs text-muted-foreground break-all">
                    {buildSeriesUrl(current.slug, organizerSlug)}
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Editar URL compartida</Label>
                    <Input value={slugDraft} onChange={(e) => setSlugDraft(e.target.value)} />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleSaveSlug} disabled={saving}>
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {isRecurring && (
              <div className="space-y-3">
                <div>
                  <Label className="text-base">Próximas fechas de la serie</Label>
                  <p className="text-xs text-muted-foreground">
                    Añade varias fechas y horas para crear de golpe los próximos eventos con esta misma
                    configuración. Podrás editar después los detalles de cada uno.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        {selectedDay ? formatDate(toISO(selectedDay)) : "Elegir fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDay}
                        onSelect={setSelectedDay}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    className="w-28"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddDate} disabled={!selectedDay}>
                    <Plus className="w-3 h-3 mr-1" />
                    Añadir fecha
                  </Button>
                </div>

                {dates.length > 0 && (
                  <div className="space-y-2">
                    {dates.map((d) => (
                      <div
                        key={`${d.date}-${d.time}`}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>
                          {formatDate(d.date)} {d.time && `· ${d.time}`}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => updateDates(dates.filter((x) => !(x.date === d.date && x.time === d.time)))}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {eventId ? (
                      <Button type="button" onClick={handleCreateFutureEvents} disabled={creatingEvents}>
                        {creatingEvents ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CalendarPlus className="w-4 h-4 mr-2" />
                        )}
                        Crear {dates.length} evento(s) de la serie
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Estos eventos se crearán automáticamente al guardar el evento.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EventSeriesManager;
