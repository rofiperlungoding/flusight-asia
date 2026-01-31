import { Link, useLocation } from 'react-router-dom';

const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Map', href: '/map', icon: '🌍' },
    { name: 'Predictions', href: '/predictions', icon: '🔮' },
    { name: 'Sequences', href: '/sequences', icon: '🧬' },
    { name: 'Research', href: '/research', icon: '📚' },
    { name: 'API Docs', href: '/api-docs', icon: '📖' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <div className="flex flex-col w-64 bg-gray-900 text-white border-r border-gray-800">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-800">
                <span className="text-xl font-bold text-primary-400">🧬 FluSight</span>
                <span className="ml-2 text-sm text-gray-400 font-light tracking-wide">ASIA</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`
                flex items-center px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 group
                ${isActive
                                    ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
                                }
              `}
                        >
                            <span className={`mr-3 text-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                {item.icon}
                            </span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-800">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary-500/20">
                        FS
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">FluSight Asia</p>
                        <p className="text-xs text-primary-400">Pro License</p>
                    </div>
                </div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
                    v0.1.0 • Stable
                </div>
            </div>
        </div>
    );
}
