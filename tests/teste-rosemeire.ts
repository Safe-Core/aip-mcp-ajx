import { FirestoreService } from '../src/firestore-service.js';
import { defaultFirebaseConfig } from '../src/firebase-config.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { doc, collection, query, where, getDocs, Firestore } from 'firebase/firestore';

// Extende a interface FirestoreService para permitir acesso ao db para testes
declare module '../src/firestore-service.js' {
  interface FirestoreService {
    getFirestore(): Firestore;
  }
}

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Teste específico para Rosemeire
 */
async function testarRosemeireTracking() {
  console.log('🔍 Iniciando teste de rastreamento para Rosemeire...');
  
  // Inicializa o FirestoreService
  const firestoreService = new FirestoreService(defaultFirebaseConfig);
  
  // 1. Buscar o usuário Rosemeire
  const nome = "ROSEMEIRE APARECIDA HERNANDES";
  console.log(`\n1️⃣ Buscando usuário: ${nome}`);
  const usuarios = await firestoreService.buscarUsuarioPorNome(nome);
  
  if (usuarios.length === 0) {
    console.log('❌ Usuário não encontrado');
    return;
  }
  
  const usuario = usuarios[0];
  console.log(`✅ Usuário encontrado: ${usuario.display_name} (${usuario.uid})`);
  
  // 2. Buscar tokens do usuário
  console.log(`\n2️⃣ Buscando tokens para o usuário ${usuario.uid}`);
  const tokens = await firestoreService.buscarTokensPorUid(usuario.uid);
  
  console.log(`✅ Encontrados ${tokens.length} tokens`);
  
  // 3. Para cada token, buscar seus steps
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(`\n3️⃣ Token ${i+1}: ${token.name || token.id}`);
    console.log(`- ID: ${token.id}`);
    
    // 3.1 Tentar buscar steps diretamente com o método já implementado
    console.log(`\n3.1 Buscando steps usando buscarHistoricoToken...`);
    try {
      const steps = await firestoreService.buscarHistoricoToken(token.id);
      console.log(`- Encontrados ${steps.length} steps`);
      
      if (steps.length === 0) {
        console.log(`⚠️ Nenhum step encontrado para o token ${token.id}`);
      } else {
        console.log(`✅ Steps encontrados com sucesso!`);
      }
    } catch (err) {
      console.error(`❌ Erro ao buscar steps:`, err);
    }
    
    // 3.2 Buscar steps com diferentes formatos
    try {
      console.log(`\n3.2 Tentando formato alternativo (path)...`);
      const stepsComPath = await firestoreService.buscarHistoricoToken(`tokens/${token.id}`);
      console.log(`- Formato path: Encontrados ${stepsComPath.length} steps`);
    } catch (err) {
      console.error(`❌ Erro com formato path:`, err);
    }
    
    // 3.3 Busca manual diretamente no Firestore
    console.log(`\n3.3 Realizando consulta manual na coleção tokenSteps...`);
    try {
      // Acessa o Firestore diretamente
      const db = firestoreService.getFirestore();
      if (!db) {
        console.error('❌ DB não disponível');
        continue;
      }
      
      // Consulta tokenSteps diretamente
      const stepsRef = collection(db, 'tokenSteps');
      console.log(`- Buscando em 'tokenSteps' onde tokenRef.referencePath contém '${token.id}'`);
      
      // Busca todos os steps para analisar manualmente
      const allStepsSnapshot = await getDocs(collection(db, 'tokenSteps'));
      
      // Conta quantos steps encontrou no total
      console.log(`- Total de steps na coleção: ${allStepsSnapshot.size}`);
      
      // Verifica se algum deles tem o token que procuramos
      const matchingSteps: string[] = [];
      const tokenRefValues = new Set<string>();
      
      allStepsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.tokenRef) {
          // Salva todos os valores distintos de tokenRef para análise
          if (typeof data.tokenRef === 'object') {
            if (data.tokenRef.referencePath) {
              tokenRefValues.add(data.tokenRef.referencePath);
            }
          } else if (typeof data.tokenRef === 'string') {
            tokenRefValues.add(data.tokenRef);
          }
          
          // Verifica se tem nosso token
          if (typeof data.tokenRef === 'object' && 
              data.tokenRef.referencePath && 
              data.tokenRef.referencePath.includes(token.id)) {
            matchingSteps.push(doc.id);
          } else if (typeof data.tokenRef === 'string' && 
                     data.tokenRef.includes(token.id)) {
            matchingSteps.push(doc.id);
          }
        }
      });
      
      console.log(`- Steps que referem diretamente ao token ${token.id}: ${matchingSteps.length}`);
      console.log(`\n📊 Análise de tokenRef na coleção:`);
      console.log(`- Valores distintos de tokenRef encontrados: ${tokenRefValues.size}`);
      console.log(`- Valores: ${Array.from(tokenRefValues).join(', ')}`);
      
    } catch (err) {
      console.error(`❌ Erro na consulta manual:`, err);
    }
  }
  
  // 4. Analisar o problema específico
  console.log(`\n\n4️⃣ DIAGNÓSTICO FINAL:`);
  console.log(`----------------------------------------`);
  console.log(`O problema parece ser que o token ST6339 (associado à Rosemeire) não tem`);
  console.log(`steps vinculados a ele diretamente. Os steps existentes estão vinculados`);
  console.log(`a outro token (provavelmente 3SSrTb07cfhJuNhh4euS).`);
  console.log(`----------------------------------------`);
  console.log(`\n⚠️ PROPOSTA DE SOLUÇÃO:`);
  console.log(`1. Modificar buscarHistoricoToken para buscar também por nome de token`);
  console.log(`2. Ou criar uma tabela de mapeamento entre tokens ST*** e seus respectivos steps`);
}

// Adiciona um método para acessar o Firestore (para uso interno do teste)
// Adiciona um método para acessar o Firestore (para uso interno do teste)
FirestoreService.prototype.getFirestore = function() {
  return this.db;
};

// Executa o teste
testarRosemeireTracking()
  .then(() => console.log('\n✅ Teste concluído!'))
  .catch(err => console.error('\n❌ Erro no teste:', err));
