import { FirestoreService } from '../src/firestore-service.js';
import { defaultFirebaseConfig } from '../src/firebase-config.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Função para testar diretamente a busca de tokenSteps
 */
async function testarTokenSteps() {
  console.log('🔍 Teste de Busca de TokenSteps');
  console.log('===========================');
  console.log('Este teste verifica diretamente a funcionalidade de busca de steps na coleção tokenSteps');

  try {
    // Inicializa o serviço do Firestore
    console.log('\n1️⃣ Inicializando serviço do Firestore...');
    const firestoreService = new FirestoreService(defaultFirebaseConfig);

    // TokenRef para teste - pode ser passado como argumento ou usar o padrão
    const tokenId = process.argv[2] || '3SSrTb07cfhJuNhh4euS';
    
    console.log(`\n2️⃣ Testando com diferentes formatos de tokenRef para o token: ${tokenId}`);
    
    // Testa com diferentes formatos para ver qual funciona
    const formatos = [
      { formato: 'Apenas ID', valor: tokenId },
      { formato: 'Path completo', valor: `/tokens/${tokenId}` },
      { formato: 'Document Reference', valor: `tokens/${tokenId}` }
    ];
    
    // Examina também a coleção tokens para verificar se o token realmente existe
    console.log('\n--- Verificando se o token existe na coleção tokens ---');
    try {
      const tokenDoc = await firestoreService.buscarDocumento('tokens', tokenId);
      if (tokenDoc) {
        console.log('✅ Token encontrado na coleção tokens:');
        console.log(JSON.stringify(tokenDoc, null, 2));
      } else {
        console.log('❌ Token não encontrado na coleção tokens!');
        
        // Se não encontrou, vamos listar alguns tokens que existem
        console.log('\nBuscando exemplos de tokens existentes:');
        const tokensExemplo = await firestoreService.explorarColecao('tokens', 3);
        console.log(`Encontrados ${tokensExemplo.length} tokens de exemplo`);
        
        if (tokensExemplo.length > 0) {
          console.log('IDs de tokens disponíveis:');
          tokensExemplo.forEach((t, i) => {
            console.log(`${i+1}. ${t.id}`);
            // Adiciona o primeiro token encontrado como alternativa para teste
            if (i === 0) {
              const novoTokenId = t.id;
              formatos.push({ formato: 'Token existente encontrado', valor: novoTokenId });
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar token na coleção:', error);
    }
    
    // Primeiro, vamos examinar o conteúdo da coleção tokenSteps
    console.log('\n--- Examinando a estrutura da coleção tokenSteps ---');
    const tokenStepsExemplo = await firestoreService.explorarColecao('tokenSteps', 5);
    console.log(`Encontrados ${tokenStepsExemplo.length} documentos de exemplo na coleção tokenSteps`);
    
    if (tokenStepsExemplo.length > 0) {
      console.log('\nEstrutura de exemplo:');
      console.log(JSON.stringify(tokenStepsExemplo[0], null, 2));
      
      // Vamos verificar o formato do campo tokenRef nos documentos
      const tokenRefs = tokenStepsExemplo.map(doc => doc.tokenRef).filter(Boolean);
      if (tokenRefs.length > 0) {
        console.log('\nExemplos de valores do campo tokenRef:');
        tokenRefs.forEach((ref, i) => {
          if (typeof ref === 'object') {
            console.log(`${i+1}. Objeto de referência: ${JSON.stringify(ref)}`);
            
            // Se temos um referencePath, vamos extrair o ID do token
            if (ref.referencePath) {
              const refPath = ref.referencePath;
              const refTokenId = refPath.split('/').pop();
              if (refTokenId) {
                console.log(`   - ID do token referenciado: ${refTokenId}`);
                // Adiciona este token ao formato para teste
                formatos.push({ formato: `Token referenciado ${i+1}`, valor: refTokenId });
              }
            }
          } else {
            console.log(`${i+1}. ${ref}`);
          }
        });
        
        // Adiciona formato encontrado nos exemplos
        const exemploRef = tokenRefs[0];
        if (typeof exemploRef === 'string' && !formatos.find(f => f.valor === exemploRef)) {
          formatos.push({ formato: 'Formato encontrado no exemplo', valor: exemploRef });
        }
      }
    }
    
    for (const formato of formatos) {
      console.log(`\n--- Testando formato: ${formato.formato} (${formato.valor}) ---`);
      
      try {
        // Busca diretamente os steps usando o método da classe
        const steps = await firestoreService.buscarHistoricoToken(formato.valor);
        
        console.log(`✅ ${steps.length} steps encontrados usando este formato!`);
        
        if (steps.length > 0) {
          console.log('\nPrimeiros 2 steps encontrados:');
          steps.slice(0, 2).forEach((step, i) => {
            console.log(`\nStep ${i+1}:`);
            console.log(JSON.stringify(step, null, 2));
          });
        }
        
        // Salva os resultados em um arquivo JSON para inspeção
        const resultPath = path.join(__dirname, `token-steps-${formato.formato}.json`);
        fs.writeFileSync(resultPath, JSON.stringify({
          tokenRef: formato.valor,
          steps
        }, null, 2));
        
        console.log(`✅ Resultados salvos em: ${resultPath}`);
        
      } catch (error) {
        console.error(`❌ Erro ao buscar com formato ${formato.formato}:`, error);
      }
    }
    
    console.log('\n✅ Teste finalizado!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executa o teste
testarTokenSteps();
