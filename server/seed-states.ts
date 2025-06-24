import { db } from "./db";
import { states } from "@shared/schema";

async function seedStates() {
  console.log("Iniciando seeding de estados...");
  
  // Lista de estados brasileiros com suas abreviações
  const statesList = [
    { name: "Acre", code: "AC", vacancyCount: 5 },
    { name: "Alagoas", code: "AL", vacancyCount: 10 },
    { name: "Amapá", code: "AP", vacancyCount: 5 },
    { name: "Amazonas", code: "AM", vacancyCount: 15 },
    { name: "Bahia", code: "BA", vacancyCount: 20 },
    { name: "Ceará", code: "CE", vacancyCount: 15 },
    { name: "Distrito Federal", code: "DF", vacancyCount: 22 },
    { name: "Espírito Santo", code: "ES", vacancyCount: 12 },
    { name: "Goiás", code: "GO", vacancyCount: 18 },
    { name: "Maranhão", code: "MA", vacancyCount: 12 },
    { name: "Mato Grosso", code: "MT", vacancyCount: 10 },
    { name: "Mato Grosso do Sul", code: "MS", vacancyCount: 8 },
    { name: "Minas Gerais", code: "MG", vacancyCount: 25 },
    { name: "Pará", code: "PA", vacancyCount: 14 },
    { name: "Paraíba", code: "PB", vacancyCount: 10 },
    { name: "Paraná", code: "PR", vacancyCount: 22 },
    { name: "Pernambuco", code: "PE", vacancyCount: 15 },
    { name: "Piauí", code: "PI", vacancyCount: 8 },
    { name: "Rio de Janeiro", code: "RJ", vacancyCount: 24 },
    { name: "Rio Grande do Norte", code: "RN", vacancyCount: 10 },
    { name: "Rio Grande do Sul", code: "RS", vacancyCount: 20 },
    { name: "Rondônia", code: "RO", vacancyCount: 6 },
    { name: "Roraima", code: "RR", vacancyCount: 4 },
    { name: "Santa Catarina", code: "SC", vacancyCount: 18 },
    { name: "São Paulo", code: "SP", vacancyCount: 26 },
    { name: "Sergipe", code: "SE", vacancyCount: 8 },
    { name: "Tocantins", code: "TO", vacancyCount: 6 }
  ];
  
  // Inserir estados no banco de dados
  try {
    // Verificar se já existem estados no banco
    const existingStates = await db.select().from(states);
    
    if (existingStates.length > 0) {
      console.log(`Já existem ${existingStates.length} estados no banco de dados. Pulando inserção.`);
      return;
    }
    
    // Inserir estados
    const result = await db.insert(states).values(statesList);
    console.log(`Inseridos ${statesList.length} estados com sucesso!`);
  } catch (error) {
    console.error("Erro ao inserir estados:", error);
  } finally {
    console.log("Processo de seeding finalizado.");
  }
}

// Executar a função de seeding
seedStates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro:", error);
    process.exit(1);
  });