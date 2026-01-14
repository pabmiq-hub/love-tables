import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const replaceVariables = (text: string, variables: Record<string, string>) => {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
};

const generateEmailHtml = (
  template: EmailTemplate,
  name: string,
  eventName: string,
  friendshipMatches: { name: string; phone: string | null }[],
  datingMatches: { name: string; phone: string | null }[]
): string => {
  const hasMatches = friendshipMatches.length > 0 || datingMatches.length > 0;
  const variables = { nombre: name, evento: eventName };
  
  if (hasMatches) {
    const t = template.withMatches;
    const friendshipList = friendshipMatches.length > 0 
      ? `<div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;"><h3 style="margin:0 0 12px 0;">${t.friendshipTitle}</h3><ul style="margin:0;padding-left:20px;">${friendshipMatches.map(m => `<li>${m.name}${m.phone ? ` - 📞 ${m.phone}` : ''}</li>`).join('')}</ul></div>` : '';
    const datingList = datingMatches.length > 0
      ? `<div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;"><h3 style="margin:0 0 12px 0;">${t.datingTitle}</h3><ul style="margin:0;padding-left:20px;">${datingMatches.map(m => `<li>${m.name}${m.phone ? ` - 📞 ${m.phone}` : ''}</li>`).join('')}</ul></div>` : '';
    
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="text-align:center;padding-bottom:20px;border-bottom:1px solid #eee;"><h2 style="color:#e11d48;">Konektum</h2></div><h1>${replaceVariables(t.greeting, variables)}</h1><p>${replaceVariables(t.intro, variables)}</p>${friendshipList}${datingList}<p>${replaceVariables(t.closing, variables)}</p><p style="color:#888;white-space:pre-line;">${t.signature}</p></body></html>`;
  } else {
    const t = template.withoutMatches;
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="text-align:center;padding-bottom:20px;border-bottom:1px solid #eee;"><h2 style="color:#e11d48;">Konektum</h2></div><h1>${replaceVariables(t.greeting, variables)}</h1><p style="white-space:pre-line;">${replaceVariables(t.message, variables)}</p><p>${replaceVariables(t.closing, variables)}</p><p style="color:#888;white-space:pre-line;">${t.signature}</p></body></html>`;
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

    const { event_id, email_template } = await req.json();
    console.log("Processing event:", event_id);

    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify user is the event organizer
    const { data: event } = await supabase.from("events").select("name, email_template, organizer_id").eq("id", event_id).single();
    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (event.organizer_id !== user.id) {
      console.log("User is not the organizer. User:", user.id, "Organizer:", event.organizer_id);
      return new Response(
        JSON.stringify({ error: "Forbidden - You are not the organizer of this event" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authorization verified - user is event organizer");

    const template: EmailTemplate = email_template || (event.email_template as EmailTemplate) || DEFAULT_TEMPLATE;
    const { data: participants } = await supabase.from("participants").select("id, name, email, phone").eq("event_id", event_id);
    const { data: selections } = await supabase.from("participant_selections").select("selector_id, selected_id, selection_type").eq("event_id", event_id);

    // Find mutual matches
    const matchesByParticipant = new Map<string, { friendship: { name: string; phone: string | null }[]; dating: { name: string; phone: string | null }[] }>();
    const processed = new Set<string>();

    for (const sel of selections || []) {
      const key = [sel.selector_id, sel.selected_id].sort().join('-');
      if (processed.has(key)) continue;
      const reverse = selections?.find(s => s.selector_id === sel.selected_id && s.selected_id === sel.selector_id);
      if (reverse) {
        const sel1Type = sel.selection_type || 'friendship';
        const sel2Type = reverse.selection_type || 'friendship';
        const matchedWith = participants?.find(p => p.id === sel.selected_id);
        const selector = participants?.find(p => p.id === sel.selector_id);
        if (matchedWith && selector) {
          const hasFriendship = (sel1Type === 'friendship' || sel1Type === 'both') && (sel2Type === 'friendship' || sel2Type === 'both');
          const hasDating = (sel1Type === 'dating' || sel1Type === 'both') && (sel2Type === 'dating' || sel2Type === 'both');
          
          if (!matchesByParticipant.has(sel.selector_id)) matchesByParticipant.set(sel.selector_id, { friendship: [], dating: [] });
          if (!matchesByParticipant.has(sel.selected_id)) matchesByParticipant.set(sel.selected_id, { friendship: [], dating: [] });
          
          if (hasFriendship) {
            matchesByParticipant.get(sel.selector_id)!.friendship.push({ name: matchedWith.name, phone: matchedWith.phone });
            matchesByParticipant.get(sel.selected_id)!.friendship.push({ name: selector.name, phone: selector.phone });
          }
          if (hasDating) {
            matchesByParticipant.get(sel.selector_id)!.dating.push({ name: matchedWith.name, phone: matchedWith.phone });
            matchesByParticipant.get(sel.selected_id)!.dating.push({ name: selector.name, phone: selector.phone });
          }
        }
        processed.add(key);
      }
    }

    const stats = { total: 0, withMatches: 0, withoutMatches: 0, noEmail: 0, failed: 0 };
    const errors: string[] = [];

    for (const participant of participants || []) {
      stats.total++;
      if (!participant.email) { stats.noEmail++; continue; }

      const pm = matchesByParticipant.get(participant.id);
      const friendshipMatches = pm?.friendship || [];
      const datingMatches = pm?.dating || [];
      const hasMatches = friendshipMatches.length > 0 || datingMatches.length > 0;
      const subject = hasMatches ? replaceVariables(template.withMatches.subject, { nombre: participant.name, evento: event.name }) : replaceVariables(template.withoutMatches.subject, { nombre: participant.name, evento: event.name });
      const html = generateEmailHtml(template, participant.name, event.name, friendshipMatches, datingMatches);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "Konektum <hola@konektum.com>", to: [participant.email], subject, html }),
        });
        if (res.ok) { hasMatches ? stats.withMatches++ : stats.withoutMatches++; }
        else { const err = await res.text(); errors.push(`${participant.name}: ${err}`); stats.failed++; }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`${participant.name}: ${errMsg}`); stats.failed++;
      }
    }

    await supabase.from("events").update({ emails_sent_at: new Date().toISOString() }).eq("id", event_id);
    console.log("Email sending completed:", stats);

    return new Response(JSON.stringify({ success: true, stats, errors: errors.length > 0 ? errors : undefined }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
