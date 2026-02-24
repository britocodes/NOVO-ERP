
// lib/scanner.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Canal, OrderItem, ScanResult, User, GeneralSettings } from '../types';

/**
 * Processes a scan by interacting with the database.
 * @param db The Supabase client instance.
 * @param inputCode The raw code from the scanner.
 * @param loggedInUser The currently logged-in user.
 * @param device The device name.
 * @param allUsers The list of all users to check for operator prefixes.
 * @param bipagemSettings The specific settings for scanning behavior.
 * @param zplMap Optional map of ZPL codes to save on scan.
 * @returns A promise resolving to a ScanResult.
 */
export const resolveScan = async (
    db: SupabaseClient,
    inputCode: string,
    loggedInUser: User,
    device: string,
    allUsers: User[],
    bipagemSettings: GeneralSettings['bipagem'],
    zplMap?: Map<string, string>
): Promise<ScanResult> => {
    let cleanInput = inputCode.trim().toUpperCase();
    let operatorUser = loggedInUser; // Fallback to the logged-in user
    let operatorDevice = device;

    // --- Suffix Logic ---
    if (bipagemSettings.scanSuffix && cleanInput.endsWith(bipagemSettings.scanSuffix.toUpperCase())) {
        cleanInput = cleanInput.slice(0, -bipagemSettings.scanSuffix.length);
    }

    if (!cleanInput) {
        return { status: 'ERROR', message: "Código vazio.", input_code: cleanInput, display_key: cleanInput, synced_with_list: false };
    }

    // --- Operator Logic ---
    const prefixMatch = cleanInput.match(/^\(([^)]+)\)(.*)/);
    let orderCodeToSearch = cleanInput;
    let operatorFromPrefix: User | undefined;

    // First, check for a prefix to separate the code from the operator part
    if (prefixMatch) {
        const prefix = prefixMatch[1];
        const restOfCode = prefixMatch[2];
        operatorFromPrefix = allUsers.find(u => u.prefix && u.prefix.toUpperCase() === prefix.toUpperCase());

        // A code might look like a prefix but isn't. Only strip if the operator is valid.
        if (operatorFromPrefix) {
            orderCodeToSearch = restOfCode;
        }
    }
    
    // Now, determine the operator to be used, with priority
    const operatorFromSettings = allUsers.find(u => u.id === bipagemSettings.defaultOperatorId);

    if (operatorFromSettings) { // Priority 1: Default operator
        operatorUser = operatorFromSettings;
        operatorDevice = `Padrão (${operatorFromSettings.name})`;
    } else if (operatorFromPrefix) { // Priority 2: Prefix operator (only if no default)
        operatorUser = operatorFromPrefix;
        operatorDevice = `Prefixo (${operatorFromPrefix.prefix})`;
    }
    // Priority 3: Logged-in user is the fallback if neither of the above apply.

    // --- "BR" SITE Detection and Order Update ---
    let finalOrderCanal: Canal | undefined = undefined;
    if (orderCodeToSearch.toUpperCase().endsWith('BR')) {
        finalOrderCanal = 'SITE';
    }

    // 1. Find the order in the database
    const { data: orderData, error: orderError } = await db
        .from('orders')
        .select('*')
        .or(`order_id.eq.${orderCodeToSearch},tracking.eq.${orderCodeToSearch}`);
    
    if (orderError) {
        console.error("Error fetching order:", orderError);
        return { status: 'ERROR', message: 'Erro de comunicação com o banco.', input_code: cleanInput, display_key: cleanInput, synced_with_list: false };
    }
    
    let foundOrder: OrderItem | null = orderData?.[0] ? {
      ...orderData[0],
      orderId: orderData[0].order_id,
      qty_original: orderData[0].qty_original,
      qty_final: orderData[0].qty_final
    } : null;

    // If the order exists and we detected a 'SITE' code, ensure the order is updated in the DB
    if (foundOrder && finalOrderCanal === 'SITE' && foundOrder.canal !== 'SITE') {
        const { data: updatedOrder, error: updateError } = await db
            .from('orders')
            .update({ canal: 'SITE' })
            .eq('id', foundOrder.id)
            .select()
            .single();
        if (!updateError && updatedOrder) {
            // Update the in-memory order object
            foundOrder.canal = 'SITE';
        }
    }


    if (!foundOrder) {
        // Check for previous NOT_FOUND scans for the same code to avoid cluttering the log
        const { data: existingNotFoundScan, error: notFoundCheckError } = await db
            .from('scan_logs')
            .select('id, user_name, scanned_at, device, status')
            .eq('display_key', cleanInput)
            .order('scanned_at', { ascending: false })
            .limit(1)
            .single();

        // Ignore "no rows found" error, but log others
        if (notFoundCheckError && notFoundCheckError.code !== 'PGRST116') { 
            console.error("Error checking for existing not_found scans:", notFoundCheckError);
        }

        if (existingNotFoundScan) {
             return {
                status: 'DUPLICATE',
                message: 'Este item já foi bipado e não foi encontrado.',
                input_code: cleanInput,
                display_key: cleanInput,
                synced_with_list: false,
                first_scan: {
                    by: existingNotFoundScan.user_name,
                    at: new Date(existingNotFoundScan.scanned_at).toLocaleTimeString('pt-BR'),
                    device: existingNotFoundScan.device,
                },
                user: { name: operatorUser.name, device: operatorDevice }
            };
        }

        // If no previous scan found for this unknown code, log it as NOT_FOUND
        const { data: newScanData } = await db
            .from('scan_logs')
            .insert({
                scanned_at: new Date().toISOString(),
                user_id: operatorUser.id,
                user_name: operatorUser.name,
                device: operatorDevice,
                display_key: cleanInput,
                status: 'NOT_FOUND',
                synced: false,
                canal: finalOrderCanal, // Log canal if detected
            })
            .select()
            .single();

        return { 
            status: 'NOT_FOUND', 
            message: 'Pedido não encontrado na base de dados.', 
            input_code: cleanInput, 
            display_key: cleanInput, 
            synced_with_list: false,
            scan: newScanData ? { id: newScanData.id, at: newScanData.scanned_at } : undefined,
            user: { name: operatorUser.name, device: operatorDevice },
            channel: finalOrderCanal
        };
    }
    
    const display_key = foundOrder.orderId || foundOrder.tracking;
    
    // 2. Check for duplicates in scan_logs for a found order
    const { data: existingScan, error: scanError } = await db
        .from('scan_logs')
        .select('*')
        .eq('display_key', display_key)
        .in('status', ['OK', 'ADJUSTED'])
        .maybeSingle();

    if (scanError) {
        console.error("Error checking for duplicate scans:", scanError);
        return { status: 'ERROR', message: 'Erro ao verificar duplicatas.', input_code: cleanInput, display_key, synced_with_list: true };
    }

    if (existingScan) {
        return {
            status: 'DUPLICATE',
            message: 'Este item já foi bipado.',
            input_code: cleanInput,
            display_key,
            channel: foundOrder.canal,
            order_key: foundOrder.orderId,
            sku_key: foundOrder.sku,
            tracking_number: foundOrder.tracking,
            synced_with_list: true,
            first_scan: {
                by: existingScan.user_name,
                at: new Date(existingScan.scanned_at).toLocaleTimeString('pt-BR'),
                device: existingScan.device,
            }
        };
    }
    
    // 3. Persist the new scan log with the correct operator
    const { data: newScanData, error: insertError } = await db
        .from('scan_logs')
        .insert({
            scanned_at: new Date().toISOString(),
            user_id: operatorUser.id,
            user_name: operatorUser.name,
            device: operatorDevice,
            display_key: display_key,
            status: 'OK',
            synced: true,
            canal: foundOrder.canal,
        })
        .select()
        .single();
        
    if (insertError) {
         console.error("Error inserting scan log:", insertError);
         return { status: 'ERROR', message: 'Erro ao salvar o registro da bipagem.', input_code: cleanInput, display_key, synced_with_list: true };
    }

    // 4. Return success
    return {
        status: 'OK',
        message: 'Bipado e vinculado com sucesso!',
        input_code: cleanInput,
        display_key,
        channel: foundOrder.canal,
        order_key: foundOrder.orderId,
        sku_key: foundOrder.sku,
        tracking_number: foundOrder.tracking,
        synced_with_list: true,
        scan: {
            id: newScanData.id,
            at: newScanData.scanned_at,
        },
        user: {
            name: operatorUser.name,
            device: operatorDevice
        }
    };
};
