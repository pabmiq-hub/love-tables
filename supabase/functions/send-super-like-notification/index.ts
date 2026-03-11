import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.error('[send-super-like] Event not found:', eventError);
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
      console.error('[send-super-like] Recipient not found or no email:', recipientError);
      return new Response(
        JSON.stringify({ error: 'Recipient not found or has no email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const isEnglish = event.language === 'en';
    let template = {
      subject: isEnglish
        ? `✨ Someone selected you at ${event.name}!`
        : `✨ ¡Alguien te ha seleccionado en ${event.name}!`,
      greeting: isEnglish
        ? `Hi ${recipient.name}! ✨`
        : `¡Hola ${recipient.name}! ✨`,
      intro: isEnglish
        ? `Someone at your event chose you with a Super Like! Don't miss the chance to find out if it's a match.\n\nGo to your participant panel and submit your selections.`
        : `¡Alguien de tu evento te ha elegido con un Super Like! No pierdas la oportunidad de descubrir si hay match.\n\nEntra en tu panel de participante y envía tus selecciones.`,
      closing: isEnglish
        ? `The best connections start with a simple step!`
        : `¡Las mejores conexiones empiezan con un simple paso!`,
      signature: isEnglish
        ? `With love,\nThe Konektum Team 💕`
        : `Con cariño,\nEl equipo de Konektum 💕`,
    };

    // Check for custom template
    if (event.email_template) {
      const emailTemplate = event.email_template as any;
      const customTemplates = emailTemplate?.communication_templates_v2;
      if (customTemplates?.super_like) {
        const ct = customTemplates.super_like;
        template = {
          subject: (ct.subject || template.subject).replace(/\{\{nombre\}\}/g, recipient.name).replace(/\{\{evento\}\}/g, event.name),
          greeting: (ct.greeting || template.greeting).replace(/\{\{nombre\}\}/g, recipient.name).replace(/\{\{evento\}\}/g, event.name),
          intro: (ct.intro || template.intro).replace(/\{\{nombre\}\}/g, recipient.name).replace(/\{\{evento\}\}/g, event.name),
          closing: (ct.closing || template.closing).replace(/\{\{nombre\}\}/g, recipient.name).replace(/\{\{evento\}\}/g, event.name),
          signature: (ct.signature || template.signature).replace(/\{\{nombre\}\}/g, recipient.name).replace(/\{\{evento\}\}/g, event.name),
        };
      }
    }

    // Get organizer's Resend config
    let senderEmail = 'onboarding@resend.dev';
    let senderName = 'Konektum';
    let resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    if (event.organizer_id) {
      const { data: resendConfig } = await supabase
        .from('organizer_resend_config')
        .select('resend_api_key, sender_email, sender_name')
        .eq('organizer_id', event.organizer_id)
        .single();

      if (resendConfig) {
        resendApiKey = resendConfig.resend_api_key || resendApiKey;
        senderEmail = resendConfig.sender_email || senderEmail;
        senderName = resendConfig.sender_name || senderName;
      }

      // Check verified domain
      const { data: verifiedDomain } = await supabase
        .from('organizer_verified_domains')
        .select('sender_email, sender_name')
        .eq('organizer_id', event.organizer_id)
        .eq('status', 'verified')
        .single();

      if (verifiedDomain) {
        senderEmail = verifiedDomain.sender_email || senderEmail;
        senderName = verifiedDomain.sender_name || senderName;
      }
    }

    // Get branding
    let primaryColor = '#e11d48';
    let logoUrl = '';
    let brandName = 'Konektum';

    if (event.email_template) {
      const et = event.email_template as any;
      const ct = et?.communication_templates_v2;
      if (ct) {
        primaryColor = ct.primaryColor || primaryColor;
        logoUrl = ct.logoUrl || logoUrl;
        brandName = ct.brandName || brandName;
      }
    }

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,${primaryColor},${primaryColor}cc);padding:32px;text-align:center;">
${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="max-height:40px;max-width:160px;margin-bottom:8px;" />` : ''}
<h2 style="color:#ffffff;margin:0;font-size:18px;">${brandName}</h2>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${template.greeting}</h1>
<p style="color:#52525b;line-height:1.6;white-space:pre-line;margin:0 0 16px;">${template.intro}</p>
<div style="text-align:center;margin:24px 0;">
<div style="display:inline-block;background-color:#f8f9fa;border-radius:12px;padding:20px 32px;">
<div style="font-size:48px;margin-bottom:8px;">⭐</div>
<p style="font-size:14px;font-weight:600;color:#52525b;margin:0;">${isEnglish ? 'Someone gave you a Super Like!' : '¡Alguien te ha dado un Super Like!'}</p>
</div>
</div>
<p style="color:#52525b;line-height:1.6;margin:0 0 24px;">${template.closing}</p>
<div style="border-top:1px solid #e4e4e7;padding-top:16px;margin-top:16px;">
<p style="font-size:12px;color:#a1a1aa;white-space:pre-line;margin:0;">${template.signature}</p>
</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [recipient.email],
        subject: template.subject,
        html: htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.error('[send-super-like] Resend error:', errorText);
      
      // Log the failure
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

    // Log success
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
