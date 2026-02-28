import type { Article, DeficiencySymptom, Disease, Food, User, Vitamin } from '../types/entities';
import { FirebaseAuthService } from './firebase-auth-service';
import { FirestoreEntityService } from './firestore-entity-service';
import { FirebaseIntegrationService } from './firebase-integration-service';

const createEntityService = <T extends { id: string }>(entityName: string) => new FirestoreEntityService<T>(entityName);

export const vitaminService = createEntityService<Vitamin>('Vitamin');
export const foodService = createEntityService<Food>('Food');
export const deficiencySymptomService = createEntityService<DeficiencySymptom>('DeficiencySymptom');
export const diseaseService = createEntityService<Disease>('Disease');
export const articleService = createEntityService<Article>('Article');
export const userService = createEntityService<User>('User');
export const authService = new FirebaseAuthService();
export const integrationService = new FirebaseIntegrationService();

export { FirestoreEntityService };
