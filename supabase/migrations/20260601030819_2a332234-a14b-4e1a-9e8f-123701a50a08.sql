
-- Remove old trigger + table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Recreate user_profiles per spec
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','bookkeeper','developer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO service_role;

ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Helper to create or fetch an auth user
CREATE OR REPLACE FUNCTION public._seed_user(p_email TEXT, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      p_email, crypt(p_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, jsonb_build_object('sub', v_id::text, 'email', p_email), 'email', v_id::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = v_id;
  END IF;
  RETURN v_id;
END;
$$;

DO $$
DECLARE
  u1 UUID; u2 UUID; u3 UUID; u4 UUID;
BEGIN
  u1 := public._seed_user('Jessica@brantconnects.com', 'Brant2026!');
  u2 := public._seed_user('maricel@brantconnects.com', 'Brant2026!');
  u3 := public._seed_user('info@brantconnects.com', 'Brant2026!');
  u4 := public._seed_user('jerickpsalinas@gmail.com', 'Brant2026!');

  INSERT INTO public.user_profiles (id, name, email, role) VALUES
    (u1, 'Jessica Brant', 'Jessica@brantconnects.com', 'admin'),
    (u2, 'Maricel', 'maricel@brantconnects.com', 'bookkeeper'),
    (u3, 'Sahir', 'info@brantconnects.com', 'bookkeeper'),
    (u4, 'Jerick Salinas', 'jerickpsalinas@gmail.com', 'developer')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;
END $$;

DROP FUNCTION public._seed_user(TEXT, TEXT);
