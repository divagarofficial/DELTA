-- Delta Messaging Platform: Mandatory Mobile Number Identity & Phone Authentication Index
-- Enforces mobile number as primary identity for user registration and discovery

-- Ensure unique constraint on phone_number in profiles
create unique index if not exists idx_profiles_phone_unique on public.profiles(phone_number) where phone_number is not null;

-- Helper function to authenticate or find user by phone number or username
create or replace function public.find_profile_by_identity(identifier text)
returns table (
  id uuid,
  username text,
  display_name text,
  phone_number text,
  avatar_url text
) as $$
declare
  cleaned_digits text;
begin
  cleaned_digits := regexp_replace(identifier, '[^0-9]', '', 'g');
  
  if length(cleaned_digits) >= 10 then
    return query
    select p.id, p.username, p.display_name, p.phone_number, p.avatar_url
    from public.profiles p
    where regexp_replace(p.phone_number, '[^0-9]', '', 'g') like ('%' || right(cleaned_digits, 10))
    limit 1;
  else
    return query
    select p.id, p.username, p.display_name, p.phone_number, p.avatar_url
    from public.profiles p
    where lower(p.username) = lower(replace(identifier, '@', ''))
    limit 1;
  end if;
end;
$$ language plpgsql security definer;
