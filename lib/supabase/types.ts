// Database types generated from Supabase schema
// These match the tables defined in supabase/migrations/001_initial_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          items: Json
          total_amount: number
          currency: string
          delivery_address: string
          delivery_instructions: string | null
          delivery_time_preference: string | null
          payment_type: 'one_time' | 'subscription'
          payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          payment_method_brand: string | null
          payment_method_last4: string | null
          stripe_customer_id: string | null
          status: 'pending' | 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required'
          created_at: string
          updated_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          items: Json
          total_amount: number
          currency?: string
          delivery_address: string
          delivery_instructions?: string | null
          delivery_time_preference?: string | null
          payment_type: 'one_time' | 'subscription'
          payment_status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          status?: 'pending' | 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required'
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          items?: Json
          total_amount?: number
          currency?: string
          delivery_address?: string
          delivery_instructions?: string | null
          delivery_time_preference?: string | null
          payment_type?: 'one_time' | 'subscription'
          payment_status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'cancelled' | 'refunded'
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          status?: 'pending' | 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required'
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          stripe_event_id: string
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          payment_method_id: string | null
          payment_method_details: Json | null
          subscription_interval: string | null
          subscription_status: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          stripe_event_id: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_invoice_id?: string | null
          amount: number
          currency?: string
          status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          payment_method_id?: string | null
          payment_method_details?: Json | null
          subscription_interval?: string | null
          subscription_status?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          stripe_event_id?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          stripe_invoice_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          payment_method_id?: string | null
          payment_method_details?: Json | null
          subscription_interval?: string | null
          subscription_status?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      calls: {
        Row: {
          id: string
          order_id: string
          twilio_call_sid: string | null
          twilio_recording_sid: string | null
          twilio_recording_url: string | null
          vapi_call_id: string | null
          started_at: string | null
          ended_at: string | null
          duration_seconds: number | null
          current_step: string | null
          outcome: 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required' | 'failed' | 'scheduled' | null
          responses: Json
          transcript: string | null
          retry_count: number
          next_retry_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          twilio_call_sid?: string | null
          twilio_recording_sid?: string | null
          twilio_recording_url?: string | null
          vapi_call_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          current_step?: string | null
          outcome?: 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required' | 'failed' | 'scheduled' | null
          responses?: Json
          transcript?: string | null
          retry_count?: number
          next_retry_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          twilio_call_sid?: string | null
          twilio_recording_sid?: string | null
          twilio_recording_url?: string | null
          vapi_call_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          current_step?: string | null
          outcome?: 'confirmed' | 'changed' | 'cancelled' | 'no-answer' | 'callback-required' | 'failed' | 'scheduled' | null
          responses?: Json
          transcript?: string | null
          retry_count?: number
          next_retry_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          call_id: string
          step: string
          speech_input: string | null
          classified_intent: string | null
          ai_response: string | null
          timestamp: string
          processing_time_ms: number | null
        }
        Insert: {
          id?: string
          call_id: string
          step: string
          speech_input?: string | null
          classified_intent?: string | null
          ai_response?: string | null
          timestamp?: string
          processing_time_ms?: number | null
        }
        Update: {
          id?: string
          call_id?: string
          step?: string
          speech_input?: string | null
          classified_intent?: string | null
          ai_response?: string | null
          timestamp?: string
          processing_time_ms?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

