
UPDATE public.events
SET email_template = jsonb_set(
  email_template,
  '{communication_templates_v2,crush_mutual,intro}',
  to_jsonb(
    replace(
      replace(
        replace(
          email_template #>> '{communication_templates_v2,crush_mutual,intro}',
          '{{contactoEmail}}', '{{contactoTelefono}}'
        ),
        'email de contacto', 'teléfono de contacto'
      ),
      'contact email', 'contact phone'
    )
  )
)
WHERE email_template #> '{communication_templates_v2,crush_mutual,intro}' IS NOT NULL
  AND email_template #>> '{communication_templates_v2,crush_mutual,intro}' LIKE '%contactoEmail%';
