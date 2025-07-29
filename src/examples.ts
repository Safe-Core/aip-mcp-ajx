import { CondominioQdrantClient } from './qdrant-client.js';
import { RegistroAcessoSchema } from './types.js';

// Exemplo de configuração e teste do cliente Qdrant
async function exemploUso() {
  // Configuração do cliente
  const client = new CondominioQdrantClient({
    url: 'http://localhost:6333',
    apiKey: undefined, // ou sua API key
    collectionName: 'condominio_access',
  });

  try {
    // Teste de conexão
    console.log('🔍 Testando conexão...');
    const conectado = await client.testarConexao();
    console.log(`Conexão: ${conectado ? '✅' : '❌'}`);

    const colecaoExiste = await client.verificarColecao();
    console.log(`Coleção existe: ${colecaoExiste ? '✅' : '❌'}`);

    if (!conectado || !colecaoExiste) {
      console.log('❌ Verifique a configuração do Qdrant');
      return;
    }

    // Exemplo 1: Busca por texto livre
    console.log('\n📝 Exemplo 1: Busca por texto livre');
    const resultado1 = await client.buscarPorTexto('ALECSANDER SILVA', 5);
    console.log(`Encontrados: ${resultado1.total} registros`);
    
    if (resultado1.records.length > 0) {
      const primeiro = resultado1.records[0];
      console.log(`- ${primeiro.pessoa_nome} (${primeiro.pessoa_documento})`);
      console.log(`- Visitou: ${primeiro.morador_nome}`);
      console.log(`- Entrada: ${primeiro.entrada_datetime}`);
    }

    // Exemplo 2: Busca com filtros
    console.log('\n🔍 Exemplo 2: Busca pessoas ainda dentro');
    const resultado2 = await client.buscarPessoasAindaDentro(10);
    console.log(`Pessoas ainda dentro: ${resultado2.total}`);
    
    resultado2.records.forEach((registro, index) => {
      console.log(`${index + 1}. ${registro.pessoa_nome} - Entrada: ${registro.entrada_datetime}`);
    });

    // Exemplo 3: Histórico de uma pessoa
    console.log('\n📊 Exemplo 3: Histórico de pessoa (documento: 45574290)');
    const resultado3 = await client.buscarHistoricoPessoa('45574290', undefined, undefined, 5);
    console.log(`Registros encontrados: ${resultado3.total}`);
    
    resultado3.records.forEach((registro, index) => {
      console.log(`${index + 1}. ${registro.entrada_datetime} - ${registro.morador_nome}`);
    });

    // Exemplo 4: Busca por veículo
    console.log('\n🚗 Exemplo 4: Busca por veículo (placa: EHP1389)');
    const resultado4 = await client.buscarPorVeiculo('EHP1389', 5);
    console.log(`Registros com este veículo: ${resultado4.total}`);
    
    resultado4.records.forEach((registro, index) => {
      const veiculo = registro.original_record?.veiculo;
      if (veiculo) {
        console.log(`${index + 1}. ${registro.pessoa_nome} - ${veiculo.marca} ${veiculo.modelo}`);
      }
    });

    // Exemplo 5: Busca com filtros complexos
    console.log('\n⚙️ Exemplo 5: Busca com filtros complexos');
    const resultado5 = await client.buscarComFiltros({
      data_inicio: '2025-03-01',
      data_fim: '2025-03-31',
      tem_veiculo: true,
      periodo_dia: 'tarde',
      limit: 5,
    });
    console.log(`Visitas de março (tarde, com veículo): ${resultado5.total}`);

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Exemplo de validação de dados
function exemploValidacao() {
  console.log('\n✅ Exemplo de validação de dados');
  
  // Dados de exemplo baseados no payload fornecido
  const dadosExemplo = {
    pessoa_documento: "45574290",
    pessoa_cidade: "ITAPETININGA", 
    fonte_dados: "sistema_entrada_pessoa",
    tem_destino: true,
    residencia_numero: "236",
    timestamp_indexacao: "2025-07-28T13:47:39.013940",
    // ... resto dos dados do payload
  };

  try {
    const registroValidado = RegistroAcessoSchema.parse(dadosExemplo);
    console.log('✅ Dados válidos!');
    console.log(`Pessoa: ${registroValidado.pessoa_nome}`);
  } catch (error) {
    console.log('❌ Dados inválidos:', error);
  }
}

// Executar exemplos se este arquivo for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🏢 Executando exemplos do Condomínio Access MCP\n');
  
  exemploUso()
    .then(() => {
      exemploValidacao();
      console.log('\n✅ Exemplos concluídos!');
    })
    .catch((error) => {
      console.error('❌ Erro nos exemplos:', error);
    });
}
