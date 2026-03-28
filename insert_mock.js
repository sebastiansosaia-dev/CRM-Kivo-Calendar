import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('citas').insert([
    {
      cliente_nombre: 'Miguel Animation Test',
      cliente_contacto: '+504 9999-0000',
      fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
      fecha_fin: new Date(Date.now() + 90000000).toISOString(),
      motivo: 'Prueba de animaciones modales',
      status: 'pendiente'
    }
  ]);
  if (error) console.error('Error inserting:', error);
  else console.log('Successfully inserted pending appointment.');
  process.exit(0);
}
run();
