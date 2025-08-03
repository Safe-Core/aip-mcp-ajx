import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, collection, query, where, getDocs, 
  doc, getDoc, DocumentReference, CollectionReference, 
  Firestore, DocumentData, QuerySnapshot,
  connectFirestoreEmulator, enableIndexedDbPersistence,
  initializeFirestore, persistentLocalCache, persistentSingleTabManager
} from 'firebase/firestore';
import { FirebaseConfig } from './firebase-config.js';

// Interface para o resultado de usuários do Firestore
export interface FirestoreUser {
  display_name: string;
  uid: string;
  email?: string;
  photo_url?: string;
  phone_number?: string;
  created_at?: string;
  // Outros campos que podem existir
}

// Interface para tokens de rastreamento
export interface TrackingToken {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  tokenRef: string;
  users_assigned: Array<DocumentReference>;
  users_data?: Array<FirestoreUser>;
  steps?: Array<TokenStep>;
}

// Interface para passos do token (localização)
export interface TokenStep {
  id: string;
  tokenRef: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  created_at: string;
}

// Interface para resultado do rastreamento
export interface TrackingResult {
  visitante: FirestoreUser | null;
  tokens: TrackingToken[];
  totalTokens: number;
  stepsCount: number;
}

export class FirestoreService {
  private db!: Firestore;
  private app!: FirebaseApp;
  private isInitialized: boolean = false;
  
