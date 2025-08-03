import { FirestoreService } from '../src/firestore-service.js';
import { defaultFirebaseConfig } from '../src/firebase-config.js';
import { TrackingVisualizer } from '../src/tracking-visualizer.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Função para testar o rastreamento de visitantes
 */
async function testarRastreamentoVisitante() {
  console.log('🔍 Teste de Rastreamento de Visitante');
  console.log('===============================');
  console.log('Este teste verifica a funcionalidade de busca de rastreamento de visitantes no Firestore');

  try {
    // Inicializa o serviço do Firestore
    console.log('\n1️⃣ Inicializando serviço do Firestore...');
    const firestoreService = new FirestoreService(defaultFirebaseConfig);

    // Nome do visitante para teste
    const nomeVisitante = process.argv[2] || 'ROSEMEIRE APARECIDA HERNANDES';
    console.log(`\n2️⃣ Buscando rastreamento para o visitante: ${nomeVisitante}`);

    // Busca o rastreamento completo
    const rastreamentoResult = await firestoreService.buscarRastreamentoCompleto(nomeVisitante);

    // Mostra resultado
    console.log('\n3️⃣ Resultado da busca:');
    
    // Verifica se encontrou o visitante
    if (!rastreamentoResult.visitante) {
      console.log('❌ Visitante não encontrado no sistema de rastreamento');
      process.exit(1);
    }
    
    // Informações do visitante
    const visitante = rastreamentoResult.visitante;
    console.log(`\n✅ Visitante encontrado: ${visitante.display_name}`);
    console.log(`ID: ${visitante.uid}`);
    if (visitante.email) console.log(`Email: ${visitante.email}`);
    if (visitante.phone_number) console.log(`Telefone: ${visitante.phone_number}`);
    
    // Verifica se existem tokens
    if (!rastreamentoResult.tokens || rastreamentoResult.tokens.length === 0) {
      console.log('\n❌ Sem rastreadores associados ao visitante');
      process.exit(1);
    }
    
    // Informações dos tokens
    console.log(`\n✅ ${rastreamentoResult.totalTokens} rastreador(es) encontrado(s)`);
    console.log(`✅ ${rastreamentoResult.stepsCount} pontos de localização encontrados`);
    
    console.log('\n4️⃣ Detalhes dos rastreadores:');
    rastreamentoResult.tokens.forEach((token: any, index) => {
      console.log(`\n--- Rastreador ${index + 1} ---`);
      console.log(`ID: ${token.id}`);
      console.log(`Nome: ${token.name || token.token_name || 'Sem nome'}`);
      console.log(`Status: ${token.active ? 'Ativo' : 'Inativo'}`);
      console.log(`TokenRef: ${token.tokenRef || 'N/A'}`);
      
      // Detalhes extras se disponíveis
      if (token.deviceId) console.log(`ID do dispositivo: ${token.deviceId}`);
      if (token.last_updated) console.log(`Última atualização: ${new Date(token.last_updated.seconds * 1000).toLocaleString()}`);
      if (token.last_seen) console.log(`Última posição conhecida: ${token.last_seen}`);
      if (token.last_speed_kmh) console.log(`Última velocidade: ${token.last_speed_kmh_txt || token.last_speed_kmh} km/h`);
      if (token.tag) console.log(`Tag: ${token.tag}`);
      
      // Informações dos passos de localização
      if (token.steps && token.steps.length > 0) {
        console.log(`\n✅ ${token.steps.length} pontos de localização:`);
        
        // Mostra apenas os primeiros 5 pontos para não poluir o console
        const stepsToShow = token.steps.slice(0, 5);
        stepsToShow.forEach((step, i) => {
          console.log(`\n  Passo ${i + 1}/${token.steps.length}:`);
          console.log(`  ID: ${step.id}`);
          console.log(`  Timestamp: ${step.timestamp || 'N/A'}`);
          console.log(`  Posição: ${step.latitude}, ${step.longitude}`);
          console.log(`  Velocidade: ${step.last_speed_kmh || 'N/A'} km/h`);
          console.log(`  Força GPS: ${step.last_gps_strength || 'N/A'}`);
        });
        
        if (token.steps.length > 5) {
          console.log(`\n  ... e mais ${token.steps.length - 5} pontos de localização`);
        }
      } else {
        console.log('\n❌ Sem dados de localização para este rastreador');
      }
    });
    
    // Gerar visualizações
    console.log('\n5️⃣ Gerando visualizações...');
    
    const opcoes = {
      includeHtml: true,
      includeSvg: true,
      includeText: true,
      width: 800,
      height: 500,
      showLabels: true
    };
    
    const visualizacoes = TrackingVisualizer.gerarVisualizacoes(rastreamentoResult.tokens, opcoes);
    
    // Salva as visualizações geradas
    if (visualizacoes.html) {
      const htmlPath = path.join(__dirname, 'rastreamento.html');
      fs.writeFileSync(htmlPath, visualizacoes.html);
      console.log(`✅ Mapa HTML salvo em: ${htmlPath}`);
    }
    
    if (visualizacoes.svg) {
      const svgPath = path.join(__dirname, 'rastreamento.svg');
      fs.writeFileSync(svgPath, visualizacoes.svg);
      console.log(`✅ Mapa SVG salvo em: ${svgPath}`);
    }
    
    if (visualizacoes.text) {
      console.log('\n6️⃣ Informações textuais do rastreamento:');
      console.log(visualizacoes.text);
    }
    
    console.log('\n✅ Teste finalizado com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executa o teste
testarRastreamentoVisitante();
