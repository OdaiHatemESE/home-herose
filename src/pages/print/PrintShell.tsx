import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Screen toolbar + A4 page container. Toolbar is hidden when printing. */
export function PrintShell({ children, controls, landscape }: { children: React.ReactNode; controls?: React.ReactNode; landscape?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh bg-surface-2 pb-10 print:bg-white print:pb-0">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-app bg-surface px-4 py-3">
        <Button asChild variant="ghost" size="sm"><Link to="/parent/reports"><ChevronRight className="ltr:rotate-180" /> {t('common.back')}</Link></Button>
        <div className="flex flex-1 flex-wrap items-center gap-3">{controls}</div>
        <Button onClick={() => window.print()}><Printer /> {t('print.printNow')}</Button>
      </div>
      <style>{`@media print { @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; } }`}</style>
      <div className="mx-auto mt-6 grid justify-center gap-6 print:mt-0 print:gap-0">{children}</div>
    </div>
  );
}

export function A4Page({ children, landscape, className = '' }: { children: React.ReactNode; landscape?: boolean; className?: string }) {
  return (
    <section
      className={`print-page relative overflow-hidden bg-white text-[#241B3D] shadow-[var(--shadow-lift)] print:shadow-none ${className}`}
      style={landscape ? { width: '297mm', minHeight: '210mm', padding: '12mm' } : { width: '210mm', minHeight: '297mm', padding: '14mm' }}
    >
      {children}
    </section>
  );
}
