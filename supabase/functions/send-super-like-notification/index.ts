import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, recipientId } = await req.json();
    
    if (!eventId || !recipientId) {
      return new Response(
        JSON.stringify({ error: 'Missing eventId or recipientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get event info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, language, email_template, organizer_id, super_like_enabled')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!event.super_like_enabled) {
      return new Response(
        JSON.stringify({ error: 'Super like not enabled for this event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient info
    const { data: recipient, error: recipientError } = await supabase
      .from('participants')
      .select('id, name, email')
      .eq('id', recipientId)
      .eq('event_id', eventId)
      .single();

    if (recipientError || !recipient || !recipient.email) {
      return new Response(
        JSON.stringify({ error: 'Recipient not found or has no email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isEn = event.language === 'en';

    // Read customized template from event
    const emailTemplate = event.email_template as any;
    const communicationTemplate = emailTemplate?.communication_templates_v2 || emailTemplate || {};
    const tpl = communicationTemplate?.super_like;
    const primaryColor = communicationTemplate?.primaryColor || emailTemplate?.primaryColor || '#e11d48';
    const logoUrl = communicationTemplate?.logoUrl || emailTemplate?.logoUrl || 'https://konektum.com/konektum-logo.png';
    const brandName = communicationTemplate?.brandName || emailTemplate?.brandName || 'Konektum';
    const headerTitle = communicationTemplate?.headerTitle || (isEn ? "Welcome to the event!" : "¡Bienvenido/a al evento!");
    const rawLogoHeight = Number(communicationTemplate?.logoHeight ?? emailTemplate?.logoHeight ?? 48);
    const logoHeight = Number.isFinite(rawLogoHeight) ? Math.min(120, Math.max(24, rawLogoHeight)) : 48;

    // Template variables
    const vars: Record<string, string> = {
      "{{nombre}}": recipient.name,
      "{{evento}}": event.name,
    };

    const subject = tpl?.subject
      ? replaceVariables(tpl.subject, vars)
      : (isEn ? `✨ Someone selected you at ${event.name}!` : `✨ ¡Alguien te ha seleccionado en ${event.name}!`);

    const greeting = tpl?.greeting
      ? replaceVariables(tpl.greeting, vars)
      : (isEn ? `Hi ${recipient.name}! ✨` : `¡Hola ${recipient.name}! ✨`);

    const intro = tpl?.intro
      ? replaceVariables(tpl.intro, vars)
      : (isEn
        ? `Someone at your event chose you with a Super Like! Don't miss the chance to find out if it's a match.\n\nGo to your participant panel and submit your selections.`
        : `¡Alguien de tu evento te ha elegido con un Super Like! No pierdas la oportunidad de descubrir si hay match.\n\nEntra en tu panel de participante y envía tus selecciones.`);

    const closing = tpl?.closing
      ? replaceVariables(tpl.closing, vars)
      : (isEn ? `The best connections start with a simple step!` : `¡Las mejores conexiones empiezan con un simple paso!`);

    const signature = tpl?.signature
      ? replaceVariables(tpl.signature, vars)
      : (isEn ? `With love,\nThe ${brandName} Team 💕` : `Con cariño,\nEl equipo de ${brandName} 💕`);

    // Determine sender
    let senderFrom = `${brandName} <noreply@konektum.com>`;
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    if (event.organizer_id) {
      const { data: orgData } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', event.organizer_id)
        .single();

      if (orgData) {
        const { data: resendConfig } = await supabase
          .from('organizer_resend_config')
          .select('sender_email, sender_name')
          .eq('organizer_id', orgData.id)
          .eq('is_verified', true)
          .maybeSingle();

        if (resendConfig) {
          senderFrom = `${resendConfig.sender_name || brandName} <${resendConfig.sender_email}>`;
        }
      }
    }

    const accessUrl = `https://konektum.com/event/${eventId}/access`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#f5f5f5;">
  <div style="background:${primaryColor};padding:30px;border-radius:10px 10px 0 0;text-align:center;">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(brandName)}" style="max-height:40px;max-width:200px;margin-bottom:12px;" />` : ''}
    <h1 style="color:white;margin:0;font-size:24px;">⭐ Super Like</h1>
  </div>
  
  <div style="background:white;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size:18px;margin-bottom:20px;">${nl2br(greeting)}</p>
    
    <div style="color:#555;font-size:16px;line-height:1.6;margin-bottom:20px;">
      ${nl2br(intro)}
    </div>
    
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:#f8f9fa;border-radius:12px;padding:20px 32px;">
        <div style="font-size:48px;margin-bottom:8px;">⭐</div>
        <p style="font-size:14px;font-weight:600;color:#52525b;margin:0;">${isEn ? 'Someone gave you a Super Like!' : '¡Alguien te ha dado un Super Like!'}</p>
      </div>
    </div>
    
    <div style="text-align:center;margin:24px 0;">
      <a href="${accessUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        ${isEn ? 'Submit my selections' : 'Enviar mis selecciones'}
      </a>
    </div>
    
    <p style="color:#888;font-size:14px;text-align:center;">${nl2br(closing)}</p>
  </div>
  
  <div style="text-align:center;margin-top:20px;color:#888;font-size:12px;">
    <p>${nl2br(signature)}</p>
  </div>
</body>
</html>`;

    // Send email
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderFrom,
        to: [recipient.email],
        subject,
        html: htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error('[send-super-like] Resend error:', errorText);
      
      await supabase.from('email_logs').insert({
        event_id: eventId,
        participant_id: recipientId,
        email_type: 'super_like_notification',
        status: 'failed',
        error_message: errorText,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('email_logs').insert({
      event_id: eventId,
      participant_id: recipientId,
      email_type: 'super_like_notification',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    console.log(`[send-super-like] Notification sent to ${recipient.name} (${recipient.email})`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-super-like] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
