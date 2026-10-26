import * as React from 'react';
import i18n from '@/i18n';
import { TrophyMark } from '@/components/brand/Logo';

/** Keeps a single failing screen from blanking the whole app. */
type Props = { children: React.ReactNode; resetKey?: string };
type State = { error: Error | null; key?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  // navigating to another screen clears a previous failure
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
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
