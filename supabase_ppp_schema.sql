-- Table for storing PPP Bilans
create table if not exists public.ppp_bilans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  
  patient_name text not null,
  pharmacist_name text not null,
  pharmacy_name text not null,
  ppp_date text not null,
  age_range text not null,
  
  image_url text, -- Base64 storage implies text/large text. For production, consider storage bucket + link.
  notes text,
  
  -- JSON arrays stored as text[] or jsonb
  insights text[] default '{}',
  priorities text[] default '{}',
  freins text[] default '{}',
  conseils text[] default '{}',
  ressources text[] default '{}',
  suivi text[] default '{}',
  
  oppose_medecin boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.ppp_bilans enable row level security;

-- Policies
create policy "Users can view their own PPPs"
  on public.ppp_bilans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own PPPs"
  on public.ppp_bilans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own PPPs"
  on public.ppp_bilans for update
  using (auth.uid() = user_id);

create policy "Users can delete their own PPPs"
  on public.ppp_bilans for delete
  using (auth.uid() = user_id);
