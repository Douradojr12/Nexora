// Roteador por hash (#/rota). Funciona sem servidor de rotas.
export function createRouter(routes, onChange) {
  const resolve = () => {
    const id = location.hash.replace(/^#\//, '') || 'painel';
    const route = routes.find(r => r.id === id) || routes[0];
    onChange(route);
  };
  addEventListener('hashchange', resolve);
  return { start: resolve };
}
