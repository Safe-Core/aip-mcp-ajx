import { z } from 'zod';

// Schema para Terminal
export const TerminalSchema = z.object({
  tipo: z.string(),
  descricao: z.string(),
  codigo: z.string(),
  nome: z.string(),
});

// Schema para Veículo
export const VeiculoSchema = z.object({
  cor: z.string().optional(),
  marca: z.string().optional(),
  placa: z.string().optional(),
  descricao_completa: z.string().optional(),
  tem_veiculo: z.boolean(),
  referencia: z.string().nullable().optional(),
  modelo: z.string().optional(),
});

// Schema para Tempo de Permanência
export const TempoPermanenciaSchema = z.object({
  categoria: z.string(),
  texto: z.string(),
  minutos: z.number(),
  total_minutos: z.number(),
  horas: z.number(),
});

// Schema para Entrada/Saída
export const MovimentacaoSchema = z.object({
  datetime_completo: z.string(),
  movimento: z.string(),
  data: z.string(),
  hora: z.string(),
});

// Schema para Acesso
export const AcessoSchema = z.object({
  tempo_permanencia: TempoPermanenciaSchema,
  entrada: MovimentacaoSchema,
  saida: MovimentacaoSchema,
  status: z.string(),
  ainda_dentro: z.boolean(),
});

// Schema para Usuário
export const UsuarioSchema = z.object({
  nome: z.string(),
  telefone: z.string(),
  documento: z.string(),
  turno: z.string(),
});

// Schema para Usuarios
export const UsuariosSchema = z.object({
  logado: UsuarioSchema,
  porteiro: UsuarioSchema,
});

// Schema para Pessoa
export const PessoaSchema = z.object({
  uf: z.string(),
  nome_busca: z.string(),
  tipo: z.string(),
  codigo: z.number(),
  nome: z.string(),
  cidade: z.string(),
  documento: z.string(),
  endereco_completo: z.string(),
  celular: z.string(),
});

// Schema para Morador
export const MoradorSchema = z.object({
  documento: z.string(),
  id: z.string(),
  celular: z.string(),
  nome: z.string(),
  email: z.string(),
  tipo: z.string(),
});

// Schema para Proprietário
export const ProprietarioSchema = z.object({
  telefone: z.string().nullable(),
  nome: z.string().nullable(),
  celular: z.string().nullable(),
});

// Schema para Residência
export const ResidenciaSchema = z.object({
  rua: z.string(),
  quadra: z.string(),
  id: z.string(),
  telefone: z.string(),
  endereco_completo: z.string(),
  numero: z.string(),
  lote: z.string(),
});

// Schema para Destino
export const DestinoSchema = z.object({
  morador: MoradorSchema,
  proprietario: ProprietarioSchema,
  residencia: ResidenciaSchema,
  tem_destino: z.boolean(),
});

// Schema para Metadados
export const MetadadosSchema = z.object({
  tem_destino: z.boolean(),
  fonte_dados: z.string(),
  periodo_dia: z.string(),
  removido: z.boolean(),
  tem_veiculo: z.boolean(),
  dia_semana: z.string(),
});

// Schema para Busca Otimizada
export const BuscaOtimizadaSchema = z.object({
  nomes_relacionados: z.array(z.string()),
  texto_completo: z.string(),
  palavras_chave: z.array(z.string()),
  documentos_relacionados: z.array(z.string()),
  datas_relacionadas: z.array(z.string()),
});

// Schema para Registro Original
export const OriginalRecordSchema = z.object({
  tipo_registro: z.string(),
  terminal: TerminalSchema,
  veiculo: VeiculoSchema,
  acesso: AcessoSchema,
  usuarios: UsuariosSchema,
  timestamp_indexacao: z.string(),
  conteudo_principal: z.string(),
  pessoa: PessoaSchema,
  metadados: MetadadosSchema,
  destino: DestinoSchema,
  busca_otimizada: BuscaOtimizadaSchema,
  id: z.string(),
});

// Schema principal do registro de acesso
export const RegistroAcessoSchema = z.object({
  pessoa_documento: z.string(),
  pessoa_cidade: z.string(),
  fonte_dados: z.string(),
  tem_destino: z.boolean(),
  residencia_numero: z.string(),
  timestamp_indexacao: z.string(),
  original_record: OriginalRecordSchema,
  text_for_embedding: z.string(),
  pessoa_uf: z.string(),
  tem_veiculo: z.boolean(),
  saida_hora: z.string(),
  residencia_endereco: z.string(),
  morador_id: z.string(),
  entrada_data: z.string(),
  terminal_nome: z.string(),
  pessoa_nome: z.string(),
  saida_datetime: z.string(),
  tempo_permanencia_minutos: z.number(),
  saida_data: z.string(),
  residencia_rua: z.string(),
  tipo_registro: z.string(),
  periodo_dia: z.string(),
  id: z.string(),
  entrada_datetime: z.string(),
  ainda_dentro: z.boolean(),
  status_acesso: z.string(),
  terminal_codigo: z.string(),
  morador_nome: z.string(),
  dia_semana: z.string(),
  entrada_hora: z.string(),
});

// Tipos TypeScript derivados dos schemas
export type Terminal = z.infer<typeof TerminalSchema>;
export type Veiculo = z.infer<typeof VeiculoSchema>;
export type TempoPermanencia = z.infer<typeof TempoPermanenciaSchema>;
export type Movimentacao = z.infer<typeof MovimentacaoSchema>;
export type Acesso = z.infer<typeof AcessoSchema>;
export type Usuario = z.infer<typeof UsuarioSchema>;
export type Usuarios = z.infer<typeof UsuariosSchema>;
export type Pessoa = z.infer<typeof PessoaSchema>;
export type Morador = z.infer<typeof MoradorSchema>;
export type Proprietario = z.infer<typeof ProprietarioSchema>;
export type Residencia = z.infer<typeof ResidenciaSchema>;
export type Destino = z.infer<typeof DestinoSchema>;
export type Metadados = z.infer<typeof MetadadosSchema>;
export type BuscaOtimizada = z.infer<typeof BuscaOtimizadaSchema>;
export type OriginalRecord = z.infer<typeof OriginalRecordSchema>;
export type RegistroAcesso = z.infer<typeof RegistroAcessoSchema>;

// Schema para parâmetros de busca
export const BuscaParametrosSchema = z.object({
  query: z.string().optional(),
  pessoa_nome: z.string().optional(),
  pessoa_documento: z.string().optional(),
  morador_nome: z.string().optional(),
  residencia_numero: z.string().optional(),
  residencia_rua: z.string().optional(),
  veiculo_placa: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  ainda_dentro: z.boolean().optional(),
  tem_veiculo: z.boolean().optional(),
  periodo_dia: z.enum(['manha', 'tarde', 'noite']).optional(),
  dia_semana: z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
});

export type BuscaParametros = z.infer<typeof BuscaParametrosSchema>;

// Tipo auxiliar para entrada da função (todos os campos opcionais)
export type BuscaParametrosInput = {
  query?: string;
  pessoa_nome?: string;
  pessoa_documento?: string;
  morador_nome?: string;
  residencia_numero?: string;
  residencia_rua?: string;
  veiculo_placa?: string;
  data_inicio?: string;
  data_fim?: string;
  ainda_dentro?: boolean;
  tem_veiculo?: boolean;
  periodo_dia?: 'manha' | 'tarde' | 'noite';
  dia_semana?: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
  limit?: number;
  offset?: number;
};
