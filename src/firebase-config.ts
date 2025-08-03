import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuração do Firebase para o servidor MCP
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Verifica se uma configuração do Firebase é válida
 */
export function isValidFirebaseConfig(config: FirebaseConfig): boolean {
  return !!(
    config.apiKey && 
    config.authDomain && 
    config.projectId &&
    config.storageBucket &&
    config.messagingSenderId &&
    config.appId
  );
}

/**
 * Configuração padrão do Firebase
 * Essas credenciais devem ser substituídas por valores válidos nas variáveis de ambiente
 */
export const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Verifica se a configuração é válida e loga o resultado
if (!isValidFirebaseConfig(defaultFirebaseConfig)) {
  console.warn('Configuração do Firebase incompleta. O serviço de rastreamento pode não funcionar corretamente.');
  console.warn('Verifique se todas as variáveis de ambiente do Firebase estão definidas no arquivo .env');
}
