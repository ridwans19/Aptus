import Sidebar from '../../components/Sidebar';
import { requireManager } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Everything under (app) is the manager side. Employees are sent to /my-tasks.
  const manager = await requireManager();

  return (
    <div className="app">
      <Sidebar name={manager.name} />
      <main className="main">
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
