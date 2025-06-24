import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { 
  Users, 
  Shield, 
  Globe, 
  Smartphone, 
  Laptop, 
  Clock,
  MapPin,
  RefreshCw
} from 'lucide-react';

// Cores para uso nos gráficos
const COLORS = ['#E83D22', '#FF6B3B', '#FF9B64', '#FFCC99', '#3B82F6', '#60A5FA', '#93C5FD'];
const DANGER_COLORS = ['#E83D22', '#ef4444', '#f87171'];
const SUCCESS_COLORS = ['#10b981', '#34d399', '#6ee7b7'];

interface DashboardStats {
  onlineUsers: number;
  totalVisits: number;
  bannedIPs: number;
  allowedDomains: number;
}

interface BannedIP {
  ip: string;
  userAgent: string;
  device: string;
  browserInfo: string;
  platform: string;
  location: string;
  reason: string;
  timestamp: string;
}

interface AccessSource {
  source: string;
  count: number;
}

interface UserDevice {
  type: string;
  count: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    onlineUsers: 0,
    totalVisits: 0,
    bannedIPs: 0,
    allowedDomains: 0
  });
  
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [accessSources, setAccessSources] = useState<AccessSource[]>([]);
  const [deviceStats, setDeviceStats] = useState<UserDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Estabelecer conexão WebSocket
  useEffect(() => {
    // Determinar o protocolo (ws ou wss dependendo se estamos em http ou https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Em produção, conectar ao backend Heroku
    // Em desenvolvimento, conectar ao servidor local
    let wsUrl;
    
    if (window.location.hostname.includes('netlify')) {
      // Se estiver rodando no Netlify, conecte ao backend Heroku
      wsUrl = 'wss://disparador-f065362693d3.herokuapp.com/ws';
      console.log('Conectando ao WebSocket de produção (Heroku):', wsUrl);
    } else {
      // Em desenvolvimento, conecte ao servidor local
      wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Conectando ao WebSocket de desenvolvimento (local):', wsUrl);
    }
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connection established');
      // Solicitar dados iniciais
      newSocket.send(JSON.stringify({ type: 'get_dashboard_data' }));
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'dashboard_stats') {
          setStats(data.stats);
          setLastUpdate(new Date());
        } else if (data.type === 'banned_ips') {
          setBannedIPs(data.ips);
        } else if (data.type === 'access_sources') {
          setAccessSources(data.sources);
        } else if (data.type === 'device_stats') {
          setDeviceStats(data.devices);
        } else if (data.type === 'ip_banned') {
          // Atualizar a lista de IPs banidos quando um novo IP é banido
          setBannedIPs(prevIPs => [data.ip, ...prevIPs].slice(0, 50));
          // Atualizar estatísticas
          setStats(prev => ({...prev, bannedIPs: prev.bannedIPs + 1}));
        } else if (data.type === 'user_connected') {
          // Atualizar contagem de usuários online
          setStats(prev => ({...prev, onlineUsers: data.count}));
        } else if (data.type === 'initial_data') {
          // Receber todos os dados de uma vez
          setStats(data.stats);
          setBannedIPs(data.bannedIPs);
          setAccessSources(data.accessSources);
          setDeviceStats(data.deviceStats);
          setIsLoading(false);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    newSocket.onclose = () => {
      console.log('WebSocket connection closed');
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        setSocket(null);
      }, 5000);
    };
    
    setSocket(newSocket);
    
    // Cleanup da conexão WebSocket
    return () => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, []);

  // Função para solicitar atualização manual dos dados
  const refreshData = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'get_dashboard_data' }));
      setLastUpdate(new Date());
    }
  };

  // Formatação de data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FDE80F]">
        <div className="text-center">
          <img 
            src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
            alt="Mercado Libre"
            className="h-16 w-auto object-contain mx-auto mb-6"
          />
          <div className="inline-block h-12 w-12 border-4 border-t-[#3483FA] border-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-semibold text-[#3483FA] font-loewe-next-heading">Carregando dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard de Monitoramento</h1>
            <p className="text-gray-500">
              Última atualização: {formatDate(lastUpdate)}
            </p>
          </div>
          <Button 
            onClick={refreshData}
            className="flex items-center gap-2 bg-[#E83D22] hover:bg-[#d73920]"
          >
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Usuários Online</p>
                <h3 className="text-2xl font-bold">{stats.onlineUsers}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total de Visitas</p>
                <h3 className="text-2xl font-bold">{stats.totalVisits}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-100">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">IPs Banidos</p>
                <h3 className="text-2xl font-bold">{stats.bannedIPs}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Domínios Permitidos</p>
                <h3 className="text-2xl font-bold">{stats.allowedDomains}</h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Gráficos e tabelas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Origens de Acesso */}
          <Card className="p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-4">Origens de Acesso</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={accessSources}
                  margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="source" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value} visitas`, 'Total']}
                  />
                  <Bar dataKey="count" fill="#E83D22" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          {/* Gráfico de Dispositivos */}
          <Card className="p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-4">Dispositivos</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceStats}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} usuários`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tabela de IPs Banidos */}
        <Card className="p-4 shadow-md mb-8">
          <h2 className="text-lg font-semibold mb-4">IPs Banidos em Tempo Real</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Dispositivo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Navegador</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sistema</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Localização</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bannedIPs.length > 0 ? (
                  bannedIPs.map((ip, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{ip.ip}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ip.device}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ip.browserInfo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ip.platform}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ip.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ip.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-center text-gray-500">
                      Nenhum IP banido encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;