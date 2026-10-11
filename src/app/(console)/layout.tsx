import { ConsoleShell } from '@/components/console/console-shell';
import { ToastProvider } from '@/components/console/toast';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </ToastProvider>
  );
}
