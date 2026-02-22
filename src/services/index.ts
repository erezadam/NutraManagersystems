import { getRuntimeEnv, shouldUseFirebase } from '../config/env';
import type { Article, DeficiencySymptom, Disease, Food, User, Vitamin } from '../types/entities';
import { AuthService } from './auth-service';
import { EntityService } from './entity-service';
import { FirebaseAuthService } from './firebase-auth-service';
import { FirestoreEntityService } from './firestore-entity-service';
import { FirebaseIntegrationService } from './firebase-integration-service';
import { HttpClient } from './http';
import { IntegrationService } from './integration-service';

const env = getRuntimeEnv();
const useFirebase = shouldUseFirebase(env);

const http = new HttpClient({
  baseUrl: env.VITE_BASE44_SERVER_URL,
  appId: env.VITE_BASE44_APP_ID,
  accessToken: env.VITE_BASE44_ACCESS_TOKEN,
  functionsVersion: env.VITE_BASE44_FUNCTIONS_VERSION
});

const createEntityService = <T extends { id: string }>(entityName: string) =>
  useFirebase ? new FirestoreEntityService<T>(entityName) : new EntityService<T>(entityName, http);

export const vitaminService = createEntityService<Vitamin>('Vitamin');
export const foodService = createEntityService<Food>('Food');
export const deficiencySymptomService = createEntityService<DeficiencySymptom>('DeficiencySymptom');
export const diseaseService = createEntityService<Disease>('Disease');
export const articleService = createEntityService<Article>('Article');
export const userService = createEntityService<User>('User');
export const authService = useFirebase ? new FirebaseAuthService() : new AuthService(http);
export const integrationService = useFirebase ? new FirebaseIntegrationService() : new IntegrationService(http);

export { HttpClient, EntityService, FirestoreEntityService };
