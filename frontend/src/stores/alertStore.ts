import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface MutationAlert {
    id: string;
    mutation_notation: string;
    strain_name: string;
    created_at: string;
    is_novel: boolean;
    is_escape: boolean;
}

interface AlertStore {
    alerts: MutationAlert[];
    unreadCount: number;
    addAlert: (alert: MutationAlert) => void;
    markAllRead: () => void;
    initialize: () => () => void; // Returns unsubscribe function
}

export const useAlertStore = create<AlertStore>((set, get) => ({
    alerts: [],
    unreadCount: 0,
    addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 50), // Keep last 50
        unreadCount: state.unreadCount + 1
    })),
    markAllRead: () => set({ unreadCount: 0 }),
    initialize: () => {
        // Subscribe to real-time mutations
        const channel = supabase
            .channel('mutation-alerts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mutations',
                    filter: 'is_novel=eq.true' // Only alert on novel mutations for now
                },
                async (payload) => {
                    const newMutation = payload.new as any;

                    // Fetch strain name details (optional, but nice)
                    const { data: seq } = await supabase
                        .from('sequences')
                        .select('strain_name')
                        .eq('id', newMutation.sequence_id)
                        .single();

                    const alert: MutationAlert = {
                        id: newMutation.id,
                        mutation_notation: newMutation.mutation_notation,
                        strain_name: seq?.strain_name || 'Unknown Strain',
                        created_at: newMutation.created_at,
                        is_novel: newMutation.is_novel,
                        is_escape: newMutation.is_escape_mutation
                    };

                    get().addAlert(alert);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('🔔 Listening for mutation alerts...');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }
}));
