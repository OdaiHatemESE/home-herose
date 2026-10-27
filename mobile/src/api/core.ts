import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from '@/components/toast';
import { errorMessage } from '@/lib/errors';

/** Unwraps a Supabase response or throws its error. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/**
 * A mutation that shows a success toast, surfaces a friendly error toast,
 * and refreshes family data afterwards (family data sets are small). Same behaviour as the website.
 */
export function useAction<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { success?: string | ((r: TResult, v: TVars) => string | undefined); invalidate?: QueryKey[]; silentError?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result, vars) => {
      const msg = typeof opts.success === 'function' ? opts.success(result, vars) : opts.success;
      if (msg) toast.success(msg);
      if (opts.invalidate) {
        await Promise.all(opts.invalidate.map((k) => qc.invalidateQueries({ queryKey: k })));
      } else {
        await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'identity' });
      }
    },
    onError: (err) => {
      if (!opts.silentError) toast.error(errorMessage(err));
    },
  });
}
