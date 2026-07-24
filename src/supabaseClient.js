import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://czgrwwoqarrlihsoeqov.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z3J3d29xYXJybGloc29lcW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NDQwOTcsImV4cCI6MjEwMDQyMDA5N30.UIM_ZDv1qb56HMo1tGv4PRJ2hXwh1U5SbLI6Dv1p2ZE'
)
