/**
 * Vapi.ai Integration Library
 *
 * Exports all Vapi-related functionality for the VoiceVerify system.
 */

// Client functions
export {
  createVapiCall,
  getVapiCall,
  endVapiCall,
  buildOrderContext,
  initiateOrderConfirmationCall,
  verifyVapiWebhookSignature,
  isWithinCallingHours,
  getNextCallingTime,
} from './client';

// Tool handlers
export {
  orderConfirmationTools,
  handleToolCall,
  handleConfirmOrder,
  handleChangeQuantity,
  handleChangeAddress,
  handleCancelOrder,
  handleRequestCallback,
} from './tools';

// Types
export type {
  VapiCustomer,
  VapiAssistantOverrides,
  CreateVapiCallParams,
  VapiCallResponse,
  VapiTool,
  VapiAssistantConfig,
  VapiWebhookEventType,
  VapiWebhookBase,
  VapiCallInfo,
  VapiToolCall,
  VapiToolCallMessage,
  VapiToolCallResult,
  VapiToolCallResponse,
  VapiEndOfCallReport,
  VapiMessage,
  VapiStatusUpdate,
  ConfirmOrderArgs,
  ChangeQuantityArgs,
  ChangeAddressArgs,
  CancelOrderArgs,
  RequestCallbackArgs,
  ToolResponse,
  OrderContext,
} from './types';
