import { useEffect } from 'react';

/**
 * Hook que faz scroll até o topo da página quando o componente é montado
 */
export function useScrollTop() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Para rolagem suave
    });
  }, []);
}