// Teste específico para buscar_visitas_morador
import { CondominioQdrantClient } from './qdrant-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testarVisitasMorador() {
  console.log('🔍 Teste da função buscar_visitas_morador');
  console.log('=========================================');

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'condominio_access';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.error('❌ API Key da OpenAI não configurada! Defina OPENAI_API_KEY no arquivo .env');
    return;
  }

  console.log(`📡 Conectando ao Qdrant em ${qdrantUrl}`);
  console.log(`📊 Usando coleção: ${collectionName}`);

  try {
    // Cria cliente
    const client = new CondominioQdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
      collectionName,
      openaiApiKey
    });

    // Teste 1: Verifica conexão básica
    console.log('\n🔌 Verificando conexão com Qdrant...');
    const conexaoOk = await client.testarConexao();
    if (conexaoOk) {
      console.log('✅ Conexão com Qdrant estabelecida!');
    } else {
      console.error('❌ Não foi possível conectar ao Qdrant.');
      return;
    }

    // Teste 2: Verifica existência da coleção
    const colecaoExiste = await client.verificarColecao();
    console.log(`Coleção ${collectionName}: ${colecaoExiste ? '✅ Encontrada' : '❌ Não encontrada'}`);
    if (!colecaoExiste) {
      console.error('❌ Coleção não encontrada. Verifique se a coleção foi criada no Qdrant.');
      return;
    }

    // Teste 3: buscarVisitasMorador sem data_inicio/data_fim
    console.log('\n🏠 Teste 1: buscarVisitasMorador sem datas');
    try {
      // O nome exato do morador deve estar presente na sua base
      const moradorNome = 'NICOLAS MORAES SALVADOR (A10-236)'; // Use um nome de morador que existe nos seus dados
      console.log(`Buscando visitas para morador: "${moradorNome}"`);
      
      const resultado = await client.buscarVisitasMorador(moradorNome, undefined, undefined, 5);
      console.log(`✅ Sucesso! Encontrados: ${resultado.total} registros`);
      
      if (resultado.total > 0) {
        console.log('\nPrimeiros registros encontrados:');
        resultado.records.forEach((registro, i) => {
          console.log(`${i + 1}. Visitante: ${registro.pessoa_nome} - Entrada: ${registro.entrada_datetime}`);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar visitas:', error);
      
      // Investigação detalhada do erro
      if (error instanceof Error) {
        console.log('\nDetalhes do erro:');
        console.log('- Mensagem:', error.message);
        console.log('- Stack:', error.stack);
        
        // Verifica se o erro possui detalhes adicionais
        const anyError = error as any;
        if (anyError.data && anyError.data.status && anyError.data.status.error) {
          console.log('- Erro específico do Qdrant:', anyError.data.status.error);
        }
      }
    }

    // Teste 4: buscarVisitasMorador com data_inicio/data_fim
    console.log('\n🏠 Teste 2: buscarVisitasMorador com datas');
    try {
      // O nome exato do morador deve estar presente na sua base
      const moradorNome = 'NICOLAS MORAES SALVADOR (A10-236)'; // Use um nome de morador que existe nos seus dados
      const dataInicio = '2025-03-01';
      const dataFim = '2025-03-31';
      
      console.log(`Buscando visitas para morador: "${moradorNome}" (${dataInicio} a ${dataFim})`);
      
      const resultado = await client.buscarVisitasMorador(moradorNome, dataInicio, dataFim, 5);
      console.log(`✅ Sucesso! Encontrados: ${resultado.total} registros`);
      
      if (resultado.total > 0) {
        console.log('\nPrimeiros registros encontrados:');
        resultado.records.forEach((registro, i) => {
          console.log(`${i + 1}. Visitante: ${registro.pessoa_nome} - Entrada: ${registro.entrada_datetime}`);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar visitas com datas:', error);
      
      // Investigação detalhada do erro
      if (error instanceof Error) {
        console.log('\nDetalhes do erro:');
        console.log('- Mensagem:', error.message);
        console.log('- Stack:', error.stack);
        
        // Verifica se o erro possui detalhes adicionais
        const anyError = error as any;
        if (anyError.data && anyError.data.status && anyError.data.status.error) {
          console.log('- Erro específico do Qdrant:', anyError.data.status.error);
        }
      }
    }

    console.log('\n✅ Testes concluídos!');
  } catch (error) {
    console.error('❌ Erro fatal durante os testes:', error);
  }
}

testarVisitasMorador()
  .catch(error => {
    console.error('Erro não tratado:', error);
  });
