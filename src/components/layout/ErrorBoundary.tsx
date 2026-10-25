import * as React from 'react';
import i18n from '@/i18n';
import { TrophyMark } from '@/components/brand/Logo';

/** Keeps a single failing screen from blanking the whole app. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <TrophyMark className="size-14 opacity-60" />
        <p className="text-lg font-semibold">{i18n.t('errors.generic')}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="rounded-[var(--radius-control)] bg-plum-500 px-4 py-2 font-medium text-white"
        >
          {i18n.t('common.retry')}
        </button>
      </div>
    );
  }
}
