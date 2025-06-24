import { db } from "./db";
import { states, benefits } from "@shared/schema";

async function seed() {
  console.log("Iniciando seed de dados...");
  
  // Sempre limpar e recriar os estados (forçar para este exemplo)
  console.log("Excluindo estados existentes...");
  try {
    await db.delete(states);
  } catch (error) {
    console.error("Erro ao excluir estados:", error);
  }
  
  console.log("Inserindo estados brasileiros...");
  
  // Inserir todos os estados brasileiros com números específicos de vagas
  await db.insert(states).values([
    { code: "SP", name: "São Paulo", hasVacancies: true, vacancyCount: 26 },
    { code: "RJ", name: "Rio de Janeiro", hasVacancies: true, vacancyCount: 25 },
    { code: "MG", name: "Minas Gerais", hasVacancies: true, vacancyCount: 24 },
    { code: "AC", name: "Acre", hasVacancies: false, vacancyCount: 0 },
    { code: "RS", name: "Rio Grande do Sul", hasVacancies: true, vacancyCount: 23 },
    { code: "DF", name: "Distrito Federal", hasVacancies: true, vacancyCount: 22 },
    { code: "AL", name: "Alagoas", hasVacancies: false, vacancyCount: 0 },
    { code: "PR", name: "Paraná", hasVacancies: true, vacancyCount: 21 },
    { code: "AM", name: "Amazonas", hasVacancies: false, vacancyCount: 0 },
    { code: "PE", name: "Pernambuco", hasVacancies: true, vacancyCount: 19 },
    { code: "BA", name: "Bahia", hasVacancies: true, vacancyCount: 18 },
    { code: "CE", name: "Ceará", hasVacancies: false, vacancyCount: 0 },
    { code: "PA", name: "Pará", hasVacancies: true, vacancyCount: 16 },
    { code: "SC", name: "Santa Catarina", hasVacancies: true, vacancyCount: 15 },
    { code: "ES", name: "Espírito Santo", hasVacancies: false, vacancyCount: 0 },
    { code: "MT", name: "Mato Grosso", hasVacancies: true, vacancyCount: 13 },
    { code: "GO", name: "Goiás", hasVacancies: false, vacancyCount: 0 },
    { code: "PB", name: "Paraíba", hasVacancies: true, vacancyCount: 9 },
    { code: "MA", name: "Maranhão", hasVacancies: false, vacancyCount: 0 },
    { code: "AP", name: "Amapá", hasVacancies: true, vacancyCount: 7 },
    { code: "MS", name: "Mato Grosso do Sul", hasVacancies: false, vacancyCount: 0 },
    { code: "PI", name: "Piauí", hasVacancies: false, vacancyCount: 0 },
    { code: "RN", name: "Rio Grande do Norte", hasVacancies: false, vacancyCount: 0 },
    { code: "RO", name: "Rondônia", hasVacancies: false, vacancyCount: 0 },
    { code: "RR", name: "Roraima", hasVacancies: false, vacancyCount: 0 },
    { code: "SE", name: "Sergipe", hasVacancies: false, vacancyCount: 0 },
    { code: "TO", name: "Tocantins", hasVacancies: false, vacancyCount: 0 }
  ]);
  
  console.log("Estados brasileiros inseridos com sucesso!");

  // Verificar se já existem benefícios
  const existingBenefits = await db.select().from(benefits);
  if (existingBenefits.length === 0) {
    console.log("Inserindo benefícios...");
    
    // Inserir benefícios
    await db.insert(benefits).values([
      { 
        title: "Ganhos Flexíveis", 
        description: "Você ganha por entrega e tem transparência total sobre seus rendimentos.",
        iconName: "money"
      },
      { 
        title: "Trabalhe quando quiser", 
        description: "Você define seus horários e quantas entregas quer fazer.",
        iconName: "clock"
      },
      { 
        title: "Seu próprio chefe", 
        description: "Sem subordinação ou exigências de exclusividade.",
        iconName: "user"
      },
      { 
        title: "Entrega em sua região", 
        description: "Você pode escolher trabalhar próximo da sua casa.",
        iconName: "map-pin"
      },
      { 
        title: "Pagamento Semanal", 
        description: "Receba seus pagamentos rapidamente toda semana.",
        iconName: "calendar"
      },
      { 
        title: "Suporte 24/7", 
        description: "Atendimento exclusivo para nossos parceiros.",
        iconName: "headset"
      }
    ]);
    
    console.log("Benefícios inseridos com sucesso!");
  } else {
    console.log(`Já existem ${existingBenefits.length} benefícios no banco de dados.`);
  }
  
  console.log("Seed de dados concluído com sucesso!");
}

seed()
  .catch(e => {
    console.error("Erro durante o processo de seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Fechando conexão com o banco de dados...");
    // Usando a propriedade $client do objeto db
    await db.$client.end();
    console.log("Conexão fechada.");
  });