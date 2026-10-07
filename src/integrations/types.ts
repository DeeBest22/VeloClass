export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ClassFileRow = {
  id: string;
  class_code: string;
  name: string;
  file_type: 'pdf' | 'doc' | 'sheet' | 'slides' | 'image' | 'link';
  mime_type: string | null;
  size_bytes: number;
  uploader_id: string;
  uploader_name: string;
  source: 'instructor' | 'classmate' | 'mine';
  folder: string;
  is_pinned: boolean;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      class_files: {
        Row: ClassFileRow;
        Insert: Partial<ClassFileRow> &
          Pick<ClassFileRow, 'name' | 'file_type' | 'uploader_id' | 'uploader_name'>;
        Update: Partial<ClassFileRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
