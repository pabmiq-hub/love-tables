import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate unique 6-digit verification code
async function generateUniqueCode(supabase: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('verification_code', code)
      .maybeSingle();
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Could not generate unique verification code');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId, participantId } = await req.json();

    if (!eventId || !participantId) {
      return new Response(
        JSON.stringify({ error: 'eventId and participantId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get participant
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .select('id, name, email, verification_code, event_id')
      .eq('id', participantId)
      .eq('event_id', eventId)
      .single();

    if (pError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Participante no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate code if doesn't have one
    let code = participant.verification_code;
    if (!code) {
      code = await generateUniqueCode(supabase);
      
      // Save code WITHOUT changing checked_in
      const { error: updateError } = await supabase
        .from('participants')
        .update({ verification_code: code })
        .eq('id', participantId);

      if (updateError) {
        console.error('[generate-and-send-code] Error saving code:', updateError);
        return new Response(
          JSON.stringify({ error: 'Error al guardar el código' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send email if participant has email
    let emailSent = false;
    if (participant.email) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-checkin-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            participantId: participant.id,
            eventId,
            baseUrl: 'https://konektum.com'
          })
        });
        emailSent = emailResponse.ok;
        if (!emailSent) {
          console.warn('[generate-and-send-code] Email send failed');
        }
      } catch (e) {
        console.error('[generate-and-send-code] Error sending email:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationCode: code,
        emailSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-and-send-code] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
