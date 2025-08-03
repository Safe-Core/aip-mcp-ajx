import { TrackingToken, TokenStep } from './firestore-service.js';

/**
 * Interface para opções de visualização do rastreamento
 */
export interface TrackingVisualizationOptions {
  includeHtml?: boolean;
  includeSvg?: boolean;
  includeText?: boolean;
  width?: number;
  height?: number;
  mapZoom?: number;
  showLabels?: boolean;
}

/**
 * Classe responsável por gerar visualizações do histórico de rastreamento
 */
export class TrackingVisualizer {
  
  /**
   * Gera texto formatado em Markdown com o sumário do rastreamento
   */
  static gerarTextoRastreamento(token: TrackingToken): string {
    if (!token.steps || token.steps.length === 0) {
      return '**Sem dados de localização disponíveis para este token**';
    }
    
    let output = `### Detalhes do token: ${token.name || token.id}\n\n`;
    output += `- **ID:** ${token.id}\n`;
    output += `- **Descrição:** ${token.description || 'N/A'}\n`;
    output += `- **Status:** ${token.active ? 'Ativo' : 'Inativo'}\n`;
    output += `- **Criado em:** ${new Date(token.created_at).toLocaleString('pt-BR')}\n`;
    output += `- **Total de pontos:** ${token.steps.length}\n\n`;
    
    output += '### Histórico de localização\n\n';
    
    token.steps.forEach((step, index) => {
      const data = new Date(step.timestamp).toLocaleString('pt-BR');
      output += `**${index + 1}.** ${data}\n`;
      output += `   - Coordenadas: ${step.latitude.toFixed(6)}, ${step.longitude.toFixed(6)}\n`;
      if (step.accuracy) {
        output += `   - Precisão: ${step.accuracy.toFixed(1)} metros\n`;
      }
      if (step.address) {
        output += `   - Endereço: ${step.address}\n`;
      }
      output += '\n';
    });
    
    return output;
  }
  
