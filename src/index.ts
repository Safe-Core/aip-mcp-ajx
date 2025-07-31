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

// Carrega variáveis de ambiente
dotenv.config();

class CondominioAccessMCPServer {
  private server: Server;
  private qdrantClient: CondominioQdrantClient;

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

    this.qdrantClient = new CondominioQdrantClient(qdrantConfig);
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
