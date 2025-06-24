import { FC, useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, CheckCircle2, Copy as CopyIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { createPixPaymentDirect } from '@/lib/for4payments-direct';

interface TreinamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentInfo {
  id: string;
  pixCode: string;
  pixQrCode: string;
  status?: string;
}

const horarios = [
  "08:00", "09:00", "10:00", "11:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

// Função para adicionar dias úteis a uma data
function adicionarDiasUteis(data: Date, dias: number) {
  const resultado = new Date(data);
  let diasAdicionados = 0;
  
  while (diasAdicionados < dias) {
    resultado.setDate(resultado.getDate() + 1);
    // 0 = Domingo, 6 = Sábado
    const diaDaSemana = resultado.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) {
      diasAdicionados++;
    }
  }
  
  return resultado;
}

const TreinamentoModal: FC<TreinamentoModalProps> = ({ open, onOpenChange }) => {
  const [date, setDate] = useState<Date | undefined>(adicionarDiasUteis(new Date(), 1));
  const [horario, setHorario] = useState<string>("09:00");
  const [email, setEmail] = useState<string>("");
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Estados para controlar a etapa do modal
  const [step, setStep] = useState<'schedule' | 'payment'>('schedule');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  // Desabilita datas no passado, finais de semana e feriados
  const disabledDays = (date: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Desabilita datas no passado e hoje
    if (date < hoje) return true;
    
    // Desabilita finais de semana (0 = domingo, 6 = sábado)
    const diaDaSemana = date.getDay();
    return diaDaSemana === 0 || diaDaSemana === 6;
  };

  // Criar pagamento PIX via API For4Payments diretamente no frontend
  const createPixPayment = async () => {
    setIsLoading(true);
    
    try {
      console.log('[TREINAMENTO] Iniciando pagamento via For4Payments diretamente no frontend');
      
      // Dados fixos para o pagamento conforme solicitado
      const paymentData = {
        name: "Marina Souza",
        email: "compradecurso@gmail.com",
        cpf: "83054235149",
        phone: "11998346572",
        amount: 67.00
      };
      
      // Tentativa 1: Usar API For4Payments diretamente no frontend (para Netlify)
      try {
        // Chamar For4Payments diretamente
        console.log('[TREINAMENTO] Tentando pagamento direto via For4Payments');
        const result = await createPixPaymentDirect(paymentData);
        
        console.log('[TREINAMENTO] Pagamento direto bem-sucedido:', result);
        
        // Armazenar as informações do pagamento
        setPaymentInfo({
          id: result.id,
          pixCode: result.pixCode,
          pixQrCode: result.pixQrCode,
          status: 'PENDING'
        });
        
        return; // Encerrar aqui se o pagamento direto foi bem-sucedido
      } catch (directError) {
        // Se falhar o pagamento direto, tenta via backend (fallback)
        console.warn('[TREINAMENTO] Pagamento direto falhou, tentando via backend:', directError);
      }
      
      // Tentativa 2 (fallback): Usar o backend (para Replit)
      console.log('[TREINAMENTO] Tentando pagamento via backend');
      const response = await fetch(`${API_BASE_URL}/api/payments/treinamento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao processar o pagamento. Por favor, tente novamente.");
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('[TREINAMENTO] Pagamento via backend bem-sucedido:', data);
      
      // Armazenar as informações do pagamento
      setPaymentInfo({
        id: data.id,
        pixCode: data.pixCode,
        pixQrCode: data.pixQrCode,
        status: 'PENDING'
      });
      
      // Exibe toast de confirmação
      toast({
        title: "Agendamento realizado!",
        description: `Seu treinamento foi agendado para ${format(date!, "dd/MM/yyyy", { locale: ptBR })} às ${horario}.`,
      });
    } catch (error: any) {
      console.error("Erro ao criar pagamento:", error);
      toast({
        title: "Erro ao processar o pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!date) {
      toast({
        title: "Selecione uma data",
        description: "Por favor, selecione uma data para o treinamento.",
        variant: "destructive"
      });
      return;
    }

    if (!email) {
      toast({
        title: "Confirme seu email",
        description: "Por favor, confirme seu email para agendarmos o treinamento.",
        variant: "destructive"
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, informe um email válido.",
        variant: "destructive"
      });
      return;
    }
    
    // Alterar para a etapa de pagamento
    setStep('payment');
    
    // Iniciar o processo de pagamento
    createPixPayment();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[100vh] max-h-[100vh] overflow-y-auto scrollbar-thin" style={{ overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column' }}>
        {step === 'schedule' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-[#E83D22] font-bold">Agende seu Treinamento</DialogTitle>
              <DialogDescription>
                Escolha uma data e horário para realizar seu treinamento online obrigatório com um instrutor oficial da Shopee.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4 flex-grow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-[#E83D22]">
                  <span className="text-xl font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">Instrutor Oficial Shopee</h3>
                  <p className="text-sm text-gray-600">
                    O treinamento será realizado por videochamada com um instrutor certificado que irá ensinar tudo o que você 
                    precisa saber para começar a trabalhar como entregador Shopee.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-[#E83D22]">
                  <span className="text-xl font-bold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">Escolha a data</h3>
                  <div className="flex flex-col space-y-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-2",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={disabledDays}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-[#E83D22]">
                  <span className="text-xl font-bold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">Escolha o horário</h3>
                  <div className="flex flex-col space-y-1.5">
                    <Select defaultValue={horario} onValueChange={setHorario}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {horarios.map((hora) => (
                          <SelectItem key={hora} value={hora}>
                            {hora}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 text-[#E83D22]">
                  <span className="text-xl font-bold">4</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">Confirme seu email</h3>
                  <div className="flex flex-col space-y-1.5">
                    <Input 
                      type="email" 
                      placeholder="seu-email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500">
                      Você receberá o link da videochamada e instruções neste email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mt-2">
                <h4 className="font-semibold text-yellow-800 mb-1">Informação importante:</h4>
                <p className="text-sm text-yellow-700">
                  Para finalizar o agendamento, é necessário efetuar o pagamento do honorário do instrutor e do crachá
                  oficial de entregador Shopee que será emitido após a conclusão do treinamento.
                </p>
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 bg-white pb-2 mt-3">
              <Button 
                type="submit" 
                className="w-full bg-[#3483FA] hover:bg-[#2968D7] text-white" 
                onClick={handleSubmit}
              >
                Continuar para pagamento
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg text-[#3483FA] font-bold">Pagamento do Curso</DialogTitle>
              <DialogDescription className="text-sm">
                Para confirmar seu agendamento é necessário pagar o curso e emissão do crachá.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2 flex-grow">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8 bg-[#FDE80F] bg-opacity-20 rounded-lg">
                  <img 
                    src="https://i.postimg.cc/j5Mnz0Tm/mercadolibre-logo-7-D54-D946-AE-seeklogo-com.png" 
                    alt="Mercado Libre"
                    className="h-12 w-auto object-contain mb-4"
                  />
                  <div className="animate-spin h-8 w-8 border-3 border-[#3483FA] border-t-transparent rounded-full mb-3"></div>
                  <p className="text-[#3483FA] text-sm font-medium font-loewe-next-body">Processando pagamento...</p>
                </div>
              )}

              {!isLoading && !paymentInfo && (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="bg-red-50 p-3 rounded-md border border-red-200 w-full">
                    <p className="text-red-700 text-sm">
                      Ocorreu um erro ao processar o pagamento. Por favor, tente novamente.
                    </p>
                  </div>
                  <Button 
                    className="mt-3 bg-[#3483FA] hover:bg-[#2968D7] text-white text-sm" 
                    onClick={() => setStep('schedule')}
                    size="sm"
                  >
                    Voltar
                  </Button>
                </div>
              )}

              {!isLoading && paymentInfo && (
                <div className="space-y-3 pb-2">
                  <div className="bg-green-50 p-3 rounded-md border border-green-200">
                    <div className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-800 text-sm">Agendamento confirmado!</h3>
                        <p className="text-xs text-green-700">
                          Treinamento: {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : ""} às {horario}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between p-2 bg-gray-50 rounded-md items-center border border-gray-100">
                    <span className="text-gray-700 text-sm">Curso Online + Crachá</span>
                    <span className="font-medium bg-[#E83D22] text-white py-1 px-2 rounded-md text-sm">R$ 67,00</span>
                  </div>

                  <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-medium text-[#E83D22] mb-2 pb-1 border-b border-gray-100">Pagamento PIX</h4>
                    <div className="flex justify-center mb-2">
                      <img 
                        src={paymentInfo.pixQrCode} 
                        alt="QR Code PIX" 
                        className="w-40 h-40 border border-gray-200 rounded-md"
                      />
                    </div>
                    <p className="text-xs text-gray-600 text-center mb-2">
                      Escaneie o QR Code ou copie o código PIX
                    </p>
                    <input 
                      type="text" 
                      value={paymentInfo.pixCode} 
                      readOnly 
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-xs mb-2"
                    />
                    <Button 
                      onClick={() => {
                        navigator.clipboard.writeText(paymentInfo.pixCode);
                        toast({
                          title: "Código copiado!",
                          description: "O código PIX foi copiado para a área de transferência."
                        });
                      }} 
                      className="w-full bg-green-600 hover:bg-green-700 text-white border border-green-700 py-1 text-xs flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <CopyIcon className="h-4 w-4" />
                      Copiar código PIX
                    </Button>
                    
                    <div className="flex flex-col items-center mt-3 bg-blue-50 p-2 rounded-md border border-blue-100">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <div className="w-2 h-2 bg-[#3483FA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#3483FA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#3483FA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-xs text-blue-800 font-medium">Aguardando pagamento</p>
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs">
                    <div className="flex-1 bg-yellow-50 p-2 rounded-md border border-yellow-200">
                      <h5 className="font-semibold text-yellow-800 mb-1 text-xs">⏱️ 30 min</h5>
                      <p className="text-yellow-700 text-xs">Realize o pagamento em até 30 minutos</p>
                    </div>
                    <div className="flex-1 bg-blue-50 p-2 rounded-md border border-blue-200">
                      <h5 className="font-semibold text-blue-800 mb-1 text-xs">📱 Link</h5>
                      <p className="text-blue-700 text-xs">Receberá o link do treinamento por email</p>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-2 rounded-md border border-red-200">
                    <p className="text-xs text-red-700">
                      <span className="font-bold">IMPORTANTE:</span> Sem o curso e o pagamento, você NÃO receberá suas credenciais 
                      de acesso ao aplicativo Shopee.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 sticky bottom-0 bg-white pb-2 mt-3">
              <Button 
                type="button" 
                variant="outline"
                className="w-full text-sm py-1 h-8" 
                onClick={() => onOpenChange(false)}
                size="sm"
              >
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TreinamentoModal;