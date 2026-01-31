import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
            {/* Sidebar - fixed width */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header - sticky top */}
                <Header />

                {/* Page content - scrollable */}
                <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="container mx-auto px-6 py-8 max-w-7xl">
                        <Outlet />
                    </div>

                    {/* Footer for content area */}
                    <div className="px-6 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
                        &copy; 2026 FluSight-Asia Mutation Intelligence Platform. All data is for research purposes only.
                    </div>
                </main>
            </div>
        </div>
    );
}
