// Servidor de contas e sincronização (Supabase). Com os dois campos vazios, o Nexora funciona só neste navegador, sem login.
// A chave abaixo é a chave PÚBLICA do projeto ("publishable"/"anon"): pode ficar no código, pois cada usuário
// só enxerga a própria linha (regras em supabase/schema.sql). Nunca coloque aqui a chave "secret"/"service_role".
export const NUVEM = {
  url: '',   // ex.: https://abcdefgh.supabase.co
  chave: '', // ex.: sb_publishable_... ou eyJ... (anon)
};
