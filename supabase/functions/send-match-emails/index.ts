import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface EmailTemplate {
  withMatches: {
    subject: string;
    greeting: string;
    intro: string;
    friendshipTitle: string;
    datingTitle: string;
    closing: string;
    signature: string;
  };
  withoutMatches: {
    subject: string;
    greeting: string;
    message: string;
    closing: string;
    signature: string;
  };
  primaryColor: string;
}

interface ProfessionalEmailTemplate {
  withConnections: {
    subject: string;
    greeting: string;
    intro: string;
    connectionsTitle: string;
    closing: string;
    signature: string;
  };
  withoutConnections: {
    subject: string;
    greeting: string;
    message: string;
    closing: string;
    signature: string;
  };
  primaryColor: string;
}

const DEFAULT_TEMPLATE: EmailTemplate = {
  withMatches: {
    subject: "¡Tienes matches en {{evento}}! 🎉",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Gracias por participar en nuestro evento! Tenemos buenas noticias: ¡has hecho match!",
    friendshipTitle: "🤝 Tus matches de amistad:",
    datingTitle: "❤️ Tus matches de ligue:",
    closing: "¡No dudes en contactarles!",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  withoutMatches: {
    subject: "Gracias por participar en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    message: "¡Gracias por participar! Aunque no hubo matches esta vez, ¡esperamos verte pronto!",
    closing: "¡Nos vemos en el próximo evento!",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  primaryColor: "#e11d48",
};

const DEFAULT_TEMPLATE_EN: EmailTemplate = {
  withMatches: {
    subject: "You have matches at {{evento}}! 🎉",
    greeting: "Hey {{nombre}}! 🎉",
    intro: "Thanks for joining our event! Great news: you got a match!",
    friendshipTitle: "🤝 Your friendship matches:",
    datingTitle: "❤️ Your dating matches:",
    closing: "Don't hesitate to reach out to them!",
    signature: "With love,\nThe Konektum team 💕",
  },
  withoutMatches: {
    subject: "Thanks for joining {{evento}}",
    greeting: "Hey {{nombre}}! 👋",
    message: "Thanks for participating! Although there were no matches this time, we hope to see you soon!",
    closing: "See you at the next event!",
    signature: "With love,\nThe Konektum team 💕",
  },
  primaryColor: "#e11d48",
};

const DEFAULT_PROFESSIONAL_TEMPLATE: ProfessionalEmailTemplate = {
  withConnections: {
    subject: "Nuevas conexiones profesionales de {{evento}}",
    greeting: "Estimado/a {{nombre}},",
    intro: "Es un placer informarle que, como resultado del evento de networking {{evento}}, hemos identificado las siguientes oportunidades de colaboración profesional para su empresa:",
    connectionsTitle: "🤝 Sus conexiones profesionales:",
    closing: "Le animamos a ponerse en contacto con estas empresas para explorar posibles sinergias y oportunidades de negocio. Quedamos a su disposición para facilitar cualquier introducción adicional.",
    signature: "Atentamente,\nEl equipo organizador",
  },
  withoutConnections: {
    subject: "Gracias por participar en {{evento}}",
    greeting: "Estimado/a {{nombre}},",
    message: "Agradecemos sinceramente su participación en nuestro evento de networking profesional {{evento}}. Aunque en esta ocasión no se han generado conexiones específicas, le mantendremos informado de futuras oportunidades de networking empresarial.",
    closing: "Esperamos poder conectarle con nuevos contactos profesionales en próximas ediciones.",
    signature: "Atentamente,\nEl equipo organizador",
  },
  primaryColor: "#059669",
};

const replaceVariables = (text: string, variables: Record<string, string>) => {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
};

const KONEKTUM_LOGO_URL = "https://konektum.com/konektum-logo.png";

const generateEmailHtml = (
  template: EmailTemplate,
  name: string,
  eventName: string,
  friendshipMatches: { name: string; phone: string | null; email: string | null }[],
  datingMatches: { name: string; phone: string | null; email: string | null }[],
  orgBranding?: { companyName: string | null; logoUrl: string | null; isProfessionalOnly: boolean },
  options?: { primaryColor?: string; logoUrl?: string | null; brandName?: string | null; headerTitle?: string; logoHeight?: number }
): string => {
  const hasMatches = friendshipMatches.length > 0 || datingMatches.length > 0;
  const variables = { nombre: name, evento: eventName };

  const resolvedLogoUrl = options?.logoUrl || (orgBranding?.isProfessionalOnly && orgBranding?.logoUrl ? orgBranding.logoUrl : KONEKTUM_LOGO_URL);
  const resolvedBrandName = options?.brandName || (orgBranding?.isProfessionalOnly && orgBranding?.companyName ? orgBranding.companyName : "Konektum");
  const logoHeight = Number.isFinite(Number(options?.logoHeight)) ? Math.min(120, Math.max(24, Number(options?.logoHeight))) : 48;
  const primaryColor = options?.primaryColor || template.primaryColor || "#e11d48";
  const headerTitle = options?.headerTitle || resolvedBrandName;

  const logoHtml = `<img src="${escapeHtml(resolvedLogoUrl)}" alt="${escapeHtml(resolvedBrandName)}" style="max-height:${logoHeight}px;max-width:260px;margin-bottom:12px;" />`;

  if (hasMatches) {
    const t = template.withMatches;
    const friendshipList = friendshipMatches.length > 0
      ? `<div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;"><h3 style="margin:0 0 12px 0;">${escapeHtml(t.friendshipTitle)}</h3><ul style="margin:0;padding-left:20px;">${friendshipMatches.map(m => `<li>${escapeHtml(m.name)}${m.phone ? ` - 📞 ${escapeHtml(m.phone)}` : (m.email ? ` - 📧 ${escapeHtml(m.email)}` : '')}</li>`).join('')}</ul></div>` : '';
    const datingList = datingMatches.length > 0
      ? `<div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;"><h3 style="margin:0 0 12px 0;">${escapeHtml(t.datingTitle)}</h3><ul style="margin:0;padding-left:20px;">${datingMatches.map(m => `<li>${escapeHtml(m.name)}${m.phone ? ` - 📞 ${escapeHtml(m.phone)}` : (m.email ? ` - 📧 ${escapeHtml(m.email)}` : '')}</li>`).join('')}</ul></div>` : '';

    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;"><div style="background:${primaryColor};padding:30px;border-radius:10px 10px 0 0;text-align:center;">${logoHtml}<h1 style="color:white;margin:0;font-size:24px;">${escapeHtml(headerTitle)}</h1></div><div style="background:white;padding:30px;border-radius:0 0 10px 10px;"><h2>${replaceVariables(t.greeting, variables)}</h2><p>${replaceVariables(t.intro, variables)}</p>${friendshipList}${datingList}<p>${replaceVariables(t.closing, variables)}</p><p style="color:#888;white-space:pre-line;">${escapeHtml(t.signature)}</p></div></body></html>`;
  }

  const t = template.withoutMatches;
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;"><div style="background:${primaryColor};padding:30px;border-radius:10px 10px 0 0;text-align:center;">${logoHtml}<h1 style="color:white;margin:0;font-size:24px;">${escapeHtml(headerTitle)}</h1></div><div style="background:white;padding:30px;border-radius:0 0 10px 10px;"><h2>${replaceVariables(t.greeting, variables)}</h2><p style="white-space:pre-line;">${replaceVariables(t.message, variables)}</p><p>${replaceVariables(t.closing, variables)}</p><p style="color:#888;white-space:pre-line;">${escapeHtml(t.signature)}</p></div></body></html>`;
};

// Generate professional B2B email HTML with optional white-label branding
const generateProfessionalEmailHtml = (
  template: ProfessionalEmailTemplate,
  participantName: string,
  companyName: string,
  eventName: string,
  connections: { company: string; sector: string; contactPerson: string; phone: string | null; entityType: string }[],
  orgBranding?: { companyName: string | null; logoUrl: string | null; isProfessionalOnly: boolean }
): string => {
  const hasConnections = connections.length > 0;
  const variables = { nombre: participantName, empresa: companyName, evento: eventName };
  
  // Use organizer branding if available (white-label)
  const brandName = orgBranding?.isProfessionalOnly && orgBranding?.companyName ? escapeHtml(orgBranding.companyName) : "Konektum Business";
  const brandColor = "#059669";
  const logoHtml = orgBranding?.isProfessionalOnly && orgBranding?.logoUrl
    ? `<img src="${escapeHtml(orgBranding.logoUrl)}" alt="${brandName}" style="max-height:40px;max-width:200px;" />`
    : `<img src="${KONEKTUM_LOGO_URL}" alt="Konektum Business" style="max-height:40px;max-width:200px;" />`;
  
  if (hasConnections) {
    const t = template.withConnections;
    const connectionsList = connections.map(c => 
      `<tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;font-weight:500;">${escapeHtml(c.company)}</td>
        <td style="padding:12px 8px;color:#6b7280;">${escapeHtml(c.sector)}</td>
        <td style="padding:12px 8px;">${escapeHtml(c.contactPerson)}</td>
        <td style="padding:12px 8px;">${c.phone ? escapeHtml(c.phone) : '-'}</td>
        <td style="padding:12px 8px;"><span style="background:${c.entityType === 'client' ? '#dbeafe' : '#d1fae5'};color:${c.entityType === 'client' ? '#1e40af' : '#047857'};padding:2px 8px;border-radius:4px;font-size:12px;">${c.entityType === 'client' ? 'Cliente' : 'Proveedor'}</span></td>
      </tr>`
    ).join('');
    
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1f2937;">
      <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid ${brandColor};">
        ${logoHtml}
        <p style="color:#6b7280;margin:4px 0 0 0;font-size:14px;">Networking Profesional</p>
      </div>
      <div style="padding:24px 0;">
        <p style="font-size:16px;margin:0 0 16px 0;">${replaceVariables(t.greeting, variables)}</p>
        <p style="color:#4b5563;line-height:1.6;">${replaceVariables(t.intro, variables)}</p>
        
        <div style="margin:24px 0;">
          <h3 style="color:${brandColor};margin:0 0 16px 0;">${t.connectionsTitle}</h3>
          <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:${brandColor};color:white;">
                <th style="padding:12px 8px;text-align:left;font-weight:500;">Empresa</th>
                <th style="padding:12px 8px;text-align:left;font-weight:500;">Sector</th>
                <th style="padding:12px 8px;text-align:left;font-weight:500;">Contacto</th>
                <th style="padding:12px 8px;text-align:left;font-weight:500;">Teléfono</th>
                <th style="padding:12px 8px;text-align:left;font-weight:500;">Tipo</th>
              </tr>
            </thead>
            <tbody>${connectionsList}</tbody>
          </table>
        </div>
        
        <p style="color:#4b5563;line-height:1.6;">${replaceVariables(t.closing, variables)}</p>
      </div>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;color:#6b7280;font-size:14px;white-space:pre-line;">${t.signature}</div>
    </body></html>`;
  } else {
    const t = template.withoutConnections;
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1f2937;">
      <div style="text-align:center;padding-bottom:20px;border-bottom:2px solid ${brandColor};">
        ${logoHtml}
        <p style="color:#6b7280;margin:4px 0 0 0;font-size:14px;">Networking Profesional</p>
      </div>
      <div style="padding:24px 0;">
        <p style="font-size:16px;margin:0 0 16px 0;">${replaceVariables(t.greeting, variables)}</p>
        <p style="color:#4b5563;line-height:1.6;white-space:pre-line;">${replaceVariables(t.message, variables)}</p>
        <p style="color:#4b5563;margin-top:16px;">${replaceVariables(t.closing, variables)}</p>
      </div>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;color:#6b7280;font-size:14px;white-space:pre-line;">${t.signature}</div>
    </body></html>`;
  }
};

// Helper to get organizer's own Resend config (API key + sender)
const getOrganizerResendConfig = async (
  supabase: any,
  organizerId: string
): Promise<{ from: string; apiKey: string } | null> => {
  try {
    const { data } = await supabase
      .from("organizer_resend_config")
      .select("resend_api_key, sender_email, sender_name, is_verified")
      .eq("organizer_id", organizerId)
      .eq("is_verified", true)
      .maybeSingle();

    if (data?.resend_api_key && data?.sender_email) {
      const name = data.sender_name || data.sender_email;
      return { from: `${name} <${data.sender_email}>`, apiKey: data.resend_api_key };
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to get organizer branding (company_name, logo_url) from user_id
const getOrganizerBranding = async (
  supabase: any,
  userId: string
): Promise<{ companyName: string | null; logoUrl: string | null; isProfessionalOnly: boolean }> => {
  try {
    const { data } = await supabase
      .from("organizers")
      .select("company_name, logo_url, active_modules")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      const modules = data.active_modules || [];
      return {
        companyName: data.company_name,
        logoUrl: data.logo_url,
        isProfessionalOnly: modules.length === 1 && modules[0] === "professional",
      };
    }
    return { companyName: null, logoUrl: null, isProfessionalOnly: false };
  } catch {
    return { companyName: null, logoUrl: null, isProfessionalOnly: false };
  }
};

// Rate limiting helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_EMAILS = 350; // 350ms = ~2.8 emails/sec (slightly above limit but with retries)
const RATE_LIMIT_RETRY_DELAY = 2000; // Wait 2 seconds if rate limited
const MAX_RETRIES = 3;

const sendEmailWithRetry = async (
  resendApiKey: string,
  emailData: { from: string; to: string[]; subject: string; html: string },
  participantName: string
): Promise<{ success: boolean; error?: string }> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Sending email to ${participantName} (attempt ${attempt}/${MAX_RETRIES})`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });
      
      if (res.ok) {
        console.log(`Email sent successfully to ${participantName}`);
        return { success: true };
      }
      
      const errorText = await res.text();
      
      // If rate limited and not last attempt, wait and retry
      if (res.status === 429 && attempt < MAX_RETRIES) {
        console.log(`Rate limit hit for ${participantName}, waiting ${RATE_LIMIT_RETRY_DELAY}ms before retry...`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        continue;
      }
      
      console.error(`Failed to send email to ${participantName}: ${errorText}`);
      return { success: false, error: errorText };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES) {
        console.log(`Exception for ${participantName}, retrying: ${errMsg}`);
        await delay(RATE_LIMIT_RETRY_DELAY);
        continue;
      }
      console.error(`Exception sending email to ${participantName}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
  return { success: false, error: "Max retries exceeded" };
};

// Log email result to database
const logEmailResult = async (
  supabase: any,
  eventId: string,
  participantId: string,
  emailType: string,
  status: string,
  errorMessage?: string
) => {
  try {
    await supabase.from("email_logs").insert({
      event_id: eventId,
      participant_id: participantId,
      email_type: emailType,
      status: status,
      error_message: errorMessage || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.error("Failed to log email result:", e);
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-match-emails function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No token provided" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create auth client to verify token
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.log("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { event_id, email_template, participant_ids } = await req.json();
    console.log("Processing event:", event_id, "Selective participants:", participant_ids?.length || "all");

    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify user is the event organizer - include module and professional template
    const { data: event } = await supabase
      .from("events")
      .select("name, email_template, organizer_id, module, language")
      .eq("id", event_id)
      .single();
    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isProfessional = event.module === 'professional';
    console.log("Event type:", isProfessional ? "Professional" : "Social");

    if (event.organizer_id !== user.id) {
      console.log("User is not the organizer. User:", user.id, "Organizer:", event.organizer_id);
      return new Response(
        JSON.stringify({ error: "Forbidden - You are not the organizer of this event" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authorization verified - user is event organizer");

    const defaultTpl = event.language === 'en' ? DEFAULT_TEMPLATE_EN : DEFAULT_TEMPLATE;
    const communicationTemplate = (event.email_template as any)?.communication_templates_v2 || null;
    const template: EmailTemplate = !isProfessional && communicationTemplate?.matches
      ? {
          withMatches: {
            subject: communicationTemplate.matches.subject || defaultTpl.withMatches.subject,
            greeting: communicationTemplate.matches.greeting || defaultTpl.withMatches.greeting,
            intro: communicationTemplate.matches.intro || defaultTpl.withMatches.intro,
            friendshipTitle: communicationTemplate.matches.extraFields?.friendshipTitle || defaultTpl.withMatches.friendshipTitle,
            datingTitle: communicationTemplate.matches.extraFields?.datingTitle || defaultTpl.withMatches.datingTitle,
            closing: communicationTemplate.matches.closing || defaultTpl.withMatches.closing,
            signature: communicationTemplate.matches.signature || defaultTpl.withMatches.signature,
          },
          withoutMatches: {
            subject: communicationTemplate.matches_without?.subject || defaultTpl.withoutMatches.subject,
            greeting: communicationTemplate.matches_without?.greeting || defaultTpl.withoutMatches.greeting,
            message: communicationTemplate.matches_without?.message || defaultTpl.withoutMatches.message,
            closing: communicationTemplate.matches_without?.closing || defaultTpl.withoutMatches.closing,
            signature: communicationTemplate.matches_without?.signature || defaultTpl.withoutMatches.signature,
          },
          primaryColor: communicationTemplate.primaryColor || defaultTpl.primaryColor,
        }
      : (email_template || (event.email_template as EmailTemplate) || defaultTpl);
    const socialBranding = {
      primaryColor: communicationTemplate?.primaryColor || template.primaryColor,
      logoUrl: communicationTemplate?.logoUrl || null,
      brandName: communicationTemplate?.brandName || null,
      headerTitle: communicationTemplate?.headerTitle || (event.language === 'en' ? 'Welcome to the event!' : '¡Bienvenido/a al evento!'),
      logoHeight: Number.isFinite(Number(communicationTemplate?.logoHeight)) ? Number(communicationTemplate.logoHeight) : 48,
    };
    const professionalTemplate: ProfessionalEmailTemplate = DEFAULT_PROFESSIONAL_TEMPLATE;
    
    // Get participants - either all or specific ones
    interface BaseParticipant {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }
    interface ProfessionalParticipant extends BaseParticipant {
      company_name: string | null;
      entity_type: string | null;
      sector: string | null;
    }

    let participants: (BaseParticipant | ProfessionalParticipant)[] = [];
    
    if (isProfessional) {
      let query = supabase
        .from("participants")
        .select("id, name, email, phone, company_name, entity_type, sector")
        .eq("event_id", event_id);
      if (participant_ids && participant_ids.length > 0) {
        query = query.in("id", participant_ids);
      }
      const { data } = await query;
      participants = (data || []) as ProfessionalParticipant[];
    } else {
      let query = supabase
        .from("participants")
        .select("id, name, email, phone")
        .eq("event_id", event_id);
      if (participant_ids && participant_ids.length > 0) {
        query = query.in("id", participant_ids);
      }
      const { data } = await query;
      participants = (data || []) as BaseParticipant[];
    }
    
    // For social events, get selections for mutual match calculation
    const { data: selections } = await supabase.from("participant_selections").select("selector_id, selected_id, selection_type").eq("event_id", event_id);
    
    // For professional events, get table assignments to find connections
    const { data: tableAssignments } = isProfessional 
      ? await supabase.from("table_assignments").select("participant_id, table_number, round").eq("event_id", event_id)
      : { data: null };

    // Get all participants for match/connection calculation (even if sending to subset)
    let allParticipantsMap = new Map<string, ProfessionalParticipant>();
    if (isProfessional) {
      const { data: allProf } = await supabase
        .from("participants")
        .select("id, name, email, phone, company_name, entity_type, sector")
        .eq("event_id", event_id);
      (allProf || []).forEach((p: any) => allParticipantsMap.set(p.id, p as ProfessionalParticipant));
    }

    const { data: allParticipants } = await supabase.from("participants").select("id, name, email, phone").eq("event_id", event_id);

    // For professional events: build connections based on table assignments (who shared a table)
    const connectionsByParticipant = new Map<string, { company: string; sector: string; contactPerson: string; phone: string | null; entityType: string }[]>();
    
    if (isProfessional && tableAssignments) {
      // Group assignments by table+round
      const tableGroups = new Map<string, string[]>();
      for (const ta of tableAssignments) {
        const key = `${ta.table_number}-${ta.round}`;
        if (!tableGroups.has(key)) tableGroups.set(key, []);
        tableGroups.get(key)!.push(ta.participant_id);
      }
      
      // For each group, create connections between participants
      for (const [_, participantIds] of tableGroups) {
        if (participantIds.length < 2) continue;
        for (let i = 0; i < participantIds.length; i++) {
          for (let j = i + 1; j < participantIds.length; j++) {
            const p1 = allParticipantsMap.get(participantIds[i]);
            const p2 = allParticipantsMap.get(participantIds[j]);
            if (!p1 || !p2) continue;
            
            // Add p2 as connection for p1
            if (!connectionsByParticipant.has(p1.id)) connectionsByParticipant.set(p1.id, []);
            const existing1 = connectionsByParticipant.get(p1.id)!;
            if (!existing1.some(c => c.contactPerson === p2.name && c.company === (p2.company_name || ''))) {
              existing1.push({
                company: p2.company_name || 'N/A',
                sector: p2.sector || 'N/A',
                contactPerson: p2.name,
                phone: p2.phone,
                entityType: p2.entity_type || 'client'
              });
            }
            
            // Add p1 as connection for p2
            if (!connectionsByParticipant.has(p2.id)) connectionsByParticipant.set(p2.id, []);
            const existing2 = connectionsByParticipant.get(p2.id)!;
            if (!existing2.some(c => c.contactPerson === p1.name && c.company === (p1.company_name || ''))) {
              existing2.push({
                company: p1.company_name || 'N/A',
                sector: p1.sector || 'N/A',
                contactPerson: p1.name,
                phone: p1.phone,
                entityType: p1.entity_type || 'client'
              });
            }
          }
        }
      }
    }

    // Find mutual matches (for social events)
    const matchesByParticipant = new Map<string, { friendship: { name: string; phone: string | null; email: string | null }[]; dating: { name: string; phone: string | null; email: string | null }[] }>();
    const processed = new Set<string>();

    if (!isProfessional) {
      for (const sel of selections || []) {
        const key = [sel.selector_id, sel.selected_id].sort().join('-');
        if (processed.has(key)) continue;
        const reverse = selections?.find(s => s.selector_id === sel.selected_id && s.selected_id === sel.selector_id);
        if (reverse) {
          const sel1Type = sel.selection_type || 'friendship';
          const sel2Type = reverse.selection_type || 'friendship';
          const matchedWith = allParticipants?.find(p => p.id === sel.selected_id);
          const selector = allParticipants?.find(p => p.id === sel.selector_id);
          if (matchedWith && selector) {
            const hasFriendship = (sel1Type === 'friendship' || sel1Type === 'both') && (sel2Type === 'friendship' || sel2Type === 'both');
            const hasDating = (sel1Type === 'dating' || sel1Type === 'both') && (sel2Type === 'dating' || sel2Type === 'both');
            
            if (!matchesByParticipant.has(sel.selector_id)) matchesByParticipant.set(sel.selector_id, { friendship: [], dating: [] });
            if (!matchesByParticipant.has(sel.selected_id)) matchesByParticipant.set(sel.selected_id, { friendship: [], dating: [] });
            
            if (hasFriendship) {
              matchesByParticipant.get(sel.selector_id)!.friendship.push({ name: matchedWith.name, phone: matchedWith.phone, email: matchedWith.email });
              matchesByParticipant.get(sel.selected_id)!.friendship.push({ name: selector.name, phone: selector.phone, email: selector.email });
            }
            if (hasDating) {
              matchesByParticipant.get(sel.selector_id)!.dating.push({ name: matchedWith.name, phone: matchedWith.phone, email: matchedWith.email });
              matchesByParticipant.get(sel.selected_id)!.dating.push({ name: selector.name, phone: selector.phone, email: selector.email });
            }
          }
          processed.add(key);
        }
      }
    }

    // Load organizer branding for white-label emails
    const orgBranding = event.organizer_id ? await getOrganizerBranding(supabase, event.organizer_id) : null;

    const stats = { total: 0, withMatches: 0, withoutMatches: 0, noEmail: 0, failed: 0 };
    const errors: string[] = [];

    console.log(`Starting to send emails to ${participants.length} participants with rate limiting...`);
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      stats.total++;
      
      if (!participant.email) { 
        stats.noEmail++; 
        continue; 
      }

      let subject: string;
      let html: string;

      if (isProfessional) {
        const profParticipant = participant as ProfessionalParticipant;
        const connections = connectionsByParticipant.get(participant.id) || [];
        const hasConnections = connections.length > 0;
        
        subject = hasConnections
          ? replaceVariables(professionalTemplate.withConnections.subject, { nombre: participant.name, empresa: profParticipant.company_name || '', evento: event.name })
          : replaceVariables(professionalTemplate.withoutConnections.subject, { nombre: participant.name, empresa: profParticipant.company_name || '', evento: event.name });
        
        html = generateProfessionalEmailHtml(
          professionalTemplate,
          participant.name,
          profParticipant.company_name || '',
          event.name,
          connections,
          orgBranding || undefined
        );
        
        if (hasConnections) stats.withMatches++;
        else stats.withoutMatches++;
      } else {
        // Social event: use matches and social template
        const pm = matchesByParticipant.get(participant.id);
        const friendshipMatches = pm?.friendship || [];
        const datingMatches = pm?.dating || [];
        const hasMatches = friendshipMatches.length > 0 || datingMatches.length > 0;
        
        subject = hasMatches 
          ? replaceVariables(template.withMatches.subject, { nombre: participant.name, evento: event.name }) 
          : replaceVariables(template.withoutMatches.subject, { nombre: participant.name, evento: event.name });
        html = generateEmailHtml(template, participant.name, event.name, friendshipMatches, datingMatches, orgBranding || undefined);
        
        if (hasMatches) stats.withMatches++;
        else stats.withoutMatches++;
      }

      // Determine sender and API key: organizer's own Resend or platform default
      let fromAddress = "Konektum <hola@konektum.com>";
      let emailApiKey = resendApiKey;
      if (event.organizer_id) {
        const orgConfig = await getOrganizerResendConfig(supabase, event.organizer_id);
        if (orgConfig) {
          fromAddress = orgConfig.from;
          emailApiKey = orgConfig.apiKey;
          console.log(`Using organizer's own Resend config: ${fromAddress}`);
        }
      }

      const result = await sendEmailWithRetry(
        emailApiKey,
        { from: fromAddress, to: [participant.email], subject, html },
        participant.name
      );

      // Log the result to email_logs table
      await logEmailResult(
        supabase,
        event_id,
        participant.id,
        isProfessional ? 'connection' : 'match',
        result.success ? 'sent' : 'failed',
        result.error
      );

      if (!result.success) {
        errors.push(`${participant.name}: ${result.error}`);
        stats.failed++;
      }

      // Rate limiting: wait between emails (except for the last one)
      if (i < participants.length - 1) {
        await delay(DELAY_BETWEEN_EMAILS);
      }
      
      // Log progress every 10 emails
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${participants.length} emails processed`);
      }
    }

    // Only update emails_sent_at if sending to all participants
    if (!participant_ids || participant_ids.length === 0) {
      await supabase.from("events").update({ emails_sent_at: new Date().toISOString() }).eq("id", event_id);
    }
    console.log("Email sending completed:", stats);

    return new Response(JSON.stringify({ success: true, stats, errors: errors.length > 0 ? errors : undefined }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
