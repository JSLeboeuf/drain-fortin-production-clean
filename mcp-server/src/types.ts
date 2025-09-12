export type McpAction =
  | {
      name: 'supabase.clients.list';
      description: string;
      parameters?: { limit?: number };
    }
  | {
      name: 'supabase.clients.create';
      description: string;
      parameters: { nom: string; email: string };
    }
  | {
      name: 'supabase.clients.update';
      description: string;
      parameters: { id: string; nom?: string; email?: string };
    }
  | {
      name: 'vapi.call';
      description: string;
      parameters: { to: string; message: string };
    };

export interface McpExecuteBody {
  action: McpAction['name'];
  params?: any;
}

export interface McpResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: { code: string; message: string };
}

