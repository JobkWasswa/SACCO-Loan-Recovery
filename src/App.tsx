import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Loans from './components/Loans';
import Recovery from './components/Recovery';
import { LayoutDashboard, Users, Wallet, AlertCircle } from 'lucide-react';

type View = 'dashboard' | 'clients' | 'loans' | 'recovery';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const navigation = [
    { id: 'dashboard' as View, name: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients' as View, name: 'Clients', icon: Users },
    { id: 'loans' as View, name: 'Loans', icon: Wallet },
    { id: 'recovery' as View, name: 'Recovery', icon: AlertCircle },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'loans':
        return <Loans />;
      case 'recovery':
        return <Recovery />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg p-2">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SACCO</h1>
                <p className="text-xs text-gray-600">Loan Management</p>
              </div>
            </div>
          </div>

          <nav className="px-3 pb-6">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentView(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="p-8">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}

export default App;
