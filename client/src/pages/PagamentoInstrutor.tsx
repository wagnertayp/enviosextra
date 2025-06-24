import { FC } from 'react';
import Header from '../components/Header';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

const PagamentoInstrutor: FC = () => {
  const [_, setLocation] = useLocation();

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <div className="w-full bg-[#EE4E2E] py-1 px-6 flex items-center relative overflow-hidden">
        {/* Meia-lua no canto direito */}
        <div className="absolute right-0 top-0 bottom-0 w-32 h-full rounded-l-full bg-[#E83D22]"></div>
        
        <div className="flex items-center relative z-10">
          <div className="text-white mr-3">
            <i className="fas fa-chevron-right text-3xl font-black" style={{color: 'white'}}></i>
          </div>
          <div className="leading-none">
            <h1 className="text-base font-bold text-white mb-0">Pagamento de Honorários</h1>
            <p className="text-white text-sm mt-0" style={{transform: 'translateY(-2px)'}}>Shopee</p>
          </div>
        </div>
      </div>
      
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
            <div className="bg-[#FFF8F6] p-4 border-b border-[#E83D2220]">
              <h3 className="font-semibold text-[#E83D22]">Honorários do Treinamento e Credenciais</h3>
            </div>
            <div className="p-6">
              <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-6">
                <div className="flex items-start">
                  <div className="text-green-500 mr-3 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-green-700">Treinamento Agendado com Sucesso!</h4>
                    <p className="text-sm text-green-600">
                      Seu treinamento foi agendado. Para confirmar, conclua o pagamento abaixo.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-800 mb-3">Detalhes do Pagamento</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-700">Honorários do Instrutor (3 horas de treinamento)</span>
                      <span className="font-medium">R$ 89,90</span>
                    </div>
                    
                    <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-700">Emissão de Crachá Oficial Shopee</span>
                      <span className="font-medium">R$ 29,90</span>
                    </div>
                    
                    <div className="flex justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-gray-700">Processamento e credenciamento</span>
                      <span className="font-medium">R$ 10,00</span>
                    </div>
                    
                    <div className="flex justify-between p-4 bg-orange-50 rounded-md border border-orange-200">
                      <span className="text-orange-800 font-bold">Total a pagar</span>
                      <span className="text-orange-800 font-bold">R$ 129,80</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <h5 className="font-bold text-yellow-800 mb-2">Informações Importantes:</h5>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-800">
                    <li>O pagamento é obrigatório para confirmar seu agendamento</li>
                    <li>Após o pagamento, você receberá o link da videochamada por email</li>
                    <li>O crachá oficial será entregue após a conclusão do treinamento</li>
                    <li>Cancelamentos devem ser feitos com 24h de antecedência</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                  <h5 className="font-bold text-red-700 mb-2">⚠️ ATENÇÃO</h5>
                  <p className="text-sm text-red-700">
                    <strong>O treinamento é OBRIGATÓRIO</strong> para ativar seu cadastro como entregador. 
                    Sem a conclusão do treinamento, você não receberá suas credenciais de acesso ao aplicativo 
                    e não poderá começar a trabalhar.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full bg-[#EE4E2E] hover:bg-[#D43C1E] text-white font-medium py-6 text-lg"
                    onClick={() => setLocation('/checkout')}
                  >
                    Pagar Agora com PIX
                  </Button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Pagamento processado com segurança pela For4Payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagamentoInstrutor;