import { useState } from 'react';
import { FluMap } from '../components/Map/FluMap';
import { subMonths } from 'date-fns';

export function MapPage() {
    const [startDate, setStartDate] = useState<Date | null>(subMonths(new Date(), 12));
    const [endDate, setEndDate] = useState<Date | null>(null);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Geographic Surveillance</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                        Monitor the spread of H3N2 influenza variants across Asia.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setStartDate(subMonths(new Date(), 12)); setEndDate(null); }}
                        className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${startDate && !endDate ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        Past 12 Months
                    </button>
                    <button
                        onClick={() => { setStartDate(null); setEndDate(null); }}
                        className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${!startDate ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                    >
                        All Strains
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <FluMap startDate={startDate} endDate={endDate} />
                </div>
                <div className="card space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                        Legend
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Sequence Volume</p>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    <span className="text-xs text-slate-500">Low</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    <span className="text-xs text-slate-500">Med</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                    <span className="text-xs text-slate-500">High</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Mutation Intensity</p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-[#0ea5e9]"></div>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Low (&lt; 2 mut/seq)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-[#eab308]"></div>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Medium (2-5 mut/seq)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-[#f43f5e]"></div>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">High (&gt; 5 mut/seq)</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Information</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Circle size represents sequence volume. <br />
                                Color represents average mutation density per sequence. <br />
                                <span className="italic text-xs opacity-70">Showing data for: {startDate ? 'Past 12 Months' : 'All Time'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
