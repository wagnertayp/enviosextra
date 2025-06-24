#!/usr/bin/env python3
"""Wrapper script para processar pagamentos via For4Payments API"""
import sys
import json
from for4payments import create_payment_api

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Formato incorreto. Uso: python3 for4payments-wrapper.py '{\"nome\": \"...\", \"cpf\": \"...\"}'"}))
        sys.exit(1)
    
    try:
        # Processar o JSON de entrada
        user_data = json.loads(sys.argv[1])
        
        # Criar a instância da API
        api = create_payment_api()
        
        # Processar o pagamento
        result = api.create_encceja_payment(user_data)
        
        # Retornar o resultado como JSON para o caller
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_message = str(e)
        print(json.dumps({"error": f"Erro ao processar pagamento: {error_message}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()