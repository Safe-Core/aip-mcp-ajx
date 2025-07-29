// Teste simples para a função buscarComFiltros
import { CondominioQdrantClient } from './qdrant-client.js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

async function testarFiltros() {
  console.log('🔍 Teste de funções de busca com filtros');
  console.log('=======================================');

  // Configura cliente Qdrant
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'condominio_access';

  console.log(`📡 Conectando ao Qdrant em ${qdrantUrl}`);
  console.log(`📊 Usando coleção: ${collectionName}`);

  try {
    // Cria cliente
    const client = new CondominioQdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
      collectionName,
    });

    // Teste simples sem filtros (deve retornar os primeiros registros)
    console.log('\n⚙️ Teste 1: Busca sem filtros');
    try {
      console.log('Buscando primeiros 2 registros...');
      const resultadoSimples = await client.buscarComFiltros({ limit: 2 });
      console.log(`Resultado: ✅ Encontrados ${resultadoSimples.total} registros`);
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`);
      if (error.cause) console.error('Causa:', error.cause);
    }

    // Testa função buscar pessoas dentro
    console.log('\n🧑 Teste 2: buscarPessoasAindaDentro');
    try {
      console.log('Buscando pessoas ainda dentro...');
      const resultadoDentro = await client.buscarPessoasAindaDentro(3);
      // console.log(`Resultado: ✅`, resultadoDentro);
      console.log(`Resultado: ✅ Encontradas ${resultadoDentro.total} pessoas`);
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`);
      if (error.cause) console.error('Causa:', error.cause);
    }

    // Testa documento específico
    console.log('\n📄 Teste 3: buscarHistoricoPessoa');
    try {
      console.log('Buscando histórico de uma pessoa...');
      // Tente alguns documentos diferentes
      const documento = '45574290'; // Substitua por um documento que possa existir
      const resultadoHistorico = await client.buscarHistoricoPessoa(documento, undefined, undefined, 3);
      console.log(`Resultado: ✅ Encontrados ${resultadoHistorico.total} registros`);
    } catch (error: any) {
      console.error(`❌ Erro: ${error.message}`);
      if (error.cause) console.error('Causa:', error.cause);
    }

    console.log('\n✅ Testes concluídos!');
  } catch (error: any) {
    console.error(`❌ Erro na inicialização do teste: ${error.message}`);
    if (error.cause) console.error('Causa:', error.cause);
  }
}

// Executa o teste
testarFiltros()
  .catch((error) => {
    console.error('Erro fatal:', error);
  });