  /**
   * Busca um documento específico por ID
   */
  async buscarDocumento(colecao: string, id: string): Promise<any | null> {
    try {
      this.verificarInicializacao();
      
      const docRef = doc(this.db, colecao, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Erro ao buscar documento ${id} na coleção ${colecao}:`, error);
      return null;
    }
  }

  /**
   * Explora uma coleção e retorna os primeiros N documentos
   * Útil para depuração e análise de estrutura
   */
  async explorarColecao(nomeColecao: string, limite: number = 5): Promise<any[]> {
    try {
      this.verificarInicializacao();
      
      const colRef = collection(this.db, nomeColecao);
      const snapshot = await getDocs(colRef);
      
      return snapshot.docs
        .slice(0, limite)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    } catch (error) {
      console.error(`Erro ao explorar coleção ${nomeColecao}:`, error);
      return [];
    }
  }

  constructor(firebaseConfig: FirebaseConfig) {
    try {
      // Verificar se as configurações essenciais estão presentes
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error('Configuração do Firebase incompleta. Verifique as variáveis de ambiente.');
        throw new Error('Firebase config incomplete');
      }

      // Inicializar o Firebase App
      this.app = initializeApp(firebaseConfig);
      
      // Inicializar Firestore com cache local
      this.db = initializeFirestore(this.app, {
        localCache: persistentLocalCache()
      });
      
      this.isInitialized = true;
      console.log('Firebase e Firestore inicializados com sucesso.');
    } catch (error) {
      console.error('Erro ao inicializar Firebase/Firestore:', error);
      // Criando um fallback para permitir que o resto do MCP funcione mesmo sem Firestore
      this.isInitialized = false;
    }
  }

  /**
   * Verifica se o serviço está inicializado
   */
  private verificarInicializacao() {
    if (!this.isInitialized) {
      throw new Error('Serviço do Firestore não está inicializado. Verifique as credenciais do Firebase.');
    }
  }

  /**
   * Busca usuários pelo nome
   */
  async buscarUsuarioPorNome(nome: string): Promise<FirestoreUser[]> {
    try {
      // Verifica inicialização
      this.verificarInicializacao();
      
      // Normaliza o nome para busca
      const nomeNormalizado = nome.toUpperCase().trim();
      
      const usersRef = collection(this.db, 'users');
      const q = query(
        usersRef,
        where('display_name', '>=', nomeNormalizado),
        where('display_name', '<=', nomeNormalizado + '\uf8ff')
      );

      let snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data() as FirestoreUser,
        uid: doc.id
      }));
    } catch (error) {
      console.error('Erro ao buscar usuário por nome:', error);
      return []; // Retorna array vazio em vez de propagar o erro
    }
  }

  /**
   * Busca tokens associados a um usuário
   */
  async buscarTokensPorUid(uid: string): Promise<TrackingToken[]> {
    try {
      // Verifica inicialização
      this.verificarInicializacao();
      
      // Referência do usuário
      const userRef = doc(this.db, 'users', uid);
      
      // Busca tokens onde o usuário está atribuído
      const tokensRef = collection(this.db, 'tokens');
      const q = query(
        tokensRef,
        where('users_assigned', 'array-contains', userRef)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data() as TrackingToken,
        id: doc.id
      }));
    } catch (error) {
      console.error('Erro ao buscar tokens por uid:', error);
      throw new Error(`Falha na busca de tokens: ${error}`);
    }
  }

  /**
   * Busca histórico de passos de um token
   */
  async buscarHistoricoToken(tokenId: any): Promise<TokenStep[]> {
    try {
      this.verificarInicializacao();
      
      // O parâmetro pode ser recebido em vários formatos, precisamos extrair o ID
      let realTokenId: string;
      
      // Verifica se é um objeto de referência do Firestore
      if (typeof tokenId === 'object' && tokenId !== null) {
        if ('referencePath' in tokenId) {
          // Format: { type: "firestore/documentReference/1.0", referencePath: "tokens/ID" }
          const refPath = tokenId.referencePath;
          const parts = refPath.split('/');
          realTokenId = parts[parts.length - 1];
        } else {
          // Outro tipo de objeto, converte para string
          realTokenId = JSON.stringify(tokenId);
        }
      } else {
        // É uma string
        realTokenId = String(tokenId);
        
        // Remove prefixos se houver
        if (realTokenId.includes('/tokens/')) {
          realTokenId = realTokenId.split('/tokens/')[1];
        } else if (realTokenId.startsWith('/')) {
          realTokenId = realTokenId.substring(1);
        }
        
        if (realTokenId.startsWith('tokens/')) {
          realTokenId = realTokenId.substring('tokens/'.length);
        }
      }
      
      console.log(`ID do token normalizado: ${realTokenId}`);
      
      // Cria referência ao documento do token
      const tokenDocRef = doc(this.db, 'tokens', realTokenId);
      console.log(`Buscando steps para token com referência: ${tokenDocRef.path}`);
      
      // Consulta baseada na referência ao documento
      const stepsRef = collection(this.db, 'tokenSteps');
      const q = query(
        stepsRef,
        where('tokenRef', '==', tokenDocRef)
      );

      const snapshot = await getDocs(q);
      console.log(`Encontrados ${snapshot.size} steps para o token`);
      
      // Se não encontrou nada, tenta uma busca alternativa pelo valor do path
      if (snapshot.size === 0) {
        console.log('Tentando busca alternativa...');
        
        // Consulta todos os steps e filtra localmente
        const allStepsSnapshot = await getDocs(collection(this.db, 'tokenSteps'));
        
        // Filtra manualmente baseado na propriedade path do tokenRef
        const matchingDocs = allStepsSnapshot.docs.filter(doc => {
          const data = doc.data();
          if (data.tokenRef) {
            // Verifica se é um objeto com referencePath
            if (typeof data.tokenRef === 'object' && data.tokenRef.referencePath) {
              return data.tokenRef.referencePath.includes(realTokenId);
            }
            // Verifica se é uma string
            if (typeof data.tokenRef === 'string') {
              return data.tokenRef.includes(realTokenId);
            }
          }
          return false;
        });
        
        console.log(`Busca alternativa encontrou ${matchingDocs.length} steps`);
        
        // Mapeia os resultados encontrados
        return matchingDocs.map(doc => {
          const data = doc.data();
          // Converte timestamp do Firebase para string se necessário
          const timestamp = data.last_updated 
            ? new Date(data.last_updated.seconds * 1000).toISOString()
            : '';
            
          return {
            ...data as TokenStep,
            id: doc.id,
            timestamp: timestamp || data.timestamp || '',
            latitude: data.last_position?.latitude || 0,
            longitude: data.last_position?.longitude || 0,
            created_at: timestamp
          };
        })
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return aTime - bTime;
        });
      }
      
      // Mapeia os resultados
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Converte timestamp do Firebase para string se necessário
          const timestamp = data.last_updated 
            ? new Date(data.last_updated.seconds * 1000).toISOString()
            : '';
            
          return {
            ...data as TokenStep,
            id: doc.id,
            timestamp: timestamp || data.timestamp || '',
            latitude: data.last_position?.latitude || 0,
            longitude: data.last_position?.longitude || 0,
            created_at: timestamp
          };
        })
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return aTime - bTime;
        });
    } catch (error) {
      console.error('Erro ao buscar histórico do token:', error);
      throw new Error(`Falha na busca do histórico: ${error}`);
    }
  }

  /**
   * Busca detalhes completos do rastreamento de um visitante
   */
  async buscarRastreamentoCompleto(nomePessoa: string): Promise<TrackingResult> {
    try {
      // Verifica inicialização
      if (!this.isInitialized) {
        console.warn('Firestore não está inicializado, retornando resultado vazio');
        return { 
          visitante: null, 
          tokens: [], 
          totalTokens: 0,
          stepsCount: 0
        };
      }
      
      // Busca usuário pelo nome
      const usuarios = await this.buscarUsuarioPorNome(nomePessoa);
      
      if (usuarios.length === 0) {
        return { 
          visitante: null, 
          tokens: [], 
          totalTokens: 0,
          stepsCount: 0
        };
      }

      const visitante = usuarios[0];
      
      // Busca tokens associados ao usuário
      const tokens = await this.buscarTokensPorUid(visitante.uid);
      
      // Logs de depuração
      console.log(`Encontrados ${tokens.length} tokens para o usuário ${visitante.display_name} (${visitante.uid})`);
      
      // Para cada token, busca o histórico de passos
      const tokensComHistorico = await Promise.all(
        tokens.map(async token => {
          try {
            console.log(`Buscando histórico para token: ${token.id}`);
            
            // Podemos passar diretamente o token.id para a função buscarHistoricoToken
            // A função já trata vários formatos (ID simples, path ou document reference)
            
            // Busca os steps na coleção tokenSteps
            const steps = await this.buscarHistoricoToken(token.id);
            console.log(`Encontrados ${steps.length} passos para o token ${token.id}`);
            
            // Retorna o token com seus passos
            return { 
              ...token, 
              steps,
              // Copia campos importantes do token original para fácil acesso
              tokenRef: `/tokens/${token.id}`
            };
          } catch (err) {
            console.error(`Erro ao buscar histórico para token ${token.id}:`, err);
            return { ...token, steps: [] };
          }
        })
      );

      // Conta o total de passos em todos os tokens
      const stepsCount = tokensComHistorico.reduce(
        (acc, token) => acc + (token.steps?.length || 0), 
        0
      );
      
      console.log(`Total de ${stepsCount} passos encontrados em ${tokensComHistorico.length} tokens`);

      return {
        visitante,
        tokens: tokensComHistorico,
        totalTokens: tokensComHistorico.length,
        stepsCount
      };
    } catch (error) {
      console.error('Erro ao buscar rastreamento completo:', error);
      // Retornamos um resultado vazio em vez de propagar o erro
      return { 
        visitante: null, 
        tokens: [], 
        totalTokens: 0,
        stepsCount: 0
      };
    }
  }
}
