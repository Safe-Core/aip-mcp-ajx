// Script para criar índices necessários no Qdrant
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

async function criarIndices() {
  console.log('🔍 Criando índices necessários para filtros no Qdrant');
  console.log('====================================================');

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  const collectionName = process.env.QDRANT_COLLECTION_NAME || 'condominio_access';

  console.log(`📡 Conectando ao Qdrant em ${qdrantUrl}`);
  console.log(`📊 Usando coleção: ${collectionName}`);

  try {
    const client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
    });

    // Lista dos campos que precisam de índices
    const indicesNecessarios = [
      { name: 'ainda_dentro', type: 'bool' },
      { name: 'pessoa_documento', type: 'keyword' },
      { name: 'pessoa_nome', type: 'text' },
      { name: 'morador_nome', type: 'text' },
      { name: 'residencia_numero', type: 'keyword' },
      { name: 'veiculo_placa', type: 'keyword' },
      { name: 'periodo_dia', type: 'keyword' },
      { name: 'dia_semana', type: 'keyword' },
      { name: 'tem_veiculo', type: 'bool' },
      { name: 'entrada_data', type: 'datetime' },
      { name: 'original_record.veiculo.placa', type: 'keyword' },
    ];

    // Verificar e criar índices
    const colecaoInfo = await client.getCollection(collectionName);
    console.log('Informações da coleção obtidas!');
    
    const indicesExistentes = colecaoInfo.payload_schema || {};
    console.log('Índices existentes:', Object.keys(indicesExistentes));

    for (const indice of indicesNecessarios) {
      const { name, type } = indice;
      // Para entrada_data, sempre recriamos o índice como datetime
      if (name === 'entrada_data') {
        console.log(`Recriando índice para '${name}' como tipo '${type}'...`);
        
        try {
          // Primeiro tenta deletar o índice existente
          if (indicesExistentes[name]) {
            console.log(`- Removendo índice existente para '${name}'...`);
            await client.deletePayloadIndex(collectionName, name);
            console.log(`- Índice para '${name}' removido.`);
          }
          
          // Cria o novo índice com tipo datetime
          await client.createPayloadIndex(collectionName, {
            field_name: name,
            field_schema: 'datetime',
          });
          console.log(`✅ Índice para '${name}' recriado como datetime com sucesso!`);
        } catch (error) {
          console.error(`❌ Erro ao recriar índice para '${name}':`, error);
        }
      }
      // Para os demais índices, só criamos se não existirem
      else if (!indicesExistentes[name]) {
        console.log(`Criando índice para campo '${name}' do tipo '${type}'...`);
        
        try {
          if (type === 'keyword') {
            await client.createPayloadIndex(collectionName, {
              field_name: name,
              field_schema: 'keyword',
            });
          } else if (type === 'text') {
            await client.createPayloadIndex(collectionName, {
              field_name: name,
              field_schema: 'text',
            });
          } else if (type === 'bool') {
            await client.createPayloadIndex(collectionName, {
              field_name: name,
              field_schema: 'bool',
            });
          } else if (type === 'datetime') {
            await client.createPayloadIndex(collectionName, {
              field_name: name,
              field_schema: 'datetime',
            });
          }
          console.log(`✅ Índice para '${name}' criado com sucesso!`);
        } catch (error) {
          console.error(`❌ Erro ao criar índice para '${name}':`, error);
        }
      } else {
        console.log(`✓ Índice para '${name}' já existe.`);
      }
    }

    console.log('\n✅ Processo de verificação e criação de índices concluído!');
    console.log('Agora tente executar suas buscas com filtros novamente.');

  } catch (error) {
    console.error('❌ Erro ao conectar ou gerenciar índices:', error);
  }
}

criarIndices()
  .catch((error) => {
    console.error('Erro fatal:', error);
  });
