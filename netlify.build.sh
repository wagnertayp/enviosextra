#!/bin/bash

# Script de build para a Netlify
echo "Iniciando build para a Netlify..."

# Executar o build padrão
npm run build

# Verificar se o diretório public está na pasta dist
if [ ! -d "dist/public" ]; then
  echo "Erro: diretório dist/public não encontrado após o build!"
  exit 1
fi

# Garantir que o diretório de dados existe
if [ ! -d "dist/public/data" ]; then
  echo "Criando diretório de dados..."
  mkdir -p dist/public/data
fi

# Copiar dados estáticos
echo "Copiando arquivo de regiões..."
cp -f client/public/data/regions.json dist/public/data/

echo "Build concluído com sucesso!"