import * as React from 'react';
import { AlertDialog as A } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Input } from './input';

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
  /** When set, the user must type this text to enable the confirm button. */
  typeToConfirm?: string;
};

const ConfirmContext = React.createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = React.useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = React.useState('');

  const confirm = React.useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setTyped('');
        setState({ ...o, resolve });
      }),
    [],
  );

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <A.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <A.Portal>
          <A.Overlay className="fixed inset-0 z-50 bg-plum-950/50" />
          <A.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-hero)] bg-surface p-6 text-fg shadow-[var(--shadow-lift)]">
            <A.Title className="text-lg font-semibold">{state?.title}</A.Title>
            <A.Description asChild>
              <div className="mt-2 text-sm text-muted">{state?.description}</div>
            </A.Description>
            {state?.typeToConfirm && (
              <div className="mt-4 grid gap-1.5">
                <label htmlFor="confirm-type" className="text-sm">
                  {t('common.typeToConfirm', { text: state.typeToConfirm })}
                </label>
                <Input id="confirm-type" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <A.Cancel asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </A.Cancel>
              <Button
                variant={state?.tone === 'danger' ? 'danger' : 'primary'}
                disabled={!!state?.typeToConfirm && typed.trim() !== state.typeToConfirm}
                onClick={() => close(true)}
              >
                {state?.confirmLabel ?? t('common.confirm')}
              </Button>
            </div>
          </A.Content>
        </A.Portal>
      </A.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return React.useContext(ConfirmContext);
}
