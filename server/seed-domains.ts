import { db } from "./db";
import { allowedDomains } from "@shared/schema";

async function seedAllowedDomains() {
  console.log("Iniciando seeding de domínios permitidos...");
  
  // Lista de domínios permitidos
  const domainsList = [
    { domain: "replit.dev", isActive: true, reason: "Ambiente de desenvolvimento" },
    { domain: "replit.com", isActive: true, reason: "Ambiente de desenvolvimento" },
    { domain: "kirk.replit.dev", isActive: true, reason: "Ambiente de desenvolvimento" },
    { domain: "localhost", isActive: true, reason: "Ambiente de desenvolvimento local" },
    { domain: "127.0.0.1", isActive: true, reason: "Ambiente de desenvolvimento local" },
    { domain: "disparador-f065362693d3.herokuapp.com", isActive: true, reason: "Backend Heroku" },
    { domain: "shopee-delivery-partners.netlify.app", isActive: true, reason: "Frontend Netlify" }
  ];
  
  // Inserir domínios no banco de dados
  try {
    // Verificar se já existem domínios no banco
    const existingDomains = await db.select().from(allowedDomains);
    
    if (existingDomains.length > 0) {
      console.log(`Já existem ${existingDomains.length} domínios no banco de dados. Pulando inserção.`);
      return;
    }
    
    // Inserir domínios
    const result = await db.insert(allowedDomains).values(domainsList);
    console.log(`Inseridos ${domainsList.length} domínios com sucesso!`);
  } catch (error) {
    console.error("Erro ao inserir domínios:", error);
  } finally {
    console.log("Processo de seeding finalizado.");
  }
}

// Executar a função de seeding
seedAllowedDomains()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro:", error);
    process.exit(1);
  });