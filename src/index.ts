#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { CondominioQdrantClient, QdrantConfig } from './qdrant-client.js';
import { BuscaParametrosSchema, RegistroAcesso } from './types.js';
import { FirestoreService } from './firestore-service.js';
import { defaultFirebaseConfig, isValidFirebaseConfig } from './firebase-config.js';
import { TrackingVisualizer, TrackingVisualizationOptions } from './tracking-visualizer.js';

dotenv.config();

class CondominioAccessMCPServer {
  private server: Server;
  private qdrantClient: CondominioQdrantClient;
  private firestoreService: FirestoreService;

  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'condominio-access-mcp',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Configuração do cliente Qdrant
    const qdrantConfig: QdrantConfig = {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION_NAME || 'condominio_access',
      openaiApiKey: process.env.OPENAI_API_KEY,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    };

    // Inicializa serviços
    this.qdrantClient = new CondominioQdrantClient(qdrantConfig);
    
    // Verifica se a configuração do Firebase é válida antes de inicializar
    const firebaseConfig = defaultFirebaseConfig;
    if (isValidFirebaseConfig(firebaseConfig)) {
      console.log('Configuração Firebase válida, iniciando serviço...');
      this.firestoreService = new FirestoreService(firebaseConfig);
    } else {
      console.warn('Configuração do Firebase incompleta ou inválida.');
      console.warn('Funcionalidades de rastreamento não estarão disponíveis.');
      // Inicializa mesmo assim para evitar erros de null/undefined
      this.firestoreService = new FirestoreService(firebaseConfig);
    }
    
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // Handler para listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'buscar_acesso_texto',
            description: 'Busca registros de acesso por texto livre usando busca semântica',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Texto para busca semântica (nomes, documentos, placas, etc.)',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 10)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
                offset: {
                  type: 'number',
                  description: 'Número de resultados para pular (padrão: 0)',
                  minimum: 0,
                  default: 0,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'buscar_acesso_texto_avancado',
            description: 'Busca semântica avançada com otimizações de texto e threshold de score',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Texto para busca semântica avançada',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 10)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
                offset: {
                  type: 'number',
                  description: 'Número de resultados para pular (padrão: 0)',
                  minimum: 0,
                  default: 0,
                },
                score_threshold: {
                  type: 'number',
                  description: 'Threshold mínimo de score de similaridade (padrão: 0.55)',
                  minimum: 0,
                  maximum: 1,
                  default: 0.55,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'buscar_acesso_filtros',
            description: 'Busca registros de acesso com filtros estruturados',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Busca semântica adicional (opcional)',
                },
                pessoa_nome: {
                  type: 'string',
                  description: 'Nome da pessoa',
                },
                pessoa_documento: {
                  type: 'string',
                  description: 'Documento da pessoa (CPF, RG, etc.)',
                },
                morador_nome: {
                  type: 'string',
                  description: 'Nome do morador visitado',
                },
                residencia_numero: {
                  type: 'string',
                  description: 'Número da residência',
                },
                residencia_rua: {
                  type: 'string',
                  description: 'Rua da residência',
                },
                veiculo_placa: {
                  type: 'string',
                  description: 'Placa do veículo',
                },
                data_inicio: {
                  type: 'string',
                  description: 'Data de início (formato: YYYY-MM-DD)',
                },
                data_fim: {
                  type: 'string',
                  description: 'Data de fim (formato: YYYY-MM-DD)',
                },
                ainda_dentro: {
                  type: 'boolean',
                  description: 'Se a pessoa ainda está dentro do condomínio',
                },
                tem_veiculo: {
                  type: 'boolean',
                  description: 'Se a pessoa possui veículo',
                },
                periodo_dia: {
                  type: 'string',
                  enum: ['manha', 'tarde', 'noite'],
                  description: 'Período do dia',
                },
                dia_semana: {
                  type: 'string',
                  enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'],
                  description: 'Dia da semana',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 10)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
                offset: {
                  type: 'number',
                  description: 'Número de resultados para pular (padrão: 0)',
                  minimum: 0,
                  default: 0,
                },
              },
              required: [],
            },
          },
          {
            name: 'buscar_pessoas_dentro',
            description: 'Lista pessoas que ainda estão dentro do condomínio',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 10)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
              },
              required: [],
            },
          },
          {
            name: 'buscar_historico_pessoa',
            description: 'Busca histórico completo de acesso de uma pessoa específica',
            inputSchema: {
              type: 'object',
              properties: {
                documento: {
                  type: 'string',
                  description: 'Documento da pessoa (CPF, RG, etc.)',
                },
                data_inicio: {
                  type: 'string',
                  description: 'Data de início (formato: YYYY-MM-DD)',
                },
                data_fim: {
                  type: 'string',
                  description: 'Data de fim (formato: YYYY-MM-DD)',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 20)',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
              },
              required: ['documento'],
            },
          },
          {
            name: 'buscar_visitas_morador',
            description: 'Busca todas as visitas recebidas por um morador específico',
            inputSchema: {
              type: 'object',
              properties: {
                morador_nome: {
                  type: 'string',
                  description: 'Nome do morador',
                },
                data_inicio: {
                  type: 'string',
                  description: 'Data de início (formato: YYYY-MM-DD)',
                },
                data_fim: {
                  type: 'string',
                  description: 'Data de fim (formato: YYYY-MM-DD)',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 20)',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
              },
              required: ['morador_nome'],
            },
          },
          {
            name: 'buscar_por_veiculo',
            description: 'Busca registros de acesso por placa de veículo',
            inputSchema: {
              type: 'object',
              properties: {
                placa: {
                  type: 'string',
                  description: 'Placa do veículo',
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (padrão: 10)',
                  minimum: 1,
                  maximum: 100,
                  default: 10,
                },
              },
              required: ['placa'],
            },
          },
          {
            name: 'verificar_conexao',
            description: 'Verifica a conexão com o banco de dados Qdrant',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'buscar_rastreamento_visitante',
            description: 'Busca informações de rastreamento de um visitante no Firestore',
            inputSchema: {
              type: 'object',
              properties: {
                nome_visitante: {
                  type: 'string',
                  description: 'Nome do visitante para buscar no Firestore'
                },
                incluir_mapa_html: {
                  type: 'boolean',
                  description: 'Incluir mapa HTML com a visualização do rastreamento',
                  default: false
                },
                incluir_mapa_svg: {
                  type: 'boolean',
                  description: 'Incluir mapa SVG com a visualização do rastreamento',
                  default: false
                }
              },
              required: ['nome_visitante'],
            },
          },
          {
            name: 'buscar_acesso_com_rastreamento',
            description: 'Busca registros de acesso e informações de rastreamento para visitantes',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Texto para busca semântica (opcional)',
                },
                pessoa_nome: {
                  type: 'string',
                  description: 'Nome da pessoa',
                },
                pessoa_documento: {
                  type: 'string',
                  description: 'Documento da pessoa (CPF, RG, etc.)',
                },
                morador_nome: {
                  type: 'string',
                  description: 'Nome do morador visitado',
                },
                limite_registros: {
                  type: 'number',
                  description: 'Número máximo de registros de acesso (padrão: 5)',
                  default: 5
                },
                incluir_mapa_html: {
                  type: 'boolean',
                  description: 'Incluir mapa HTML com a visualização do rastreamento',
                  default: false
                },
                incluir_mapa_svg: {
                  type: 'boolean',
                  description: 'Incluir mapa SVG com a visualização do rastreamento',
                  default: true
                }
              },
              required: [],
            },
          },
        ],
      };
    });

    // Handler para executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'buscar_acesso_texto':
            return await this.buscarAcessoTexto(args);

          case 'buscar_acesso_texto_avancado':
            return await this.buscarAcessoTextoAvancado(args);

          case 'buscar_acesso_filtros':
            return await this.buscarAcessoFiltros(args);

          case 'buscar_pessoas_dentro':
            return await this.buscarPessoasDentro(args);

          case 'buscar_historico_pessoa':
            return await this.buscarHistoricoPessoa(args);

          case 'buscar_visitas_morador':
            return await this.buscarVisitasMorador(args);

          case 'buscar_por_veiculo':
            return await this.buscarPorVeiculo(args);

          case 'verificar_conexao':
            return await this.verificarConexao();
            
          case 'buscar_rastreamento_visitante':
            return await this.buscarRastreamentoVisitante(args);
            
          case 'buscar_acesso_com_rastreamento':
            return await this.buscarAcessoComRastreamento(args);

          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erro ao executar ${name}: ${error}`,
            },
          ],
        };
      }
    });
  }

  private async buscarAcessoTexto(args: any) {
    const { query, limit = 10, offset = 0 } = args;
    
    const resultado = await this.qdrantClient.buscarPorTexto(query, limit, offset);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado),
        },
      ],
    };
  }

  private async buscarAcessoTextoAvancado(args: any) {
    const { query, limit = 10, offset = 0, score_threshold = 0.55 } = args;
    
    const resultado = await this.qdrantClient.buscarPorTextoAvancado(query, limit, offset, score_threshold);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado, `Busca avançada (score ≥ ${score_threshold})`),
        },
      ],
    };
  }

  private async buscarAcessoFiltros(args: any) {
    // Valida e aplica valores padrão usando o schema
    const parametros = BuscaParametrosSchema.parse(args);
    
    const resultado = await this.qdrantClient.buscarComFiltros(parametros);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado),
        },
      ],
    };
  }

  private async buscarPessoasDentro(args: any) {
    const { limit = 10 } = args;
    
    const resultado = await this.qdrantClient.buscarPessoasAindaDentro(limit);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado, 'Pessoas ainda dentro do condomínio'),
        },
      ],
    };
  }

  private async buscarHistoricoPessoa(args: any) {
    const { documento, data_inicio, data_fim, limit = 20 } = args;
    
    const resultado = await this.qdrantClient.buscarHistoricoPessoa(
      documento, 
      data_inicio, 
      data_fim, 
      limit
    );
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado, `Histórico de acesso - Documento: ${documento}`),
        },
      ],
    };
  }

  private async buscarVisitasMorador(args: any) {
    const { morador_nome, data_inicio, data_fim, limit = 20 } = args;
    
    const resultado = await this.qdrantClient.buscarVisitasMorador(
      morador_nome, 
      data_inicio, 
      data_fim, 
      limit
    );
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado, `Visitas para o morador: ${morador_nome}`),
        },
      ],
    };
  }

  private async buscarPorVeiculo(args: any) {
    const { placa, limit = 10 } = args;
    
    const resultado = await this.qdrantClient.buscarPorVeiculo(placa, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatarResultados(resultado, `Registros do veículo: ${placa}`),
        },
      ],
    };
  }

  private async verificarConexao() {
    try {
      const conexaoOk = await this.qdrantClient.testarConexao();
      const colecaoOk = await this.qdrantClient.verificarColecao();
      
      const status = conexaoOk && colecaoOk ? '✅ Conectado' : '❌ Erro de conexão';
      const detalhes = [
        `Conexão Qdrant: ${conexaoOk ? '✅' : '❌'}`,
        `Coleção existe: ${colecaoOk ? '✅' : '❌'}`,
      ].join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `${status}\n\nDetalhes:\n${detalhes}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao verificar conexão: ${error}`,
          },
        ],
      };
    }
  }

  private formatarResultados(resultado: any, titulo?: string): string {
    const { records, total, hasMore } = resultado;
    
    let output = titulo ? `# ${titulo}\n\n` : '';
    output += `📊 **${total} registro(s) encontrado(s)**${hasMore ? ' (há mais resultados disponíveis)' : ''}\n\n`;
    
    if (records.length === 0) {
      output += '❌ Nenhum registro encontrado com os critérios especificados.';
      return output;
    }
    
    records.forEach((registro: RegistroAcesso, index: number) => {
      output += `## Registro ${index + 1} - ID: ${registro.id}\n\n`;
      output += `**Pessoa:** ${registro.pessoa_nome}\n`;
      output += `**Documento:** ${registro.pessoa_documento}\n`;
      output += `**Destino:** ${registro.morador_nome} - ${registro.residencia_endereco}\n`;
      output += `**Entrada:** ${registro.entrada_datetime}\n`;
      output += `**Saída:** ${registro.saida_datetime}\n`;
      output += `**Permanência:** ${registro.tempo_permanencia_minutos} minutos\n`;
      output += `**Status:** ${registro.ainda_dentro ? 'Ainda dentro' : 'Saiu'}\n`;
      
      if (registro.tem_veiculo && registro.original_record?.veiculo) {
        const veiculo = registro.original_record.veiculo;
        output += `**Veículo:** ${veiculo.marca} ${veiculo.modelo} ${veiculo.cor} - ${veiculo.placa}\n`;
      }
      
      output += `**Período:** ${registro.periodo_dia} - ${registro.dia_semana}\n`;
      output += '\n---\n\n';
    });
    
    return output;
  }
  
  /**
   * Busca informações de rastreamento de um visitante específico
   */
  private async buscarRastreamentoVisitante(args: any) {
    try {
      const { nome_visitante, incluir_mapa_html = false, incluir_mapa_svg = false } = args;
      
      console.log(`Buscando rastreamento para visitante: ${nome_visitante}`);
      
      // Verifica se temos nome de visitante
      if (!nome_visitante || nome_visitante.trim() === '') {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Nome de visitante não fornecido ou inválido.**\n\nPor favor, forneça um nome de visitante válido.`,
            },
          ],
        };
      }
      
      // Busca o rastreamento no Firestore dentro da coleção 'tokens'
      const rastreamentoResult = await this.firestoreService.buscarRastreamentoCompleto(nome_visitante);
      
      let output = `# Rastreamento do visitante: ${nome_visitante}\n\n`;
      
      // Se não encontrou o visitante
      if (!rastreamentoResult.visitante) {
        output += `❌ **Visitante não encontrado no sistema de rastreamento.**\n\n`;
        output += `O nome "${nome_visitante}" não foi encontrado na base de dados do Firestore ou o serviço de rastreamento não está acessível.`;
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
      
      // Informações do visitante encontrado
      const visitante = rastreamentoResult.visitante;
      output += `## Informações do visitante\n\n`;
      output += `- **Nome:** ${visitante.display_name}\n`;
      output += `- **ID:** ${visitante.uid}\n`;
      
      if (visitante.email) {
        output += `- **Email:** ${visitante.email}\n`;
      }
      
      if (visitante.phone_number) {
        output += `- **Telefone:** ${visitante.phone_number}\n`;
      }
      
      output += `\n## Rastreamento\n\n`;
      
      // Verifica se existem tokens na coleção 'tokens' associados ao visitante
      if (!rastreamentoResult.tokens || rastreamentoResult.tokens.length === 0) {
        output += `❌ **Sem rastreadores associados**\n\n`;
        output += `Este visitante não possui rastreadores (SafeTags) associados na coleção 'tokens'.`;
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
      
      // Informações dos tokens da coleção 'tokens'
      output += `**${rastreamentoResult.totalTokens} rastreador(es) encontrado(s) com ${rastreamentoResult.stepsCount} pontos de localização**\n\n`;
      output += `**Detalhes dos rastreadores:**\n`;
      
      // Adiciona informações específicas dos tokens
      rastreamentoResult.tokens.forEach((token: any, index: number) => {
        if (token) {
          output += `\n### Rastreador ${index + 1}: ${token.token_name || token.name || 'Sem nome'}\n`;
          output += `- **ID do dispositivo:** ${token.deviceId || 'N/A'}\n`;
          output += `- **Status:** ${token.status || (token.active ? 'Ativo' : 'Inativo') || 'N/A'}\n`;
          output += `- **Última atualização:** ${token.last_updated ? new Date(token.last_updated.seconds * 1000).toLocaleString() : 'N/A'}\n`;
          output += `- **Última posição conhecida:** ${token.last_seen || 'N/A'}\n`;
          if (token.last_speed_kmh !== undefined) {
            output += `- **Última velocidade:** ${token.last_speed_kmh_txt || token.last_speed_kmh} km/h\n`;
          }
          output += `- **Tag:** ${token.tag || 'N/A'}\n`;
          
          // Adiciona informações sobre os steps (pontos de localização)
          if (token.steps && token.steps.length > 0) {
            output += `\n**Histórico de localização: ${token.steps.length} pontos registrados**\n`;
            
            // Mostra informações resumidas do primeiro e último ponto
            const firstStep = token.steps[0];
            const lastStep = token.steps[token.steps.length - 1];
            
            output += `- **Primeiro registro:** ${new Date(firstStep.timestamp || firstStep.created_at).toLocaleString()}\n`;
            output += `- **Último registro:** ${new Date(lastStep.timestamp || lastStep.created_at).toLocaleString()}\n`;
            
            // Calcular a distância total percorrida se tivermos mais de um ponto
            if (token.steps.length > 1) {
              // Adicionar informação sobre a rota
              output += `- **Origem:** ${firstStep.last_seen || `${firstStep.latitude}, ${firstStep.longitude}`}\n`;
              output += `- **Destino:** ${lastStep.last_seen || `${lastStep.latitude}, ${lastStep.longitude}`}\n`;
            }
          } else {
            output += `\n**Sem dados de localização disponíveis para este token**\n`;
          }
        }
      });
      
      // Processa visualizações
      const opcoes: TrackingVisualizationOptions = {
        includeHtml: incluir_mapa_html,
        includeSvg: incluir_mapa_svg,
        includeText: true,
        width: 800,
        height: 500,
        showLabels: true
      };
      
      const visualizacoes = TrackingVisualizer.gerarVisualizacoes(rastreamentoResult.tokens, opcoes);
      
      // Adiciona texto do histórico
      if (visualizacoes.text) {
        output += visualizacoes.text;
      }
      
      // Prepara a resposta
      const resposta: any = {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
      
      // Se solicitou mapa SVG
      if (incluir_mapa_svg && visualizacoes.svg) {
        resposta.content.push({
          type: 'artifact',
          artifactType: 'image/svg+xml',
          artifactId: 'mapa-rastreamento-svg',
          title: 'Mapa de Rastreamento (SVG)',
          data: visualizacoes.svg
        });
      }
      
      // Se solicitou mapa HTML
      if (incluir_mapa_html && visualizacoes.html) {
        resposta.content.push({
          type: 'artifact',
          artifactType: 'text/html',
          artifactId: 'mapa-rastreamento-html',
          title: 'Mapa de Rastreamento (HTML)',
          data: visualizacoes.html
        });
      }
      
      return resposta;
    } catch (error) {
      console.error('Erro ao buscar rastreamento:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao buscar rastreamento: ${error}`,
          },
        ],
      };
    }
  }
  
  /**
   * Busca registros de acesso e informações de rastreamento
   */
  private async buscarAcessoComRastreamento(args: any) {
    try {
      const { 
        query, 
        pessoa_nome, 
        pessoa_documento, 
        morador_nome,
        limite_registros = 5,
        incluir_mapa_html = false,
        incluir_mapa_svg = true
      } = args;
      
      console.log(`Buscando acesso com rastreamento. Params: pessoa=${pessoa_nome}, doc=${pessoa_documento}, morador=${morador_nome}`);
      
      // Verifica se pelo menos um parâmetro de busca foi fornecido
      if (!query && !pessoa_nome && !pessoa_documento && !morador_nome) {
        return {
          content: [
            {
              type: 'text',
              text: '# Registros de acesso com rastreamento\n\n❌ **Por favor, forneça pelo menos um parâmetro de busca.**\n\nVocê pode buscar por nome da pessoa, documento, nome do morador ou uma consulta livre.',
            },
          ],
        };
      }
      
      // Parâmetros para buscar no Qdrant
      const parametros: any = {
        limit: limite_registros
      };
      
      // Adiciona parâmetros que foram fornecidos
      if (query) parametros.query = query;
      if (pessoa_documento) parametros.pessoa_documento = pessoa_documento;
      if (morador_nome) parametros.morador_nome = morador_nome;
      
      // Para evitar problemas com o campo 'original_record.busca_otimizada.nomes_relacionados'
      // só adicionamos o pessoa_nome se for um método de busca mais simples
      let resultadoQdrant;
      try {
        if (pessoa_nome) {
          // Tenta usar busca por texto avançado em vez do filtro com campo problemático
          resultadoQdrant = await this.qdrantClient.buscarPorTextoAvancado(pessoa_nome, limite_registros, 0, 0.5);
        } else {
          // Busca registros de acesso no Qdrant
          resultadoQdrant = await this.qdrantClient.buscarComFiltros(parametros);
        }
      } catch (error) {
        console.error('Erro na busca com filtros:', error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Erro na busca de registros**\n\nOcorreu um erro ao buscar os registros: ${error}\n\nTente outros critérios de busca ou entre em contato com o administrador do sistema.`,
            },
          ],
        };
      }
      let output = '# Registros de acesso com rastreamento\n\n';
      
      // Se não encontrou registros
      if (resultadoQdrant.records.length === 0) {
        output += '❌ Nenhum registro encontrado com os critérios especificados.';
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
      
      // Adiciona sumário dos registros encontrados
      output += `📊 **${resultadoQdrant.total} registro(s) encontrado(s)**${resultadoQdrant.hasMore ? ' (há mais resultados disponíveis)' : ''}\n\n`;
      
      // Busca rastreamento para cada visitante encontrado
      const visitantesNomes = resultadoQdrant.records.map(r => r.pessoa_nome);
      const visitantesUnicos = [...new Set(visitantesNomes)] as string[];
      
      // Mapeia promessas de busca de rastreamento para cada visitante único
      const promessasRastreamento = visitantesUnicos.map(async (nome: string) => {
        try {
          return {
            nome,
            resultado: await this.firestoreService.buscarRastreamentoCompleto(nome)
          };
        } catch (error) {
          console.error(`Erro ao buscar rastreamento para ${nome}:`, error);
          return {
            nome,
            resultado: null,
            erro: String(error)
          };
        }
      });
      
      // Aguarda todas as buscas de rastreamento
      const resultadosRastreamento = await Promise.all(promessasRastreamento);
      
      // Mapeia resultados para fácil acesso
      const mapaRastreamento = resultadosRastreamento.reduce((mapa: Record<string, any>, item: {nome: string, resultado: any, erro?: string}) => {
        mapa[item.nome] = item.resultado;
        return mapa;
      }, {});
      
      // Lista de tokens para gerar visualizações
      let todosTokens: any[] = [];
      
      // Mostra cada registro com informações de rastreamento
      resultadoQdrant.records.forEach((registro: RegistroAcesso, index: number) => {
        output += `## Registro ${index + 1} - ID: ${registro.id}\n\n`;
        output += `**Pessoa:** ${registro.pessoa_nome}\n`;
        output += `**Documento:** ${registro.pessoa_documento}\n`;
        output += `**Destino:** ${registro.morador_nome} - ${registro.residencia_endereco}\n`;
        output += `**Entrada:** ${registro.entrada_datetime}\n`;
        output += `**Saída:** ${registro.saida_datetime}\n`;
        output += `**Permanência:** ${registro.tempo_permanencia_minutos} minutos\n`;
        output += `**Status:** ${registro.ainda_dentro ? 'Ainda dentro' : 'Saiu'}\n`;
        
        if (registro.tem_veiculo && registro.original_record?.veiculo) {
          const veiculo = registro.original_record.veiculo;
          output += `**Veículo:** ${veiculo.marca} ${veiculo.modelo} ${veiculo.cor} - ${veiculo.placa}\n`;
        }
        
        // Adiciona informações de rastreamento se disponíveis
        const rastreamento = mapaRastreamento[registro.pessoa_nome];
        
        if (rastreamento && rastreamento.visitante) {
          if (rastreamento.tokens && rastreamento.tokens.length > 0) {
            output += `\n### ✅ Rastreamento disponível\n\n`;
            output += `- **SafeTag ID:** ${rastreamento.tokens.map(t => t.name || t.id || 'ID não disponível').join(', ')}\n`;
            output += `- **Pontos registrados:** ${rastreamento.stepsCount || 0}\n`;
            
            // Adiciona tokens para visualização apenas se tiverem steps
            const tokensComSteps = rastreamento.tokens.filter(t => t.steps && t.steps.length > 0);
            if (tokensComSteps.length > 0) {
              todosTokens = [...todosTokens, ...tokensComSteps];
            } else {
              output += `- **Nota:** Nenhum dado de localização registrado para este visitante.\n`;
            }
          } else {
            output += `\n### ℹ️ Visitante cadastrado, mas sem rastreamento\n\n`;
            output += `O visitante está cadastrado no sistema Safe Tag, mas não possui rastreadores ativos.\n`;
          }
        } else {
          output += `\n### ℹ️ Sem dados de rastreamento\n\n`;
          output += `Este visitante não possui cadastro no sistema Safe Tag ou o serviço de rastreamento não está acessível.\n`;
        }
        
        output += '\n---\n\n';
      });
      
      // Prepara visualizações se houver tokens
      const resposta: any = {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
      
      // Se houver tokens com dados de localização
      if (todosTokens.length > 0) {
        // Processa visualizações
        const opcoes: TrackingVisualizationOptions = {
          includeHtml: incluir_mapa_html,
          includeSvg: incluir_mapa_svg,
          includeText: false,
          width: 800,
          height: 500,
          showLabels: true
        };
        
        const visualizacoes = TrackingVisualizer.gerarVisualizacoes(todosTokens, opcoes);
        
        // Se solicitou mapa SVG
        if (incluir_mapa_svg && visualizacoes.svg) {
          resposta.content.push({
            type: 'artifact',
            artifactType: 'image/svg+xml',
            artifactId: 'mapa-rastreamento-svg',
            title: 'Mapa de Rastreamento (SVG)',
            data: visualizacoes.svg
          });
        }
        
        // Se solicitou mapa HTML
        if (incluir_mapa_html && visualizacoes.html) {
          resposta.content.push({
            type: 'artifact',
            artifactType: 'text/html',
            artifactId: 'mapa-rastreamento-html',
            title: 'Mapa de Rastreamento (HTML)',
            data: visualizacoes.html
          });
        }
      }
      
      return resposta;
    } catch (error) {
      console.error('Erro ao buscar acesso com rastreamento:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erro ao buscar acesso com rastreamento: ${error}`,
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🏢 AJX ITAP-ORV MCP iniciado!');
  }
}

// Inicializar e executar o servidor
const server = new CondominioAccessMCPServer();
server.run().catch((error) => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
});
