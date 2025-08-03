'use client';

import * as React from 'react';
import { apiClient, type AgentRequest, type AgentResponse } from '@/lib/api';
import { reportAgentError } from '@/lib/error-reporter';

interface UseAgentRequestOptions {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (response: AgentResponse) => void;
  onError?: (error: Error) => void;
}

interface AgentRequestState {
  isLoading: boolean;
  error: Error | null;
  response: AgentResponse | null;
  retryCount: number;
}

export function useAgentRequest(options: UseAgentRequestOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = React.useState<AgentRequestState>({
    isLoading: false,
    error: null,
    response: null,
    retryCount: 0
  });

  const requestRef = React.useRef<{
    agentId: string;
    request: AgentRequest;
    includeMemory: boolean;
  } | null>(null);

  const sendRequest = React.useCallback(async (
    agentId: string,
    request: AgentRequest,
    includeMemory: boolean = true
  ): Promise<AgentResponse> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Store request details for retry
    requestRef.current = { agentId, request, includeMemory };

    try {
      const response = await apiClient.sendAgentRequest(agentId, request, includeMemory);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        response,
        retryCount: 0
      }));

      onSuccess?.(response);
      return response;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Request failed');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorObj
      }));

      // Report the error
      await reportAgentError(errorObj, agentId, request.input);
      
      onError?.(errorObj);
      throw errorObj;
    }
  }, [onSuccess, onError]);

  const retry = React.useCallback(async (): Promise<AgentResponse> => {
    if (!requestRef.current || state.retryCount >= maxRetries) {
      throw new Error('Cannot retry: no previous request or max retries exceeded');
    }

    const { agentId, request, includeMemory } = requestRef.current;
    
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));

    // Add delay between retries
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (state.retryCount + 1)));
    }

    return sendRequest(agentId, request, includeMemory);
  }, [sendRequest, maxRetries, retryDelay, state.retryCount]);

  const reset = React.useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      response: null,
      retryCount: 0
    });
    requestRef.current = null;
  }, []);

  const canRetry = React.useMemo(() => {
    return requestRef.current !== null && 
           state.error !== null && 
           state.retryCount < maxRetries;
  }, [requestRef.current, state.error, state.retryCount, maxRetries]);

  return {
    ...state,
    sendRequest,
    retry,
    reset,
    canRetry
  };
}

// Enhanced hook with automatic error recovery UI
export function useAgentRequestWithRecovery(options: UseAgentRequestOptions = {}) {
  const agentRequest = useAgentRequest(options);
  const [showErrorRecovery, setShowErrorRecovery] = React.useState(false);

  // Show error recovery UI when error occurs
  React.useEffect(() => {
    if (agentRequest.error) {
      setShowErrorRecovery(true);
    }
  }, [agentRequest.error]);

  const handleRetry = React.useCallback(async () => {
    try {
      await agentRequest.retry();
      setShowErrorRecovery(false);
    } catch (error) {
      // Error recovery will handle the display
    }
  }, [agentRequest.retry]);

  const handleDismissError = React.useCallback(() => {
    setShowErrorRecovery(false);
    agentRequest.reset();
  }, [agentRequest.reset]);

  return {
    ...agentRequest,
    showErrorRecovery,
    handleRetry,
    handleDismissError
  };
}

// Hook for batch agent requests with error handling
export function useBatchAgentRequests() {
  const [requests, setRequests] = React.useState<Map<string, AgentRequestState>>(new Map());
  const [isAnyLoading, setIsAnyLoading] = React.useState(false);

  const sendBatchRequest = React.useCallback(async (
    requestId: string,
    agentId: string,
    request: AgentRequest,
    includeMemory: boolean = true
  ) => {
    setRequests(prev => new Map(prev.set(requestId, {
      isLoading: true,
      error: null,
      response: null,
      retryCount: 0
    })));

    try {
      const response = await apiClient.sendAgentRequest(agentId, request, includeMemory);
      
      setRequests(prev => new Map(prev.set(requestId, {
        isLoading: false,
        error: null,
        response,
        retryCount: 0
      })));

      return response;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Request failed');
      
      setRequests(prev => new Map(prev.set(requestId, {
        isLoading: false,
        error: errorObj,
        response: null,
        retryCount: 0
      })));

      // Report the error
      await reportAgentError(errorObj, agentId, request.input);
      
      throw errorObj;
    }
  }, []);

  const retryRequest = React.useCallback(async (requestId: string) => {
    const requestState = requests.get(requestId);
    if (!requestState || !requestState.error) {
      throw new Error('No failed request to retry');
    }

    // This would require storing the original request details
    // For now, just clear the error
    setRequests(prev => new Map(prev.set(requestId, {
      ...requestState,
      error: null,
      retryCount: requestState.retryCount + 1
    })));
  }, [requests]);

  const clearRequest = React.useCallback((requestId: string) => {
    setRequests(prev => {
      const newMap = new Map(prev);
      newMap.delete(requestId);
      return newMap;
    });
  }, []);

  // Update loading state based on any request being in progress
  React.useEffect(() => {
    const hasLoadingRequest = Array.from(requests.values()).some(req => req.isLoading);
    setIsAnyLoading(hasLoadingRequest);
  }, [requests]);

  return {
    requests: Object.fromEntries(requests),
    isAnyLoading,
    sendBatchRequest,
    retryRequest,
    clearRequest
  };
}