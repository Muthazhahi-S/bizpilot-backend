export interface BusinessProfileDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  industry: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBusinessProfileDto {
  name?: string;
  email?: string;
  phone?: string | null;
  industry?: string | null;
  location?: string | null;
}
