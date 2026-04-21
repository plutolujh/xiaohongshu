import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkNote() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, images')
    .eq('id', '8210c745-a691-4018-945a-36a384f7fc0a')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Note data:', JSON.stringify(data, null, 2))
}

checkNote()
