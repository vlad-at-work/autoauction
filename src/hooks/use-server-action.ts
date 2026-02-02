import { useState } from 'react';
import { toast } from 'sonner';

type ServerActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

type UseServerActionOptions<T> = {
  onSuccess?: (data?: T) => void;
  successMessage?: string;
};

export function useServerAction<TArgs extends unknown[], TResult = void>(
  action: (...args: TArgs) => Promise<ServerActionResult<TResult>>,
  options?: UseServerActionOptions<TResult>
) {
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const execute = async (...args: TArgs) => {
    setLoading(true);
    setFieldErrors(null);

    try {
      const result = await action(...args);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? { _form: result.error });
        toast.error(result.error);
        return false;
      }

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      if (options?.onSuccess) {
        options.onSuccess(result.data);
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка';
      toast.error(message);
      setFieldErrors({ _form: message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    loading,
    fieldErrors,
    clearErrors: () => setFieldErrors(null),
  };
}
