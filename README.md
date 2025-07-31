# AJX MCP

Um servidor MCP (Model Context Protocol) para buscar e consultar dados de controle de acesso de condomínios armazenados no Qdrant.

## 🏢 Sobre

Este servidor MCP permite realizar buscas avançadas em registros de acesso de condomínios, incluindo:

- Busca semântica por texto livre
- Filtros estruturados por pessoa, morador, veículo, data, etc.
- Histórico de acesso de pessoas específicas
- Lista de visitantes por morador
- Consulta de pessoas ainda dentro do condomínio
- Busca por placa de veículo

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <repo>
cd aip-mcp-ouroville
```

2. Instale as dependências:
```bash
pnpm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=sua_api_key_aqui
QDRANT_COLLECTION_NAME=condominio_access
MCP_SERVER_NAME=condominio-access-mcp
MCP_SERVER_VERSION=1.0.0
```

4. Compile o projeto:
```bash
pnpm run build
```

## 🔧 Configuração

### Pré-requisitos

- Node.js 18+
- Qdrant Server rodando
- Coleção no Qdrant com os dados de acesso do condomínio

### Estrutura dos Dados

O servidor espera que os dados no Qdrant sigam a estrutura definida nos tipos TypeScript (`src/types.ts`), baseada no payload fornecido.

### Configuração do MCP

Para usar este servidor com clientes MCP, adicione a configuração apropriada ao seu cliente. Exemplo para Claude Desktop:

```json
{
  "mcpServers": {
    "condominio-access": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/caminho/para/aip-mcp-ouroville"
    }
  }
}
```

## 🛠️ Ferramentas Disponíveis

### 1. `buscar_acesso_texto`
Busca registros usando busca semântica por texto livre.

**Parâmetros:**
- `query` (obrigatório): Texto para busca
- `limit` (opcional): Número máximo de resultados (padrão: 10)
- `offset` (opcional): Número de resultados para pular (padrão: 0)

**Exemplo:**
```json
{
  "query": "ALECSANDER SILVA",
  "limit": 5
}
```

### 2. `buscar_acesso_filtros`
Busca com filtros estruturados específicos.

**Parâmetros:**
- `query` (opcional): Busca semântica adicional
- `pessoa_nome` (opcional): Nome da pessoa
- `pessoa_documento` (opcional): Documento da pessoa
- `morador_nome` (opcional): Nome do morador visitado
- `residencia_numero` (opcional): Número da residência
- `residencia_rua` (opcional): Rua da residência
- `veiculo_placa` (opcional): Placa do veículo
- `data_inicio` (opcional): Data início (YYYY-MM-DD)
- `data_fim` (opcional): Data fim (YYYY-MM-DD)
- `ainda_dentro` (opcional): Se ainda está dentro
- `tem_veiculo` (opcional): Se possui veículo
- `periodo_dia` (opcional): manha, tarde, noite
- `dia_semana` (opcional): segunda, terca, etc.
- `limit` (opcional): Número máximo de resultados
- `offset` (opcional): Número de resultados para pular

### 3. `buscar_pessoas_dentro`
Lista pessoas que ainda estão dentro do condomínio.

**Parâmetros:**
- `limit` (opcional): Número máximo de resultados (padrão: 10)

### 4. `buscar_historico_pessoa`
Busca histórico completo de uma pessoa por documento.

**Parâmetros:**
- `documento` (obrigatório): Documento da pessoa
- `data_inicio` (opcional): Data início (YYYY-MM-DD)
- `data_fim` (opcional): Data fim (YYYY-MM-DD)
- `limit` (opcional): Número máximo de resultados (padrão: 20)

### 5. `buscar_visitas_morador`
Busca todas as visitas para um morador específico.

**Parâmetros:**
- `morador_nome` (obrigatório): Nome do morador
- `data_inicio` (opcional): Data início (YYYY-MM-DD)
- `data_fim` (opcional): Data fim (YYYY-MM-DD)
- `limit` (opcional): Número máximo de resultados (padrão: 20)

### 6. `buscar_por_veiculo`
Busca registros por placa de veículo.

**Parâmetros:**
- `placa` (obrigatório): Placa do veículo
- `limit` (opcional): Número máximo de resultados (padrão: 10)

### 7. `verificar_conexao`
Verifica a conexão com o Qdrant e a existência da coleção.

**Parâmetros:** Nenhum

## 🏃‍♂️ Executando

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## 📊 Formato dos Dados

O servidor trabalha com registros de acesso que contêm informações sobre:

- **Pessoa**: Nome, documento, cidade, telefone
- **Acesso**: Data/hora de entrada e saída, tempo de permanência
- **Destino**: Morador visitado, residência, endereço
- **Veículo**: Placa, marca, modelo, cor (se aplicável)
- **Metadados**: Período do dia, dia da semana, terminal usado

## 🔍 Exemplos de Uso

### Buscar por nome de pessoa
```json
{
  "tool": "buscar_acesso_texto",
  "arguments": {
    "query": "ALECSANDER DIAS DA SILVA"
  }
}
```

### Buscar visitas para uma residência específica
```json
{
  "tool": "buscar_acesso_filtros",
  "arguments": {
    "residencia_numero": "236",
    "data_inicio": "2025-03-01",
    "data_fim": "2025-03-31"
  }
}
```

### Verificar quem ainda está dentro
```json
{
  "tool": "buscar_pessoas_dentro",
  "arguments": {
    "limit": 20
  }
}
```

### Buscar por placa de veículo
```json
{
  "tool": "buscar_por_veiculo",
  "arguments": {
    "placa": "EHP1389"
  }
}
```

## 🛡️ Segurança

- Configure adequadamente as credenciais do Qdrant no arquivo `.env`
- Mantenha o arquivo `.env` fora do controle de versão
- Use HTTPS em produção
- Implemente autenticação adequada conforme necessário

## 📝 Logs e Debugging

Os logs são enviados para stderr e incluem:
- Status de inicialização do servidor
- Erros de conexão com Qdrant
- Erros de execução de ferramentas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🐛 Problemas Conhecidos

- O sistema de embeddings está usando valores mock - em produção, integre com um modelo real
- Algumas validações de tipos podem precisar de ajustes conforme a estrutura real dos dados
- Performance pode variar dependendo do tamanho da coleção Qdrant

## 🔮 Próximas Funcionalidades

- [ ] Integração com modelos de embedding reais
- [ ] Cache de resultados
- [ ] Exportação de relatórios
- [ ] Alertas e notificações
- [ ] Interface web para administração
