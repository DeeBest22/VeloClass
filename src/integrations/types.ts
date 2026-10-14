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

type ClassRow = {
  id: string;
  owner_id: string;
  name: string;
  course_code: string;
  description: string | null;
  department: string | null;
  color: string;
  schedule_days: string[] | null;
  schedule_time: string | null;
  join_code: string;
  archived: boolean;
  created_at: string;
};

type ClassMemberRow = {
  class_id: string;
  user_id: string;
  role: 'teacher' | 'student';
  display_name: string;
  joined_at: string;
};

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: ClassRow;
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          course_code: string;
          description?: string | null;
          department?: string | null;
          color: string;
          schedule_days?: string[] | null;
          schedule_time?: string | null;
          join_code: string;
          archived?: boolean;
          created_at?: string;
        };
        Update: Partial<ClassRow>;
        Relationships: [];
      };
      class_members: {
        Row: ClassMemberRow;
        Insert: Omit<ClassMemberRow, 'joined_at'> & { joined_at?: string };
        Update: Partial<ClassMemberRow>;
        Relationships: [];
      };
      class_files: {
        Row: ClassFileRow;
        Insert: Partial<ClassFileRow> &
          Pick<ClassFileRow, 'name' | 'file_type' | 'uploader_id' | 'uploader_name'>;
        Update: Partial<ClassFileRow>;
        Relationships: [];
      };
      work_items: {
        Row: { id: string; class_id: string; author_id: string; type: 'assignment' | 'classwork' | 'assessment'; title: string; instructions: string; due_at: string; duration_minutes: number | null; points: number | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['work_items']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['work_items']['Row']>;
        Relationships: [];
      };
      work_questions: {
        Row: { id: string; work_id: string; position: number; text: string; options: string[]; correct_index: number; difficulty: 'easy' | 'medium' | 'hard' };
        Insert: Omit<Database['public']['Tables']['work_questions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['work_questions']['Row']>;
        Relationships: [];
      };
      work_attachments: {
        Row: { id: string; work_id: string; class_id: string; storage_path: string; file_name: string; size_bytes: number; mime_type: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['work_attachments']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['work_attachments']['Row']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_class: {
        Args: {
          p_name: string;
          p_course_code: string;
          p_description: string | null;
          p_department: string | null;
          p_color: string;
          p_schedule_days: string[] | null;
          p_schedule_time: string | null;
          p_display_name: string | null;
        };
        Returns: { id: string; join_code: string }[];
      };
      join_class: {
        Args: { p_code: string };
        Returns: {
          id: string | null;
          name: string | null;
          color: string | null;
          already_member: boolean;
          error_code: string | null;
        }[];
      };
      get_class_overview: {
        Args: { p_class_id: string };
        Returns: {
          id: string;
          name: string;
          course_code: string;
          description: string | null;
          department: string | null;
          color: string;
          schedule_days: string[] | null;
          schedule_time: string | null;
          archived: boolean;
          teacher_name: string | null;
          student_count: number;
          my_role: 'teacher' | 'student';
          join_code: string | null;
        }[];
      };
      list_my_classes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          course_code: string;
          department: string | null;
          color: string;
          schedule_days: string[] | null;
          schedule_time: string | null;
          archived: boolean;
          my_role: 'teacher' | 'student';
          student_count: number;
          teacher_name: string | null;
          joined_at: string;
          created_at: string;
        }[];
      };
      update_class: { Args: { p_class_id: string; p_name: string; p_course_code: string; p_description: string | null; p_department: string | null; p_color: string; p_schedule_days: string[] | null; p_schedule_time: string | null }; Returns: undefined };
      regenerate_join_code: { Args: { p_class_id: string }; Returns: string };
      set_class_archived: { Args: { p_class_id: string; p_archived: boolean }; Returns: undefined };
      delete_class: { Args: { p_class_id: string }; Returns: undefined };
      leave_class: { Args: { p_class_id: string }; Returns: undefined };
      remove_member: { Args: { p_class_id: string; p_user_id: string }; Returns: undefined };
      list_class_members: { Args: { p_class_id: string }; Returns: { user_id: string; display_name: string; role: 'teacher' | 'student'; joined_at: string; is_me: boolean }[] };
      create_work: { Args: { p_class_id: string; p_type: string; p_title: string; p_instructions: string; p_due_at: string; p_duration_minutes: number | null; p_points: number | null; p_questions: Json }; Returns: string };
      register_work_attachment: { Args: { p_work_id: string; p_path: string; p_name: string; p_size: number; p_mime: string }; Returns: undefined };
      list_class_work: { Args: { p_class_id: string }; Returns: { id: string; type: 'assignment' | 'classwork' | 'assessment'; title: string; instructions: string; due_at: string; duration_minutes: number | null; points: number | null; question_count: number; attachment_count: number; total_students: number; submitted_count: number; status: 'open' | 'grading' | 'done' }[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
