
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../types';

// Hardcoded Supabase credentials as requested
export const supabaseUrl = 'https://uafsmsiwaxopxznupuqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZnNtc2l3YXhvcHh6bnVwdXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjAzMTIsImV4cCI6MjA3NDEzNjMxMn0._MGnu8LweUSinOSegxfyiKmYZJe-r54tfCPe6pIM_tI';

/**
 * The single, pre-configured Supabase client for the entire application.
 */
export const dbClient: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    global: {
      // Explicitly passing fetch to potentially resolve environment-specific issues where
      // the Supabase client might not correctly pick up the native fetch implementation.
      fetch: (input, init) => fetch(input, init),
    },
});

const EXPECTED_SCHEMA_VERSION = '2.11.0';

/**
 * Fetches all rows from a table, automatically handling pagination to bypass the 1000 row limit.
 */
export const fetchAll = async (tableName: string, options?: { select?: string, orderBy?: string, ascending?: boolean }) => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = dbClient.from(tableName).select(options?.select || '*');
        
        if (options?.orderBy) {
            query = query.order(options.orderBy, { ascending: options.ascending ?? false });
        } else {
            // Default ordering to ensure consistent pagination
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query.range(from, to);

        if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            throw error;
        }

        if (data) {
            allData = [...allData, ...data];
            if (data.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    return allData;
};

/**
 * Verifies if the database schema is correctly set up by calling the check_setup_status RPC.
 * This provides a detailed check for both the main functions and required extensions.
 * @returns An object indicating if setup is needed, any critical error message, and details about what might be missing.
 */
export const verifyDatabaseSetup = async (): Promise<{ setupNeeded: boolean; error: string | null; details?: any }> => {
    const { data, error } = await dbClient.rpc('check_setup_status');
    
    if (error) {
        if (error.code === '42883' || error.code === 'PGRST202') { // function does not exist
            return { setupNeeded: true, error: null, details: null };
        }
        return { setupNeeded: false, error: `Falha na verificação do banco: ${error.message}` };
    }
    
    const details = data;

    const hasMissingTable = details.tables_status?.some((t: any) => !t.exists);
    const hasMissingType = details.types_status?.some((t: any) => !t.exists);
    const hasMissingFunction = details.functions_status?.some((t: any) => !t.exists);
    const hasMissingColumn = details.columns_status?.some((c: any) => !c.exists);
    
    const versionMatch = details.db_version === EXPECTED_SCHEMA_VERSION;
    
    const isSetupNeededForAppLoad = hasMissingTable || hasMissingType || hasMissingFunction || hasMissingColumn || !versionMatch;
    
    const finalDetails = {
        ...details,
        versionMatch: versionMatch,
        dbVersion: details.db_version,
        expectedVersion: EXPECTED_SCHEMA_VERSION,
        tables: !hasMissingTable, // Simple boolean for legacy use
    };


    return { setupNeeded: isSetupNeededForAppLoad, error: null, details: finalDetails };
};


/**
 * Calls the non-destructive sync_database RPC function to create missing tables and objects.
 */
export const syncDatabase = async (): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await dbClient.rpc('sync_database');

    if (error) {
        console.error('RPC sync_database error:', JSON.stringify(error, null, 2));
        return { success: false, message: error.message };
    }

    return { success: true, message: data as string };
};

/**
 * Calls the destructive reset_database RPC function to wipe all data.
 */
export const resetDatabase = async (): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await dbClient.rpc('reset_database');

    if (error) {
        console.error('RPC reset_database error:', JSON.stringify(error, null, 2));
        return { success: false, message: error.message };
    }

    return { success: true, message: data as string };
};


/**
 * Attempts to log in a user by calling a secure RPC function in Supabase.
 */
export const loginUser = async (login: string, password_from_user: string): Promise<User | null> => {
    const { data, error } = await dbClient.rpc('login', {
        login_input: login,
        password_input: password_from_user
    });

    if (error) {
        // Log the full error object for better debugging
        console.error('RPC login error:', JSON.stringify(error, null, 2));
        return null;
    }

    return data as User | null;
};
