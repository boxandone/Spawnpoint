// Matches the output of `npm run db:types` (supabase gen types typescript --local).
// Regenerate after every migration.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      badge_catalog: {
        Row: { key: string; family: string; thresholds: number[]; unit: string | null; xp: number; cooldown_days: number | null; category: string | null };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      deed_logs: {
        Row: { id: string; household_id: string; member_id: string; logged_by: string; deed_key: string; day: string; quantity: number; completion_id: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      xp_events: {
        Row: { id: string; household_id: string; member_id: string; source_kind: string; completion_id: string | null; deed_log_id: string | null; day: string; raw_xp: number; credited_xp: number; capped: boolean; created_at: string };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      member_stats: {
        Row: { member_id: string; household_id: string; xp_total: number; level: number; coins_spent: number; updated_at: string };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      badge_progress: {
        Row: { id: string; household_id: string; member_id: string; badge_key: string; count: number; tier: number; tier_earned_at: string | null; updated_at: string };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      rewards: {
        Row: { id: string; household_id: string; member_id: string; name: string; icon: string; cost: number; archived_at: string | null; created_at: string; updated_at: string; created_by: string | null };
        Insert: { name: string; icon?: string; cost: number };
        Update: { name?: string; icon?: string; cost?: number; archived_at?: string | null };
        Relationships: [];
      };
      redemptions: {
        Row: { id: string; household_id: string; member_id: string; reward_id: string | null; name: string; icon: string; cost: number; posted: boolean; created_at: string };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      feed_events: {
        Row: { id: string; household_id: string; member_id: string; kind: string; payload: Json; created_at: string };
        Insert: { [key: string]: never };
        Update: { [key: string]: never };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          kind: string;
          message: string;
          page: string | null;
          app_version: string | null;
          user_agent: string | null;
          status: string;
          operator_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          kind: string;
          message: string;
          page?: string | null;
          app_version?: string | null;
          user_agent?: string | null;
        };
        Update: {
          status?: string;
          operator_note?: string | null;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: string;
          status: string;
          display_name: string;
          avatar: string | null;
          color: string;
          theme: string | null;
          mode: string;
          share_badges: boolean;
          joined_at: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: string;
          status?: string;
          display_name: string;
          avatar?: string | null;
          color?: string;
          theme?: string | null;
          mode?: string;
          share_badges?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: string;
          status?: string;
          display_name?: string;
          avatar?: string | null;
          color?: string;
          theme?: string | null;
          mode?: string;
          share_badges?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_settings: {
        Row: {
          id: string;
          household_id: string;
          modules: Json;
          default_theme: string;
          weekly_target: number;
          zone_rotation: Json;
          digest_time: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          modules?: Json;
          default_theme?: string;
          weekly_target?: number;
          zone_rotation?: Json;
          digest_time?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          modules?: Json;
          default_theme?: string;
          weekly_target?: number;
          zone_rotation?: Json;
          digest_time?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_settings_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: true;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      invites: {
        Row: {
          id: string;
          kind: string;
          household_id: string | null;
          code_hash: string;
          label: string | null;
          expires_at: string;
          max_uses: number;
          use_count: number;
          revoked_at: string | null;
          last_used_at: string | null;
          created_household_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          kind: string;
          household_id?: string | null;
          code_hash: string;
          label?: string | null;
          expires_at: string;
          max_uses?: number;
          use_count?: number;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_household_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          kind?: string;
          household_id?: string | null;
          code_hash?: string;
          label?: string | null;
          expires_at?: string;
          max_uses?: number;
          use_count?: number;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_household_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          household_id: string;
          parent_id: string | null;
          kind: string;
          name: string;
          icon: string | null;
          sort: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          parent_id?: string | null;
          kind: string;
          name: string;
          icon?: string | null;
          sort?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          parent_id?: string | null;
          kind?: string;
          name?: string;
          icon?: string | null;
          sort?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          notes: string | null;
          location_id: string | null;
          effort: number;
          priority: string;
          schedule: Json;
          if_missed: string;
          assignee_id: string | null;
          deed_key: string | null;
          unit: string | null;
          start_on: string | null;
          library_key: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          notes?: string | null;
          location_id?: string | null;
          effort?: number;
          priority?: string;
          schedule: Json;
          if_missed?: string;
          assignee_id?: string | null;
          deed_key?: string | null;
          unit?: string | null;
          start_on?: string | null;
          library_key?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          notes?: string | null;
          location_id?: string | null;
          effort?: number;
          priority?: string;
          schedule?: Json;
          if_missed?: string;
          assignee_id?: string | null;
          deed_key?: string | null;
          unit?: string | null;
          start_on?: string | null;
          library_key?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      completions: {
        Row: {
          id: string;
          household_id: string;
          task_id: string;
          done_on: string;
          logged_at: string;
          done_by: string;
          logged_by: string;
          kind: string;
          quantity: number | null;
          note: string | null;
          source: string;
          catch_up_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          task_id: string;
          done_on: string;
          logged_at?: string;
          done_by: string;
          logged_by: string;
          kind?: string;
          quantity?: number | null;
          note?: string | null;
          source?: string;
          catch_up_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          task_id?: string;
          done_on?: string;
          logged_at?: string;
          done_by?: string;
          logged_by?: string;
          kind?: string;
          quantity?: number | null;
          note?: string | null;
          source?: string;
          catch_up_id?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      task_last_done: {
        Row: {
          task_id: string;
          household_id: string;
          completion_id: string;
          done_on: string;
          kind: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_member_invite: {
        Args: {
          p_code: string;
          p_display_name: string;
          p_avatar?: string;
          p_color?: string;
          p_theme?: string;
        };
        Returns: Json;
      };
      create_household: {
        Args: {
          p_name: string;
          p_timezone: string;
          p_display_name: string;
          p_code?: string;
          p_avatar?: string;
          p_color?: string;
          p_theme?: string;
        };
        Returns: Json;
      };
      create_household_invite: { Args: { p_label?: string }; Returns: Json };
      create_member_invite: {
        Args: { p_household_id: string; p_max_uses?: number; p_label?: string };
        Returns: Json;
      };
      current_member_id: { Args: Record<PropertyKey, never>; Returns: string };
      household_today: { Args: { hid: string }; Returns: string };
      household_week_xp: { Args: { p_household_id: string; p_week_start: string }; Returns: number };
      level_for_xp: { Args: { xp: number }; Returns: number };
      log_deed: {
        Args: { p_deed_key: string; p_day: string; p_quantity?: number; p_done_by?: string };
        Returns: string;
      };
      my_rewards: { Args: Record<PropertyKey, never>; Returns: Json };
      redeem_reward: { Args: { p_reward_id: string; p_post?: boolean }; Returns: Json };
      undo_deed_log: { Args: { p_id: string }; Returns: undefined };
      undo_redemption: { Args: { p_id: string }; Returns: undefined };
      xp_for_level: { Args: { lvl: number }; Returns: number };
      is_member_of: { Args: { hid: string }; Returns: boolean };
      is_operator: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner_of: { Args: { hid: string }; Returns: boolean };
      leave_household: { Args: Record<PropertyKey, never>; Returns: undefined };
      operator_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      peek_invite: { Args: { p_code: string }; Returns: Json };
      public_config: { Args: Record<PropertyKey, never>; Returns: Json };
      remove_member: { Args: { p_member_id: string }; Returns: undefined };
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined };
      rename_invite: { Args: { p_invite_id: string; p_label: string }; Returns: undefined };
      set_feedback_status: {
        Args: { p_id: string; p_status: string; p_note?: string };
        Returns: undefined;
      };
      set_member_role: { Args: { p_member_id: string; p_role: string }; Returns: undefined };
      sync_config: { Args: { p_operator_emails: string[]; p_config: Json }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
