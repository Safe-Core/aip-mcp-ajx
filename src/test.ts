#!/usr/bin/env node

import { CondominioQdrantClient } from './qdrant-client.js';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

async function testarServidor() {
  console.log('🏢 Testando AJX ITAP-ORV MCP\n');

  // Configuração do cliente
  const config = {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'condominio_access',
    openaiApiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  };

  console.log('📋 Configuração:');
  console.log(`- URL Qdrant: ${config.url}`);
  console.log(`- Coleção: ${config.collectionName}`);
  console.log(`- API Key Qdrant: ${config.apiKey ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`- API Key OpenAI: ${config.openaiApiKey ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`- Modelo Embedding: ${config.embeddingModel}\n`);

  const client = new CondominioQdrantClient(config);

  try {
    // Teste 1: Conexão
    console.log('🔍 Teste 1: Verificando conexão...');
    const conectado = await client.testarConexao();
    console.log(`Resultado: ${conectado ? '✅ Conectado' : '❌ Falha na conexão'}`);

    if (!conectado) {
      console.log('\n❌ Não foi possível conectar ao Qdrant. Verifique:');
      console.log('- Se o Qdrant está rodando');
      console.log('- Se a URL está correta');
      console.log('- Se a API key está configurada (se necessário)');
      return;
    }

    // Teste 2: Coleção
    console.log('\n🗂️ Teste 2: Verificando coleção...');
    const colecaoExiste = await client.verificarColecao();
    console.log(`Resultado: ${colecaoExiste ? '✅ Coleção encontrada' : '❌ Coleção não encontrada'}`);

    if (!colecaoExiste) {
      console.log('\n❌ Coleção não encontrada. Verifique:');
      console.log('- Se o nome da coleção está correto');
      console.log('- Se a coleção foi criada no Qdrant');
      console.log('- Se há dados na coleção');
      return;
    }

    // Teste 3: Busca básica
    console.log('\n🔍 Teste 3: Testando busca básica...');
    try {
      const resultado = await client.buscarPorTexto('gabriel', 1);
      console.log(`Resultado: ✅ Busca executada (${resultado.total} registros)`);
    } catch (error) {
      console.log(`Resultado: ❌ Erro na busca: ${error}`);
    }

    // Teste 4: Busca com filtros
    console.log('\n⚙️ Teste 4: Testando busca com filtros...');
    try {
      const resultado = await client.buscarComFiltros({ limit: 1, offset: 0 });
      console.log(`Resultado: ✅ Busca com filtros executada (${resultado.total} registros)`);
    } catch (error) {
      console.log(`Resultado: ❌ Erro na busca com filtros: ${error}`);
    }

    console.log('\n✅ Todos os testes concluídos!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Configure seu cliente MCP para usar este servidor');
    console.log('2. Use o arquivo mcp-config.json como referência');
    console.log('3. Execute: npm run build && npm start');

  } catch (error) {
    console.log(`\n❌ Erro durante os testes: ${error}`);
    console.log('\n🔧 Dicas de troubleshooting:');
    console.log('- Verifique se todas as dependências estão instaladas');
    console.log('- Verifique o arquivo .env');
    console.log('- Verifique se o Qdrant está acessível');
  }
}

// Executar testes
testarServidor().catch((error) => {
  console.error('❌ Erro crítico:', error);
  process.exit(1);
});
