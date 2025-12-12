import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase client instance for authentication and database operations.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
let supabase = null

if (!supabaseUrl || !supabaseKey) {
    console.error(
        'Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. ' +
        'Authentication will not work.'
    )
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey)
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error)
    }
}

export { supabase }
