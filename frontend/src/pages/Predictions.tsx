export function Predictions() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mutation Forecasts</h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-2xl">
                        Ensemble model predictions for H3N2 antigenic drift over the next 12-24 weeks.
                    </p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white">Table</button>
                    <button className="px-4 py-1.5 text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Graph</button>
                </div>
            </div>

            <div className="card min-h-[400px] flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Models Initializing</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
                    The ML ensemble (LSTM + Transformer + GNN) works on the GitHub Actions pipeline.
                    Once trained models are deployed, forecasts will appear here.
                </p>
                <button className="mt-6 btn-primary">
                    Check Pipeline Status
                </button>
            </div>
        </div>
    );
}
