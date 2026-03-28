import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://levmgulwuuczsaphnlmf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxldm1ndWx3dXVjenNhcGhubG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mzc1OTYsImV4cCI6MjA4ODQxMzU5Nn0.wMV2BlOtFGzTtJsodRnHfOsQ3FywX_XE7IJInlyuIvY');
async function run() {
  const { data, error } = await supabase.from('citas').insert([{
      cliente_nombre: 'Miguel Animation Test',
      cliente_contacto: '+504 9999-0000',
      fecha_inicio: new Date(Date.now() + 86400000).toISOString(),
      fecha_fin: new Date(Date.now() + 90000000).toISOString(),
      motivo: 'Prueba de animaciones modales',
      status: 'pendiente'
  }]);
  console.log(error || 'Success');
  process.exit(0);
}
run();
