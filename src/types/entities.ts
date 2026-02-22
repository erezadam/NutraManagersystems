export type ID = string;

export interface BaseEntity {
  id: ID;
  created_date?: string;
  updated_date?: string;
  created_by?: string;
  created_by_id?: string;
  is_sample?: boolean;
}

export interface VitaminConflict {
  vitaminId: ID;
  explanation: string;
}

export interface Vitamin extends BaseEntity {
  vitaminNameHe: string;
  vitaminNameEn?: string;
  vitaminNickHe?: string;
  vitaminNickEn?: string;
  activeForm?: string;
  solubility?: string;
  source?: string;
  dosageUpTo1Year?: string;
  dosageUpTo6?: string;
  dosageUpTo10?: string;
  dosageUpTo18?: string;
  dosageAdults?: string;
  dosagePregnancy?: string;
  dosageBirth?: string;
  dosageRDA?: string;
  actionDescription?: string;
  deficiencySymptoms?: ID[];
  labTestDeficiency?: string;
  labTestDeficiencyDescription?: string;
  labTestDeficiencyDetails?: string;
  foodSources?: ID[];
  companyName?: string;
  companyUrl?: string;
  toxicity?: string;
  sideEffects?: string;
  caseStory?: string;
  notes?: string;
  combinationVitaminIds?: ID[];
  conflictVitamins?: VitaminConflict[];
}

export interface Food extends BaseEntity {
  foodNameHe: string;
  foodNameEn?: string;
  foodCategory?: string;
  dosage?: string;
  imageUrl?: string;
  description?: string;
  deficiencySymptoms?: ID[];
  notes?: string;
}

export interface DeficiencySymptom extends BaseEntity {
  symptomNameHe: string;
  symptomNameEn?: string;
  sortOrder?: number | null;
  vitaminIds?: ID[];
  foodIds?: ID[];
  tags?: string[] | null;
  notes?: string;
}

export interface DiseaseProductLink {
  productName: string;
  productUrl: string;
}

export interface Disease extends BaseEntity {
  diseaseNameHe: string;
  sortOrder?: number | null;
  diseaseCharacteristicsHe?: string;
  supplementIds?: ID[];
  deficiencySymptomIds?: ID[];
  productLinks?: DiseaseProductLink[];
  notes?: string;
}

export interface Article extends BaseEntity {
  titleHe: string;
  titleEn?: string;
  url?: string;
  summary?: string;
  foodIds?: ID[];
}

export interface User extends BaseEntity {
  email: string;
  full_name?: string;
  role?: 'admin' | 'user' | string;
}
