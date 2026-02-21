import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Loader2, Heart, AlertCircle, Mail, Users, Clock } from "lucide-react";
import konektumLogo from "@/assets/konektum-logo.png";
import { useToast } from "@/hooks/use-toast";
import MultiSelectAge from "@/components/ui/multi-select-age";
import { supabase } from "@/integrations/supabase/client";
import { translations, Language } from "@/i18n/translations";
import { 
  AGE_RANGES, 
  GENDERS, 
  PREFERENCES, 
  DATING_PREFERENCES 
} from "@/lib/excelParser";

interface SlotQuota {
  gender: string;
  ageRange: string;
  maxSlots: number;
}

interface QuotaStatus {
  gender: string;
  ageRange: string;
  current: number;
  max: number;
  available: number;
}

const ParticipantJoin = () => {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [preference, setPreference] = useState("");
  const [datingPreference, setDatingPreference] = useState("");
  const [gender, setGender] = useState("");
  const [isReturningParticipant, setIsReturningParticipant] = useState<string>("");
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [autoCheckedIn, setAutoCheckedIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  
  const [eventExists, setEventExists] = useState<boolean | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event language
  const [eventLang, setEventLang] = useState<Language>("es");
  const t = translations[eventLang];

  // Event preferences (custom or default)
  const [eventAgeRanges, setEventAgeRanges] = useState<string[]>([...AGE_RANGES]);
  const [eventGenders, setEventGenders] = useState<string[]>([...GENDERS]);
  const [eventPreferences, setEventPreferences] = useState<string[]>([...PREFERENCES]);
  const [eventDatingPreferences, setEventDatingPreferences] = useState<string[]>([...DATING_PREFERENCES]);

  // Filter dating preferences based on selected gender
  const getFilteredDatingPreferences = (selectedGender: string, allPrefs: string[]): string[] => {
    if (!selectedGender) return allPrefs;
    const genderNorm = selectedGender.toLowerCase();
    return allPrefs.filter(pref => {
      const prefLower = pref.toLowerCase();
      if (prefLower.startsWith("soy un hombre")) return genderNorm === "hombre";
      if (prefLower.startsWith("soy una mujer")) return genderNorm === "mujer";
      if (prefLower === "no binario") return genderNorm === "no binario" || genderNorm === "prefiero no decirlo";
      return true;
    });
  };

  const filteredDatingPreferences = getFilteredDatingPreferences(gender, eventDatingPreferences);
  
  // Quota system
  const [quotasEnabled, setQuotasEnabled] = useState(false);
  const [slotQuotas, setSlotQuotas] = useState<SlotQuota[]>([]);
  const [quotaStatuses, setQuotaStatuses] = useState<QuotaStatus[]>([]);
  const [calculatedAgeRange, setCalculatedAgeRange] = useState<string>("");

  useEffect(() => {
    const checkEvent = async () => {
      if (!eventId) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id, name, date, status, language, custom_age_ranges, custom_genders, custom_preferences, custom_dating_preferences, registration_requirements_enabled, slot_quotas")
        .eq("id", eventId)
        .single();

      if (error || !data) {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setEventExists(false);
        setIsLoading(false);
        return;
      }

      setEventExists(true);
      setEventName(data.name);
      setEventDate(new Date(data.date));
      
      // Set event language
      if (data.language === 'en' || data.language === 'es') {
        setEventLang(data.language as Language);
      }
      
      // Load custom preferences if they exist
      if (data.custom_age_ranges && Array.isArray(data.custom_age_ranges)) {
        setEventAgeRanges(data.custom_age_ranges as string[]);
      }
      if (data.custom_genders && Array.isArray(data.custom_genders)) {
        setEventGenders(data.custom_genders as string[]);
      }
      if (data.custom_preferences && Array.isArray(data.custom_preferences)) {
        setEventPreferences(data.custom_preferences as string[]);
      }
      if (data.custom_dating_preferences && Array.isArray(data.custom_dating_preferences)) {
        setEventDatingPreferences(data.custom_dating_preferences as string[]);
      }
      
      // Load quota configuration and current counts
      if (data.registration_requirements_enabled && data.slot_quotas) {
        setQuotasEnabled(true);
        const quotas = data.slot_quotas as unknown as SlotQuota[];
        setSlotQuotas(quotas);
        
        await loadAllQuotaCounts(eventId, quotas);
      }
      
      setIsLoading(false);
    };

    checkEvent();
  }, [eventId]);

  // Load ALL quota counts upfront to display before form
  const loadAllQuotaCounts = async (eventId: string, quotas: SlotQuota[]) => {
    const statuses: QuotaStatus[] = [];
    
    for (const quota of quotas) {
      const { count } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('gender', quota.gender)
        .eq('age_range', quota.ageRange);
      
      const current = count || 0;
      statuses.push({
        gender: quota.gender,
        ageRange: quota.ageRange,
        current,
        max: quota.maxSlots,
        available: quota.maxSlots - current
      });
    }
    
    setQuotaStatuses(statuses);
  };

  // Calculate age range from birth date
  const calculateAgeRange = (dateString: string): string => {
    if (!dateString) return "";
    
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // Find matching age range
    for (const range of eventAgeRanges) {
      if (range.includes('+')) {
        const num = parseInt(range.replace(/[^0-9]/g, ''));
        if (!isNaN(num) && age >= num) return range;
        continue;
      }
      const parts = range.replace(/–/g, '-').split('-').map(n => parseInt(n.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && age >= parts[0] && age <= parts[1]) {
        return range;
      }
    }
    
    return "Otro";
  };

  useEffect(() => {
    if (birthDate) {
      const range = calculateAgeRange(birthDate);
      setCalculatedAgeRange(range);
    } else {
      setCalculatedAgeRange("");
    }
  }, [birthDate, eventAgeRanges]);

  const getAvailableSlots = (): { available: boolean; remaining: number; total: number } | null => {
    if (!quotasEnabled || !gender || !calculatedAgeRange) return null;
    
    const status = quotaStatuses.find(q => q.gender === gender && q.ageRange === calculatedAgeRange);
    if (!status) return null;
    
    return { available: status.available > 0, remaining: status.available, total: status.max };
  };

  const preferredAgeRanges = [...eventAgeRanges, eventLang === "en" ? "Any age range" : "Cualquier rango de edad"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !birthDate || !gender || selectedAgeRanges.length === 0 || !preference || !isReturningParticipant) {
      toast({
        title: "Error",
        description: t.join.errorMissingFields,
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Error",
        description: t.join.errorInvalidEmail,
        variant: "destructive",
      });
      return;
    }

    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 18) {
      toast({
        title: "Error",
        description: t.join.errorMinAge,
        variant: "destructive",
      });
      return;
    }
    
    if (preference === "Amistad y ligue" && !datingPreference) {
      toast({
        title: "Error",
        description: t.join.errorDatingPref,
        variant: "destructive",
      });
      return;
    }

    const slots = getAvailableSlots();
    if (slots && !slots.available) {
      toast({
        title: t.join.errorNoSlots,
        description: t.join.errorNoSlots,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const preferredAgeRange = selectedAgeRanges.join(', ');
    
    const { data, error } = await supabase.functions.invoke('register-participant', {
      body: {
        eventId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        gender,
        birthDate,
        datingPreference: preference === "Amistad y ligue" ? datingPreference : null,
        preferredAgeRange,
        isReturningParticipant: isReturningParticipant === "yes"
      }
    });

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error || t.join.errorRegister,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const baseUrl = window.location.origin;
    if (data.autoCheckedIn && data.verificationCode) {
      await supabase.functions.invoke('send-checkin-code', {
        body: {
          participantId: data.participantId,
          eventId,
          baseUrl
        }
      });
      setVerificationCode(data.verificationCode);
    } else {
      await supabase.functions.invoke('send-registration-confirmation', {
        body: {
          participantId: data.participantId,
          eventId
        }
      });
    }

    setAutoCheckedIn(data.autoCheckedIn);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eventExists) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">{t.join.eventNotAvailable}</h2>
            <p className="text-muted-foreground">{t.join.eventNotAvailableDesc}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center animate-scale-in">
          <CardContent className="pt-6 space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">{t.join.registrationComplete}</h2>
              <p className="text-muted-foreground">
                {t.join.emailConfirmation} <strong>{email}</strong> {t.join.emailConfirmationSuffix}
              </p>
            </div>

            {autoCheckedIn && verificationCode ? (
              <>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400 text-left">
                    {t.join.autoCheckinMsg}
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span>{t.join.yourAccessCode}</span>
                  </div>
                  <div className="text-3xl font-mono font-bold tracking-widest text-primary">
                    {verificationCode}
                  </div>
                </div>

                <div className="text-left space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{t.join.withCodeYouCan}</p>
                  <ul className="space-y-1 ml-4">
                    <li>🪑 {t.join.seeYourTables}</li>
                    <li>💕 {t.join.sendSelections}</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 text-left">
                    <strong>{t.join.important}</strong> {t.join.saveCode}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="text-5xl mb-2">🎉</div>
                  <p className="text-foreground font-medium">{t.join.placeReserved}</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-left">
                  <p className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t.join.dayOfEvent}
                  </p>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 ml-4 list-decimal">
                    <li>{t.join.dayOfEventStep1}</li>
                    <li>{t.join.dayOfEventStep2}</li>
                    <li>{t.join.dayOfEventStep3}</li>
                  </ol>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.join.checkEmail}</span>
            </div>
            
            <img src={konektumLogo} alt="Konektum" className="h-10 w-auto mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const slots = getAvailableSlots();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <img src={konektumLogo} alt="Konektum" className="h-10 w-auto" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-md">
        {quotasEnabled && quotaStatuses.length > 0 && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t.join.availableSlots}
              </CardTitle>
              <CardDescription>{t.join.checkSlotsSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {quotaStatuses.map((status, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      status.available > 0 
                        ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {status.gender} ({status.ageRange})
                    </span>
                    <span className={`text-sm font-bold ${
                      status.available > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {status.available > 0 ? `${status.available} ${t.join.slotsOf} ${status.max}` : t.join.slotsFull}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{t.join.joinEvent} {eventName}</CardTitle>
            <CardDescription>
              {t.join.formSubtitle}
              {eventDate && (
                <span className="block mt-1 text-primary font-medium">
                  📅 {eventDate.toLocaleDateString(eventLang === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.join.nameLabel}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.join.namePlaceholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.join.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.join.emailPlaceholder}
                  required
                />
                <p className="text-xs text-muted-foreground">{t.join.emailHint}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.join.phoneLabel}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.join.phonePlaceholder}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t.join.birthDateLabel}</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  required
                />
                {calculatedAgeRange && (
                  <p className="text-xs text-muted-foreground">
                    {t.join.ageRangeHint} <span className="font-medium text-foreground">{calculatedAgeRange}</span>
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
              <Label>{t.join.genderLabel}</Label>
                <Select value={gender} onValueChange={(val) => {
                  setGender(val);
                  if (datingPreference) {
                    const newFiltered = getFilteredDatingPreferences(val, eventDatingPreferences);
                    if (!newFiltered.includes(datingPreference)) {
                      setDatingPreference("");
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.join.genderPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventGenders.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {quotasEnabled && gender && calculatedAgeRange && slots && (
                <div className={`rounded-lg p-3 flex items-start gap-2 ${
                  slots.available 
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'
                }`}>
                  {slots.available ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {t.join.slotsRemaining} <strong>{slots.remaining}</strong> {t.join.slotsOf} {slots.total} {t.join.slotsFor} {gender} ({calculatedAgeRange})
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {t.join.noSlotsAvailable} {gender} ({calculatedAgeRange})
                      </p>
                    </>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>{t.join.preferredAgeLabel}</Label>
                <MultiSelectAge
                  options={preferredAgeRanges}
                  selected={selectedAgeRanges}
                  onChange={setSelectedAgeRanges}
                  placeholder={t.join.preferredAgePlaceholder}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.join.preferenceLabel}</Label>
                <Select value={preference} onValueChange={setPreference}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.join.preferencePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventPreferences.map((pref) => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {preference === "Amistad y ligue" && (
                <div className="space-y-2 animate-fade-in">
                  <Label>{t.join.datingPrefLabel}</Label>
                  <Select value={datingPreference} onValueChange={setDatingPreference}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.join.datingPrefPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDatingPreferences.map((pref) => (
                        <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <Label>{t.join.returningLabel}</Label>
                <RadioGroup value={isReturningParticipant} onValueChange={setIsReturningParticipant}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="returning-yes" />
                    <Label htmlFor="returning-yes" className="font-normal cursor-pointer">{t.join.returningYes}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="returning-no" />
                    <Label htmlFor="returning-no" className="font-normal cursor-pointer">{t.join.returningNo}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full mt-6" 
                disabled={isSubmitting || (slots && !slots.available)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.join.submitting}
                  </>
                ) : (
                  t.join.submitButton
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ParticipantJoin;
