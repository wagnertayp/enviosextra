import fs from 'fs';

// Ler o arquivo CSV
const csvData = fs.readFileSync('./attached_assets/Munic_pios_por_Estado.csv', 'utf8');

// Processar o conteúdo
const lines = csvData.split('\n');
const headers = lines[0].split(',');

// Objeto para armazenar os municípios por estado
const municipiosPorEstado = {};

// Inicializar estados com arrays vazios
headers.forEach(state => {
  if (state.trim()) {
    municipiosPorEstado[state.trim()] = [];
  }
});

// Preencher os municípios
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const valores = line.split(',');
  
  for (let j = 0; j < headers.length; j++) {
    const estado = headers[j].trim();
    const municipio = valores[j]?.trim();
    
    if (estado && municipio) {
      municipiosPorEstado[estado].push(municipio);
    }
  }
}

// Gerar o arquivo TypeScript
let tsContent = `// Arquivo gerado automaticamente a partir do CSV\n\n`;
tsContent += `interface MunicipiosPorEstado {\n`;
tsContent += `  [estado: string]: string[];\n`;
tsContent += `}\n\n`;
tsContent += `const municipiosPorEstado: MunicipiosPorEstado = {\n`;

for (const estado in municipiosPorEstado) {
  tsContent += `  "${estado}": [\n`;
  
  municipiosPorEstado[estado].forEach(municipio => {
    if (municipio) {
      // Escapar aspas e caracteres especiais
      const municipioEscapado = municipio.replace(/"/g, '\\"');
      tsContent += `    "${municipioEscapado}",\n`;
    }
  });
  
  tsContent += `  ],\n`;
}

tsContent += `};\n\n`;
tsContent += `export default municipiosPorEstado;\n`;

// Escrever o arquivo TypeScript
fs.writeFileSync('./client/src/data/municipios-por-estado.ts', tsContent);

console.log('Arquivo gerado com sucesso: client/src/data/municipios-por-estado.ts');