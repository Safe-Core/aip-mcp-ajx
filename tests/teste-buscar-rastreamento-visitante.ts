import { FirestoreService } from '../src/firestore-service.js';
import { defaultFirebaseConfig } from '../src/firebase-config.js';
import { TokenStep } from '../src/firestore-service.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simula a função buscarRastreamentoVisitante para teste com tokenId
 * Testa a busca por ID do token em vez de nome do visitante
 */
async function buscarRastreamentoVisitante(firestoreService: FirestoreService, tokenIdOption: any) {
  console.log(`Testando buscarRastreamentoVisitante com tokenId: ${JSON.stringify(tokenIdOption)}`);

  try {
    // Busca o histórico do token no Firestore usando o método corrigido
    console.log(`Buscando steps para token...`);
    const steps = await firestoreService.buscarHistoricoToken(tokenIdOption);
    console.log(`Encontrados ${steps.length} steps para o token`);
    
    // Extrai o ID para exibição
    let tokenIdDisplay = typeof tokenIdOption === 'string' ? 
      tokenIdOption : 
      (typeof tokenIdOption === 'object' && 'referencePath' in tokenIdOption) ? 
        (tokenIdOption as any).referencePath : 
        JSON.stringify(tokenIdOption);
    
    // Cria o relatório
    let output = `# Rastreamento do token: ${tokenIdDisplay}\n\n`;
    
    if (steps.length === 0) {
      output += `❌ **Nenhum passo encontrado para este token.**\n`;
      console.log(output);
      return;
    }
    
    output += `## Encontrados ${steps.length} passos de rastreamento\n\n`;
    
    // Ordena os steps por timestamp
    const sortedSteps = [...steps].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
    
    // Mostra primeiro e último passo
    const firstStep = sortedSteps[0];
    const lastStep = sortedSteps[sortedSteps.length - 1];
    
    output += `- **Primeiro registro:** ${new Date(firstStep.timestamp).toLocaleString()}\n`;
    output += `- **Último registro:** ${new Date(lastStep.timestamp).toLocaleString()}\n`;
    output += `- **Duração total:** ${Math.round((new Date(lastStep.timestamp).getTime() - new Date(firstStep.timestamp).getTime()) / 60000)} minutos\n\n`;
    
    // Salva o relatório
    const outPath = path.join(__dirname, `resultado-${tokenIdDisplay.replace(/[\/\\:]/g, '-')}.md`);
    fs.writeFileSync(outPath, output);
    console.log(`Relatório salvo em ${outPath}`);
    
    return steps;
  } catch (error) {
    console.error(`❌ Erro ao buscar steps para token:`, error);
    throw error;
  }
}// IDs para teste
const tokenId = process.argv[2] || '3SSrTb07cfhJuNhh4euS';
const tokenIdComPath = 'tokens/3SSrTb07cfhJuNhh4euS';
const tokenIdComDocRef = {
  type: "firestore/documentReference/1.0",
  referencePath: "tokens/3SSrTb07cfhJuNhh4euS"
};

// Executa os testes
async function runTests() {
  // Inicializa o serviço do Firestore apenas uma vez
  console.log('\n1️⃣ Inicializando serviço do Firestore...');
  const firestoreService = new FirestoreService(defaultFirebaseConfig);

  // Testa com formatos diferentes de ID
  console.log("\n=== Teste com ID simples ===");
  await testToken(firestoreService, tokenId);
  
  console.log("\n=== Teste com path completo ===");
  await testToken(firestoreService, tokenIdComPath);
  
  console.log("\n=== Teste com document reference ===");
  await testToken(firestoreService, tokenIdComDocRef);
}

// Função para testar um formato específico de token
async function testToken(firestoreService: FirestoreService, tokenIdOption: any) {
  try {
    console.log(`🔍 Testando com tokenId:`, tokenIdOption);
    
    // Extrai o ID real do token, independente do formato
    let tokenIdNormalizado = typeof tokenIdOption === 'string' ? tokenIdOption : JSON.stringify(tokenIdOption);
    if (typeof tokenIdOption === 'object' && 'referencePath' in tokenIdOption) {
      const refPath = tokenIdOption.referencePath;
      const parts = refPath.split('/');
      tokenIdNormalizado = parts[parts.length - 1] || tokenIdNormalizado;
    } else if (typeof tokenIdNormalizado === 'string' && tokenIdNormalizado.includes('/')) {
      const parts = tokenIdNormalizado.split('/');
      tokenIdNormalizado = parts[parts.length - 1] || tokenIdNormalizado;
    }
    
    console.log(`Token ID normalizado: ${tokenIdNormalizado}`);
    
    // Busca os passos do token
    console.log(`Buscando steps para token...`);
    // Passamos o ID normalizado para garantir que esteja no formato esperado
    const steps = await firestoreService.buscarHistoricoToken(tokenIdNormalizado);
    console.log(`Encontrados ${steps.length} steps para o token`);
  } catch (error) {
    console.error(`❌ Erro no teste:`, error);
  }
}

// Inicia os testes
runTests()
  .then(() => console.log("\n✅ Todos os testes concluídos!"))
  .catch(err => console.error("\n❌ Erro nos testes:", err));
