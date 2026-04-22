-- Recovery: reset password for primary super admin account
UPDATE auth.users
SET encrypted_password = crypt('Kleff123+', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'hola@konektum.com';