  /**
   * Gera HTML com mapa para o histórico de rastreamento
   */
  static gerarHtmlMap(tokens: TrackingToken[], options: TrackingVisualizationOptions = {}): string {
    const { 
      width = 800, 
      height = 500, 
      mapZoom = 16,
      showLabels = true
    } = options;
    
    // Verifica se há steps em algum token
    const hasSteps = tokens.some(token => token.steps && token.steps.length > 0);
    if (!hasSteps) {
      return '<div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px;">' +
             '<p>Sem dados de localização disponíveis para este visitante.</p></div>';
    }
    
    // Extrai todos os passos de todos os tokens
    const allSteps: {step: TokenStep, tokenName: string, color: string}[] = [];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    
    tokens.forEach((token, tokenIndex) => {
      if (token.steps && token.steps.length > 0) {
        const tokenColor = colors[tokenIndex % colors.length];
        token.steps.forEach(step => {
          allSteps.push({
            step,
            tokenName: token.name || token.id,
            color: tokenColor
          });
        });
      }
    });
    
    // Encontra o centro do mapa (média de todas as coordenadas)
    const center = allSteps.reduce(
      (acc, { step }) => {
        acc.lat += step.latitude;
        acc.lng += step.longitude;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    
    center.lat /= allSteps.length;
    center.lng /= allSteps.length;
    
    // Gera o HTML do mapa
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Histórico de Rastreamento</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    #map { width: 100%; height: ${height}px; }
    .legend { 
      position: absolute; 
      bottom: 10px; 
      left: 10px; 
      z-index: 1000; 
      background: white; 
      padding: 10px; 
      border-radius: 5px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .legend-item { 
      display: flex; 
      align-items: center; 
      margin-bottom: 5px; 
    }
    .color-box {
      width: 20px;
      height: 15px;
      margin-right: 5px;
      border: 1px solid #ccc;
    }
    .infowindow { max-width: 250px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="legend">
    ${tokens.filter(t => t.steps && t.steps.length > 0).map((token, i) => `
      <div class="legend-item">
        <div class="color-box" style="background-color: ${colors[i % colors.length]};"></div>
        <span>${token.name || token.id}</span>
      </div>
    `).join('')}
  </div>

  <script>
    function initMap() {
      const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: ${center.lat}, lng: ${center.lng} },
        zoom: ${mapZoom},
        mapTypeId: "roadmap",
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      });

      // Criar marcadores e linhas para cada token
      ${tokens.map((token, tokenIndex) => {
        if (!token.steps || token.steps.length === 0) return '';
        
        const color = colors[tokenIndex % colors.length];
        const points = token.steps.map(step => `{lat: ${step.latitude}, lng: ${step.longitude}}`).join(',');
        
        let markers = '';
        if (showLabels) {
          markers = token.steps.map((step, i) => `
            const marker${tokenIndex}_${i} = new google.maps.Marker({
              position: {lat: ${step.latitude}, lng: ${step.longitude}},
              map: map,
              title: "${token.name || token.id} - ${i + 1}",
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "${color}",
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: "#000"
              }
            });

            const infowindow${tokenIndex}_${i} = new google.maps.InfoWindow({
              content: '<div class="infowindow"><h4>${token.name || token.id}</h4>' +
                      '<p>Data: ${new Date(step.timestamp).toLocaleString('pt-BR')}</p>' +
                      '${step.address ? `<p>Local: ${step.address.replace(/'/g, "\\'")}</p>` : ''}' +
                      '</div>'
            });

            marker${tokenIndex}_${i}.addListener("click", () => {
              infowindow${tokenIndex}_${i}.open(map, marker${tokenIndex}_${i});
            });
          `).join('\n');
        }
        
        return `
          // Trajetória para ${token.name || token.id}
          const path${tokenIndex} = [${points}];
          
          const line${tokenIndex} = new google.maps.Polyline({
            path: path${tokenIndex},
            geodesic: true,
            strokeColor: "${color}",
            strokeOpacity: 1.0,
            strokeWeight: 3
          });
          
          line${tokenIndex}.setMap(map);
          
          ${markers}
        `;
      }).join('\n')}
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?callback=initMap&libraries=&v=weekly" async></script>
</body>
</html>
    `;
  }
  
  /**
   * Gera SVG com o histórico de rastreamento
   */
  static gerarSvgMap(tokens: TrackingToken[], options: TrackingVisualizationOptions = {}): string {
    const { 
      width = 600, 
      height = 400, 
      showLabels = true
    } = options;
    
    // Verifica se há steps em algum token
    const hasSteps = tokens.some(token => token.steps && token.steps.length > 0);
    if (!hasSteps) {
      return '<svg width="600" height="100" xmlns="http://www.w3.org/2000/svg">' +
             '<text x="10" y="30" fill="#666">Sem dados de localização disponíveis para este visitante.</text></svg>';
    }
    
    // Extrai todos os passos de todos os tokens
    const allSteps: {step: TokenStep, tokenName: string, color: string}[] = [];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    
    tokens.forEach((token, tokenIndex) => {
      if (token.steps && token.steps.length > 0) {
        const tokenColor = colors[tokenIndex % colors.length];
        token.steps.forEach(step => {
          allSteps.push({
            step,
            tokenName: token.name || token.id,
            color: tokenColor
          });
        });
      }
    });
    
    // Encontrar mínimo e máximo das coordenadas para escalonar o SVG
    const bounds = allSteps.reduce(
      (acc, { step }) => {
        acc.minLat = Math.min(acc.minLat, step.latitude);
        acc.maxLat = Math.max(acc.maxLat, step.latitude);
        acc.minLng = Math.min(acc.minLng, step.longitude);
        acc.maxLng = Math.max(acc.maxLng, step.longitude);
        return acc;
      },
      { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
    );
    
    // Adiciona uma margem de 10%
    const latRange = bounds.maxLat - bounds.minLat;
    const lngRange = bounds.maxLng - bounds.minLng;
    
    bounds.minLat -= latRange * 0.1;
    bounds.maxLat += latRange * 0.1;
    bounds.minLng -= lngRange * 0.1;
    bounds.maxLng += lngRange * 0.1;
    
    // Função para converter coordenadas para pixels
    const toX = (lng: number) => ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const toY = (lat: number) => height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height; // Inverte Y pois SVG tem Y crescendo para baixo
    
    // Constrói o SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    
    // Adiciona retângulo de fundo
    svg += `  <rect width="${width}" height="${height}" fill="#f9f9f9" />\n`;
    
    // Desenha linhas e pontos para cada token
    tokens.forEach((token, tokenIndex) => {
      if (!token.steps || token.steps.length === 0) return;
      
      const color = colors[tokenIndex % colors.length];
      
      // Desenha a linha (caminho)
      const points = token.steps.map(step => `${toX(step.longitude)},${toY(step.latitude)}`).join(' ');
      svg += `  <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />\n`;
      
      // Desenha os pontos
      token.steps.forEach((step, i) => {
        const x = toX(step.longitude);
        const y = toY(step.latitude);
        
        svg += `  <circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#fff" stroke-width="1" />\n`;
        
        // Adiciona números aos pontos se necessário
        if (showLabels) {
          svg += `  <text x="${x + 5}" y="${y - 5}" font-size="10" fill="#333">${i + 1}</text>\n`;
        }
      });
    });
    
    // Adiciona legenda
    const legendY = height - 10 - (tokens.length * 15);
    svg += `  <rect x="10" y="${legendY}" width="140" height="${tokens.length * 15 + 10}" fill="white" stroke="#ccc" stroke-width="1" />\n`;
    
    tokens.forEach((token, i) => {
      if (!token.steps || token.steps.length === 0) return;
      
      const color = colors[i % colors.length];
      const y = legendY + 15 * (i + 1);
      
      svg += `  <rect x="20" y="${y - 10}" width="10" height="10" fill="${color}" />\n`;
      svg += `  <text x="35" y="${y}" font-size="10" fill="#333">${token.name || token.id}</text>\n`;
    });
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * Gera visualizações do rastreamento com base nas opções fornecidas
   */
  static gerarVisualizacoes(tokens: TrackingToken[], options: TrackingVisualizationOptions = {}): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (options.includeText !== false) {
      const textOutput = tokens.map(token => 
        TrackingVisualizer.gerarTextoRastreamento(token)
      ).join('\n\n---\n\n');
      
      result.text = textOutput;
    }
    
    if (options.includeHtml === true) {
      result.html = TrackingVisualizer.gerarHtmlMap(tokens, options);
    }
    
    if (options.includeSvg === true) {
      result.svg = TrackingVisualizer.gerarSvgMap(tokens, options);
    }
    
    return result;
  }
}
