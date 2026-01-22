export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  color: string;
  description: string;
}

export interface UpdateTagRequest extends Partial<CreateTagRequest> {}
