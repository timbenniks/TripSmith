import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client configured for SSR-compatible auth (cookies + PKCE)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database types (we'll enhance this later)
export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          user_id: string
          name: string
          destination: string
          travel_dates: string
          purpose: string
          status: 'planning' | 'booked' | 'completed'
          chat_history: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          destination: string
          travel_dates: string
          purpose: string
          status?: 'planning' | 'booked' | 'completed'
          chat_history?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          destination?: string
          travel_dates?: string
          purpose?: string
          status?: 'planning' | 'booked' | 'completed'
          chat_history?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
