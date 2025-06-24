import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

// Interface para o payload de pagamento
interface For4PaymentsData {
  nome: string;
  cpf: string;
  email: string;
  telefone?: string;
}

/**
 * Wrapper para chamar o script for4payments.py
 */
export async function createFor4Payment(data: For4PaymentsData) {
  try {
    console.log('Processando pagamento via for4payments.py:', data);
    
    // Construir comando para executar o script Python
    const scriptPath = path.resolve(process.cwd(), 'for4payments-wrapper.py');
    const command = `python3 ${scriptPath} ${JSON.stringify(JSON.stringify(data))}`;
    
    console.log(`Executando comando: ${command}`);
    
    // Executar o script Python
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('Erro no script Python:', stderr);
      throw new Error(stderr);
    }
    
    console.log('Resultado do script Python:', stdout);
    
    // Parsear a saída do script
    const result = JSON.parse(stdout);
    return result;
  } catch (error: any) {
    console.error('Erro ao processar pagamento via for4payments.py:', error.message);
    throw new Error(`Falha ao processar pagamento: ${error.message}`);
  }
}