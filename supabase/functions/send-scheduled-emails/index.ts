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

// Rate limiting helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const DELAY_BETWEEN_EMAILS = 550; // 550ms = ~1.8 emails/sec (under 2/sec limit)
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-scheduled-emails function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Find events with scheduled emails that are due
    const now = new Date().toISOString();
    console.log("Checking for scheduled emails at:", now);

    const { data: eventsToProcess, error: eventsError } = await supabase
      .from("events")
      .select("id, name, email_template, scheduled_email_at")
      .not("scheduled_email_at", "is", null)
      .is("emails_sent_at", null)
      .lte("scheduled_email_at", now);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${eventsToProcess?.length || 0} events to process`);

    const results: { eventId: string; eventName: string; stats: any; errors?: string[] }[] = [];

    for (const event of eventsToProcess || []) {
      console.log(`Processing event: ${event.name} (${event.id})`);
      
      const template: EmailTemplate = (event.email_template as EmailTemplate) || DEFAULT_TEMPLATE;
      
      const { data: participants } = await supabase
        .from("participants")
        .select("id, name, email, phone")
        .eq("event_id", event.id);
      
      const { data: selections } = await supabase
        .from("participant_selections")
        .select("selector_id, selected_id, selection_type")
        .eq("event_id", event.id);

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

      console.log(`Starting to send emails to ${participants?.length || 0} participants with rate limiting...`);

      for (let i = 0; i < (participants || []).length; i++) {
        const participant = participants![i];
        stats.total++;
        
        if (!participant.email) { 
          stats.noEmail++; 
          continue; 
        }

        const pm = matchesByParticipant.get(participant.id);
        const friendshipMatches = pm?.friendship || [];
        const datingMatches = pm?.dating || [];
        const hasMatches = friendshipMatches.length > 0 || datingMatches.length > 0;
        const subject = hasMatches 
          ? replaceVariables(template.withMatches.subject, { nombre: participant.name, evento: event.name }) 
          : replaceVariables(template.withoutMatches.subject, { nombre: participant.name, evento: event.name });
        const html = generateEmailHtml(template, participant.name, event.name, friendshipMatches, datingMatches);

        const result = await sendEmailWithRetry(
          resendApiKey,
          { from: "Konektum <hola@konektum.com>", to: [participant.email], subject, html },
          participant.name
        );

        if (result.success) {
          hasMatches ? stats.withMatches++ : stats.withoutMatches++;
        } else {
          errors.push(`${participant.name}: ${result.error}`);
          stats.failed++;
        }

        // Rate limiting: wait between emails (except for the last one)
        if (i < (participants || []).length - 1) {
          await delay(DELAY_BETWEEN_EMAILS);
        }
        
        // Log progress every 10 emails
        if ((i + 1) % 10 === 0) {
          console.log(`Progress: ${i + 1}/${participants?.length} emails processed for event ${event.name}`);
        }
      }

      // Mark event as emails sent and clear scheduled_email_at
      await supabase
        .from("events")
        .update({ 
          emails_sent_at: new Date().toISOString(),
          scheduled_email_at: null 
        })
        .eq("id", event.id);

      console.log(`Event ${event.name} completed:`, stats);
      results.push({ eventId: event.id, eventName: event.name, stats, errors: errors.length > 0 ? errors : undefined });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
};

serve(handler);
