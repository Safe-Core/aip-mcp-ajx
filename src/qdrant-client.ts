import { QdrantClient } from '@qdrant/js-client-rest';
import { RegistroAcesso, BuscaParametrosInput, RegistroAcessoSchema } from './types.js';
import OpenAI from 'openai';

export interface QdrantSearchResult {
  records: RegistroAcesso[];
  total: number;
  hasMore: boolean;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
  openaiApiKey?: string;
  embeddingModel?: string;
}

export class CondominioQdrantClient {
  private client: QdrantClient;
  private collectionName: string;
  private openaiClient?: OpenAI;
  private embeddingModel: string;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName;
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    
    // Inicializa cliente OpenAI se a API key estiver configurada
    if (config.openaiApiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openaiApiKey,
      });
    }
  }

  /**
   * Busca semântica por texto livre
   */
  async buscarPorTexto(
    query: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<QdrantSearchResult> {
    try {
      // Verifica se o texto de consulta parece ser um nome de pessoa
      if (this.verificaSeEhNomePessoa(query)) {
        try {
          // Se parece ser um nome, usa a busca avançada com mais prioridade para visitantes
          return await this.buscarPorTextoAvancado(query, limit, offset, 0.5);
        } catch (error) {
          console.error('Erro na busca avançada por nome:', error);
          // Continua com a busca padrão se falhar
        }
      }
      
      // Busca padrão
      const queryPreparada = this.prepararTextoParaBusca(query);
      const searchResult = await this.client.search(this.collectionName, {
        vector: await this.generateEmbedding(queryPreparada),
        limit,
        offset,
        with_payload: true,
        with_vector: false,
      });

      const records = searchResult.map(result => {
        const validated = RegistroAcessoSchema.parse(result.payload);
        return validated;
      });

      return {
        records,
        total: records.length,
        hasMore: records.length === limit,
      };
    } catch (error) {
      console.error('Erro na busca por texto:', error);
      throw new Error(`Falha na busca por texto: ${error}`);
    }
  }

  /**
   * Busca estruturada com filtros
   */
  async buscarComFiltros(params: BuscaParametrosInput): Promise<QdrantSearchResult> {
    try {
      // Define valores padrão para parâmetros opcionais
      const limit = params.limit ?? 10;
      const offset = params.offset ?? 0;
      
      const filter = this.buildFilter(params);
      
      let searchResult;

      if (params.query) {
        // Busca híbrida: semântica + filtros
        searchResult = await this.client.search(this.collectionName, {
          vector: await this.generateEmbedding(params.query),
          filter,
          limit,
          offset,
          with_payload: true,
          with_vector: false,
        });
      } else {
        // Busca apenas por filtros
        searchResult = await this.client.scroll(this.collectionName, {
          filter,
          limit,
          offset,
          with_payload: true,
          with_vector: false,
        });
      }

      const records = searchResult.points?.map(result => {
        const validated = RegistroAcessoSchema.parse(result.payload);
        return validated;
      }) || [];

      return {
        records,
        total: records.length,
        hasMore: records.length === limit,
      };
    } catch (error) {
      console.error('Erro na busca com filtros:', error);
      throw new Error(`Falha na busca com filtros: ${error}`);
    }
  }

  /**
   * Busca pessoas que ainda estão dentro do condomínio
   */
  async buscarPessoasAindaDentro(limit: number = 10): Promise<QdrantSearchResult> {
    return this.buscarComFiltros({
      ainda_dentro: true,
      limit,
      offset: 0,
    });
  }

  /**
   * Busca histórico de uma pessoa específica
   */
  async buscarHistoricoPessoa(
    documento: string,
    dataInicio?: string,
    dataFim?: string,
    limit: number = 20
  ): Promise<QdrantSearchResult> {
    return this.buscarComFiltros({
      pessoa_documento: documento,
      data_inicio: dataInicio,
      data_fim: dataFim,
      limit,
      offset: 0,
    });
  }

  /**
   * Busca visitas para um morador específico
   */
  async buscarVisitasMorador(
    moradorNome: string,
    dataInicio?: string,
    dataFim?: string,
    limit: number = 20
  ): Promise<QdrantSearchResult> {
    return this.buscarComFiltros({
      morador_nome: moradorNome,
      data_inicio: dataInicio,
      data_fim: dataFim,
      limit,
      offset: 0,
    });
  }

  /**
   * Busca por placa de veículo
   */
  async buscarPorVeiculo(placa: string, limit: number = 10): Promise<QdrantSearchResult> {
    return this.buscarComFiltros({
      veiculo_placa: placa,
      limit,
      offset: 0,
    });
  }

  /**
   * Constrói filtros para o Qdrant baseado nos parâmetros
   */
  private buildFilter(params: BuscaParametrosInput): any {
    const conditions: any[] = [];

    if (params.pessoa_nome) {
      // Filtro mais flexível para nomes de pessoas, usando should para verificar em múltiplos campos
      conditions.push({
        should: [
          {
            key: 'pessoa_nome',
            match: { text: params.pessoa_nome }
          },
          {
            key: 'original_record.busca_otimizada.nomes_relacionados',
            match: { text: params.pessoa_nome }
          }
        ]
      });
    }

    if (params.pessoa_documento) {
      conditions.push({
        key: 'pessoa_documento',
        match: { value: params.pessoa_documento }
      });
    }

    if (params.morador_nome) {
      conditions.push({
        key: 'morador_nome',
        match: { text: params.morador_nome }
      });
    }

    if (params.residencia_numero) {
      conditions.push({
        key: 'residencia_numero',
        match: { value: params.residencia_numero }
      });
    }

    if (params.residencia_rua) {
      conditions.push({
        key: 'residencia_rua',
        match: { value: params.residencia_rua }
      });
    }

    if (params.veiculo_placa) {
      conditions.push({
        key: 'original_record.veiculo.placa',
        match: { value: params.veiculo_placa }
      });
    }

    if (params.data_inicio) {
      conditions.push({
        key: 'entrada_data',
        range: { gte: params.data_inicio + 'T00:00:00' }
      });
    }

    if (params.data_fim) {
      conditions.push({
        key: 'entrada_data',
        range: { lte: params.data_fim + 'T23:59:59' }
      });
    }

    if (params.ainda_dentro !== undefined) {
      conditions.push({
        key: 'ainda_dentro',
        match: { value: params.ainda_dentro }
      });
    }

    if (params.tem_veiculo !== undefined) {
      conditions.push({
        key: 'tem_veiculo',
        match: { value: params.tem_veiculo }
      });
    }

    if (params.periodo_dia) {
      conditions.push({
        key: 'periodo_dia',
        match: { value: params.periodo_dia }
      });
    }

    if (params.dia_semana) {
      conditions.push({
        key: 'dia_semana',
        match: { value: params.dia_semana }
      });
    }

    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  /**
   * Busca semântica avançada com preparação de texto otimizada
   */
  async buscarPorTextoAvancado(
    query: string,
    limit: number = 10,
    offset: number = 0,
    scoreThreshold: number = 0.55 // Reduzido para capturar mais resultados
  ): Promise<QdrantSearchResult> {
    try {
      // Prepara o texto da query para melhor matching
      const queryPreparada = this.prepararTextoParaBusca(query);
      
      // Verifica se a consulta parece ser uma busca por nome de pessoa
      const pareceSerNomePessoa = this.verificaSeEhNomePessoa(query);
      
      // Se parece ser nome de pessoa, vamos fazer uma busca híbrida
      if (pareceSerNomePessoa) {
        // Primeira tentativa: busca direta com filtro pessoa_nome
        const nomeFiltrado = query.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase().trim();
          
        try {
          // Faz busca híbrida: por filtro e vetor
          const searchResult = await this.client.search(this.collectionName, {
            vector: await this.generateEmbedding(queryPreparada),
            filter: {
              should: [
                // Verifica se o nome está no campo pessoa_nome (maior peso para visitante)
                { 
                  key: 'pessoa_nome',
                  match: { text: nomeFiltrado } 
                },
                // Ou nos nomes_relacionados (via busca_otimizada)
                {
                  key: 'original_record.busca_otimizada.nomes_relacionados',
                  match: { text: nomeFiltrado }
                }
              ]
            },
            limit,
            offset,
            score_threshold: scoreThreshold,
            with_payload: true,
            with_vector: false,
          });

          // Se encontrou resultados, ótimo
          if (searchResult.length > 0) {
            const records = searchResult.map(result => {
              const validated = RegistroAcessoSchema.parse(result.payload);
              return validated;
            });
            
            return {
              records,
              total: records.length,
              hasMore: records.length === limit,
            };
          }
        } catch (err) {
          console.error('Erro na busca híbrida:', err);
          // Continua com a busca padrão se falhar
        }
      }
      
      // Busca padrão se não for nome de pessoa ou se a busca com filtro não retornou resultados
      const searchResult = await this.client.search(this.collectionName, {
        vector: await this.generateEmbedding(queryPreparada),
        limit,
        offset,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false,
      });

      const records = searchResult.map(result => {
        const validated = RegistroAcessoSchema.parse(result.payload);
        return validated;
      });

      return {
        records,
        total: records.length,
        hasMore: records.length === limit,
      };
    } catch (error) {
      console.error('Erro na busca avançada por texto:', error);
      throw new Error(`Falha na busca avançada por texto: ${error}`);
    }
  }

  /**
   * Prepara texto para busca otimizada
   */
  private prepararTextoParaBusca(texto: string): string {
    // Remove caracteres especiais e normaliza
    let textoPreparado = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toUpperCase()
      .trim();

    // Adiciona contexto para melhorar a busca semântica, priorizando visitante (pessoa)
    const contextos = [
      'VISITANTE',
      'PESSOA',
      'DOCUMENTO',
      'NOME COMPLETO',
      'Registro de acesso condomínio',
      'Entrada saída veículo',
      'Controle acesso portaria'
    ];

    // Verifica se o texto contém palavras-chave que sugerem busca por visitante
    const palavrasVisitante = ['VISITA', 'VISITANTE', 'PESSOA', 'PEDREIRO', 'FAXINEIRO', 'ENTREGADOR', 'MOTORISTA', 'PRESTADOR', 'PRESTADOR DE SERVIÇO'];
    
    // Se a query é curta, adiciona contexto
    if (textoPreparado.length < 50) {
      const temPalavraVisitante = palavrasVisitante.some(palavra => textoPreparado.includes(palavra));
      
      if (!temPalavraVisitante) {
        // Duplica o texto de busca para dar mais peso ao visitante
        textoPreparado = `PESSOA NOME ${textoPreparado} VISITANTE ${textoPreparado} ${contextos.join(' ')} ${textoPreparado}`;
      } else {
        textoPreparado = `${contextos.join(' ')} ${textoPreparado}`;
      }
    }

    return textoPreparado;
  }

  /**
   * Verifica se o texto de consulta parece ser um nome de pessoa
   */
  private verificaSeEhNomePessoa(texto: string): boolean {
    // Normaliza e limpa o texto
    const textoNormalizado = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    
    // Palavras que indicam referência explícita a um morador
    const palavrasChaveMorador = ['MORADOR', 'RESIDENTE', 'PROPRIETARIO', 'APARTAMENTO', 'QUADRA'];
    
    // Se contém palavras-chave de morador, não considerar como busca por pessoa/visitante
    if (palavrasChaveMorador.some(palavra => textoNormalizado.includes(palavra))) {
      return false;
    }
    
    // Se tem menos de 3 palavras, é provavelmente uma busca mais genérica
    const palavras = textoNormalizado.split(/\s+/);
    if (palavras.length < 2) {
      return false;
    }
    
    // Termos comuns em nomes próprios (como preposições) que não contam como palavras significativas
    const preposicoes = ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'];
    
    // Conta palavras significativas (não preposições)
    const palavrasSignificativas = palavras.filter(palavra => 
      !preposicoes.includes(palavra) && palavra.length > 1
    );
    
    // Se tiver pelo menos 2 palavras significativas, provavelmente é um nome
    return palavrasSignificativas.length >= 2;
  }
  /**
   * Verifica a conexão com o Qdrant e retorna informações da coleção
   */
  async verificarConexao(): Promise<any> {
    try {
      // Verifica se o cliente está conectado obtendo informações da coleção
      const colecaoInfo = await this.client.getCollection(this.collectionName);
      
      // Obtém contagem de pontos na coleção
      const contagem = await this.client.count(this.collectionName);
      
      return {
        status: "conectado",
        collectionName: this.collectionName,
        vetoresCount: colecaoInfo.vectors_count,
        pontos: contagem.count,
        dimensao: colecaoInfo.config?.params?.vectors?.size || 0,
        tipo_distancia: colecaoInfo.config?.params?.vectors?.distance || "unknown"
      };
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      throw new Error(`Falha ao verificar conexão com Qdrant: ${error}`);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiClient) {
      throw new Error('Cliente OpenAI não configurado. Verifique se OPENAI_API_KEY está definida.');
    }

    try {
      // Limita o texto para evitar problemas com tokens
      const maxLength = 8000; // Aproximadamente 8000 caracteres = ~2000 tokens
      const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

      const response = await this.openaiClient.embeddings.create({
        model: this.embeddingModel,
        input: truncatedText,
        encoding_format: 'float',
      });

      if (response.data && response.data.length > 0) {
        return response.data[0].embedding;
      } else {
        throw new Error('Resposta inválida da API de embeddings');
      }
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw new Error(`Falha ao gerar embedding: ${error}`);
    }
  }

  /**
   * Testa a conexão com o Qdrant
   */
  async testarConexao(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      console.error('Erro na conexão com Qdrant:', error);
      return false;
    }
  }

  /**
   * Verifica se a coleção existe
   */
  async verificarColecao(): Promise<boolean> {
    try {
      await this.client.getCollection(this.collectionName);
      return true;
    } catch (error) {
      console.error(`Coleção ${this.collectionName} não encontrada:`, error);
      return false;
    }
  }
}
