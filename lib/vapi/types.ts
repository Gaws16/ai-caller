/**
 * Vapi.ai TypeScript types for the VoiceVerify integration
 */

// ============================================
// Call Creation Types
// ============================================

export interface VapiCustomer {
  number: string; // E.164 format phone number
  name?: string;
  numberE164CheckEnabled?: boolean;
}

export interface VapiAssistantOverrides {
  variableValues?: Record<string, string>;
  firstMessage?: string;
  model?: {
    provider: string;
    model: string;
    temperature?: number;
  };
  voice?: {
    provider: string;
    voiceId: string;
  };
}

export interface CreateVapiCallParams {
  assistantId?: string;
  assistant?: VapiAssistantConfig;
  assistantOverrides?: VapiAssistantOverrides;
  customer: VapiCustomer;
  phoneNumberId: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface VapiCallResponse {
  id: string;
  orgId: string;
  type: 'outboundPhoneCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  phoneCallProvider: string;
  phoneCallProviderId: string;
  phoneCallTransport: string;
  phoneNumberId: string;
  assistantId?: string;
  customer: VapiCustomer;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Assistant Configuration Types
// ============================================

export interface VapiTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
  async?: boolean;
  server?: {
    url: string;
    timeoutSeconds?: number;
  };
}

export interface VapiAssistantConfig {
  name?: string;
  model: {
    provider: 'openai' | 'anthropic' | 'google' | 'together-ai';
    model: string;
    temperature?: number;
    systemPrompt?: string;
    tools?: VapiTool[];
  };
  voice?: {
    provider: 'elevenlabs' | 'azure' | 'playht' | '11labs';
    voiceId: string;
  };
  firstMessage?: string;
  endCallMessage?: string;
  transcriber?: {
    provider: 'deepgram' | 'gladia' | 'assembly-ai';
    model?: string;
    language?: string;
  };
  serverUrl?: string;
  serverUrlSecret?: string;
}

// ============================================
// Webhook Event Types
// ============================================

export type VapiWebhookEventType =
  | 'assistant-request'
  | 'function-call'
  | 'tool-calls'
  | 'status-update'
  | 'end-of-call-report'
  | 'hang'
  | 'speech-update'
  | 'transcript'
  | 'conversation-update';

export interface VapiWebhookBase {
  message: {
    type: VapiWebhookEventType;
    timestamp?: string;
  };
  call: VapiCallInfo;
}

export interface VapiCallInfo {
  id: string;
  orgId: string;
  type: string;
  status: string;
  assistantId?: string;
  phoneNumberId: string;
  customer: VapiCustomer;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  metadata?: Record<string, string>;
}

// ============================================
// Tool Call Types
// ============================================

export interface VapiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface VapiToolCallMessage extends VapiWebhookBase {
  message: {
    type: 'tool-calls';
    toolCallList: VapiToolCall[];
    timestamp?: string;
  };
}

export interface VapiToolCallResult {
  toolCallId: string;
  result: string; // JSON string of the result
}

export interface VapiToolCallResponse {
  results: VapiToolCallResult[];
}

// ============================================
// End of Call Report Types
// ============================================

export interface VapiEndOfCallReport extends VapiWebhookBase {
  message: {
    type: 'end-of-call-report';
    endedReason: 'assistant-ended-call' | 'customer-ended-call' | 'voicemail' |
                 'silence-timed-out' | 'customer-busy' | 'customer-did-not-answer' |
                 'customer-did-not-give-microphone-permission' | 'assistant-error' |
                 'phone-call-provider-closed-websocket' | 'twilio-failed-to-connect-call' |
                 'unknown-error' | 'max-duration-reached';
    transcript?: string;
    summary?: string;
    messages?: VapiMessage[];
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    analysis?: {
      summary?: string;
      structuredData?: Record<string, any>;
      successEvaluation?: string;
    };
  };
}

export interface VapiMessage {
  role: 'assistant' | 'user' | 'system' | 'function' | 'tool';
  message?: string;
  name?: string;
  toolCalls?: VapiToolCall[];
  result?: string;
  time?: number;
  endTime?: number;
  secondsFromStart?: number;
}

// ============================================
// Status Update Types
// ============================================

export interface VapiStatusUpdate extends VapiWebhookBase {
  message: {
    type: 'status-update';
    status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
    timestamp?: string;
  };
}

// ============================================
// Tool Argument Types (for our specific tools)
// ============================================

export interface ConfirmOrderArgs {
  delivery_time: 'morning' | 'afternoon' | 'evening' | 'any';
  notes?: string;
}

export interface ChangeQuantityArgs {
  item_name: string;
  new_quantity: number;
}

export interface ChangeAddressArgs {
  new_address: string;
}

export interface CancelOrderArgs {
  reason?: string;
}

export interface RequestCallbackArgs {
  reason?: string;
}

// ============================================
// Tool Response Types
// ============================================

export interface ToolResponse {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

// ============================================
// Order Context (passed to assistant)
// ============================================

export interface OrderContext {
  customer_name: string;
  customer_phone: string;
  order_id: string;
  items_list: string;
  total_amount: string;
  delivery_address: string;
  payment_brand: string;
  payment_last4: string;
}
