import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiUrl } from "./api-config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Converte URL relativa para absoluta se necessário
  const fullUrl = url.startsWith('http') ? url : apiUrl(url);
  
  console.log(`Fazendo requisição ${method} para: ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    mode: 'cors',
    credentials: 'omit', // Não enviar credenciais para evitar problemas de CORS
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Processa o queryKey para garantir URL completa
    let url = queryKey[0] as string;
    if (!url.startsWith('http')) {
      url = apiUrl(url);
    }
    
    console.log(`Query request para: ${url}`);
    
    const res = await fetch(url, {
      mode: 'cors',
      credentials: 'omit', // Não enviar credenciais para evitar problemas de CORS
      headers: {
        'Accept': 'application/json'
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
