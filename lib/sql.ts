
export const SETUP_SQL_STRING = `
-- ERP Fábrica Pro - Script de Sincronização Completo v3.4

CREATE OR REPLACE FUNCTION sync_database()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN

  -- 1. EXTENSÕES
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- 2. ENUMS (Atualização Segura)
  DO $$ 
  BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_type') THEN 
        CREATE TYPE public.canal_type AS ENUM ('ML', 'SHOPEE', 'SITE', 'ALL'); 
    ELSE
        -- Tenta adicionar o valor SITE se não existir (Postgres não suporta IF NOT EXISTS no ADD VALUE diretamente de forma simples em bloco anônimo antigo, mas em versoes recentes sim)
        -- Workaround seguro: Catch error se ja existe
        BEGIN
            ALTER TYPE public.canal_type ADD VALUE 'SITE';
        EXCEPTION WHEN duplicate_object THEN
            -- Ignorar erro se ja existe
            NULL;
        END;
    END IF; 
  END $$;

  DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_value') THEN CREATE TYPE public.order_status_value AS ENUM ('NORMAL', 'ERRO', 'DEVOLVIDO', 'BIPADO', 'SOLUCIONADO'); END IF; END $$;

  -- 3. TABELAS ESSENCIAIS

  -- Configurações
  CREATE TABLE IF NOT EXISTS public.app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Usuários
  CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT,
      password TEXT,
      role TEXT NOT NULL,
      setor TEXT[] DEFAULT '{}',
      prefix TEXT,
      attendance JSONB DEFAULT '[]'::jsonb,
      ui_settings JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Estoque (Itens)
  CREATE TABLE IF NOT EXISTS public.stock_items (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_qty REAL NOT NULL DEFAULT 0,
      min_qty REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      color TEXT,
      product_type TEXT,
      expedition_items JSONB DEFAULT '[]'::jsonb,
      substitute_product_code TEXT,
      barcode TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Garante coluna barcode
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_items' AND column_name='barcode') THEN
    ALTER TABLE public.stock_items ADD COLUMN barcode TEXT;
  END IF;

  -- Movimentações de Estoque
  CREATE TABLE IF NOT EXISTS public.stock_movements (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      stock_item_code TEXT NOT NULL,
      stock_item_name TEXT NOT NULL,
      origin TEXT NOT NULL,
      qty_delta REAL NOT NULL,
      ref TEXT,
      product_sku TEXT,
      created_by_name TEXT,
      from_weighing BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Receitas (BOM)
  CREATE TABLE IF NOT EXISTS public.product_boms (
      product_sku TEXT PRIMARY KEY,
      items JSONB DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Pedidos
  CREATE TABLE IF NOT EXISTS public.orders (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      tracking TEXT,
      sku TEXT NOT NULL,
      qty_original INT NOT NULL,
      multiplicador INT DEFAULT 1,
      qty_final INT NOT NULL,
      color TEXT,
      canal public.canal_type,
      data TEXT,
      data_prevista_envio TEXT,
      status public.order_status_value DEFAULT 'NORMAL',
      customer_name TEXT,
      customer_cpf_cnpj TEXT,
      price_gross REAL DEFAULT 0,
      price_total REAL DEFAULT 0,
      platform_fees REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      shipping_paid_by_customer REAL DEFAULT 0,
      price_net REAL DEFAULT 0,
      error_reason TEXT,
      resolution_details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_sku_idx ON public.orders (order_id, sku);

  -- Logs de Bipagem
  CREATE TABLE IF NOT EXISTS public.scan_logs (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      scanned_at TIMESTAMPTZ DEFAULT NOW(),
      user_id TEXT,
      user_name TEXT,
      device TEXT,
      display_key TEXT,
      status TEXT,
      synced BOOLEAN DEFAULT FALSE,
      canal TEXT
  );

  -- Vínculos de SKU
  CREATE TABLE IF NOT EXISTS public.sku_links (
      imported_sku TEXT PRIMARY KEY,
      master_product_sku TEXT NOT NULL
  );

  -- Pesagem
  CREATE TABLE IF NOT EXISTS public.weighing_batches (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      stock_item_code TEXT NOT NULL,
      stock_item_name TEXT NOT NULL,
      initial_qty REAL NOT NULL,
      used_qty REAL DEFAULT 0,
      weighing_type TEXT DEFAULT 'daily',
      created_by_id TEXT,
      created_by_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Moagem
  CREATE TABLE IF NOT EXISTS public.grinding_batches (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      source_insumo_code TEXT NOT NULL,
      source_insumo_name TEXT,
      source_qty_used REAL NOT NULL,
      output_insumo_code TEXT NOT NULL,
      output_insumo_name TEXT,
      output_qty_produced REAL NOT NULL,
      mode TEXT,
      user_id TEXT,
      user_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Planejamento e Compras
  CREATE TABLE IF NOT EXISTS public.production_plans (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      name TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      parameters JSONB,
      plan_date TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.production_plan_items (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      plan_id UUID REFERENCES public.production_plans(id) ON DELETE CASCADE,
      product_sku TEXT,
      product_name TEXT,
      current_stock REAL,
      avg_daily_consumption REAL,
      forecasted_demand REAL,
      required_production REAL
  );

  CREATE TABLE IF NOT EXISTS public.shopping_list_items (
      stock_item_code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      is_purchased BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Histórico de Importação e Etiquetas
  CREATE TABLE IF NOT EXISTS public.import_history (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      file_name TEXT,
      processed_at TIMESTAMPTZ,
      user_name TEXT,
      item_count INT,
      unlinked_count INT,
      canal TEXT,
      processed_data JSONB
  );

  CREATE TABLE IF NOT EXISTS public.etiquetas_historico (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by_name TEXT,
      page_count INT,
      zpl_content TEXT,
      settings_snapshot JSONB,
      page_hashes TEXT[] DEFAULT '{}'
  );
  
  -- Devoluções
  CREATE TABLE IF NOT EXISTS public.returns (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      tracking TEXT NOT NULL,
      customer_name TEXT,
      logged_by_id TEXT,
      logged_by_name TEXT,
      order_id TEXT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Avisos
  CREATE TABLE IF NOT EXISTS public.admin_notices (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      level TEXT NOT NULL,
      type TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Grupos de Pacotes
  CREATE TABLE IF NOT EXISTS public.stock_pack_groups (
      id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
      name TEXT NOT NULL,
      barcode TEXT,
      item_codes TEXT[] NOT NULL,
      min_pack_qty REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_pack_groups' AND column_name='barcode') THEN
    ALTER TABLE public.stock_pack_groups ADD COLUMN barcode TEXT;
  END IF;

  -- 4. VIEWS (Dados Analíticos)
  CREATE OR REPLACE VIEW public.vw_dados_analiticos AS
  SELECT 
    o.id AS id_pedido,
    o.order_id AS codigo_pedido,
    o.data AS data_pedido,
    o.canal,
    o.status AS status_pedido,
    o.sku AS sku_mestre,
    si.name AS nome_produto,
    o.qty_final AS quantidade_final,
    sl.user_name AS bipado_por,
    sl.user_id AS bipado_por_id,
    sl.scanned_at AS data_bipagem,
    CASE 
        WHEN o.status = 'BIPADO' AND sl.scanned_at IS NOT NULL AND TO_DATE(o.data, 'YYYY-MM-DD') < DATE(sl.scanned_at) THEN 'Bipado com Atraso'
        WHEN o.status = 'BIPADO' THEN 'Bipado no Prazo'
        WHEN o.status = 'NORMAL' AND TO_DATE(o.data, 'YYYY-MM-DD') < CURRENT_DATE THEN 'Atrasado'
        WHEN o.status = 'NORMAL' THEN 'Pendente'
        ELSE o.status::text
    END AS status_derivado,
    EXTRACT(EPOCH FROM (sl.scanned_at - (o.data::date + interval '12 hours'))) / 3600 AS tempo_separacao_horas
  FROM public.orders o
  LEFT JOIN public.stock_items si ON o.sku = si.code
  LEFT JOIN public.scan_logs sl ON (sl.display_key = o.order_id OR sl.display_key = o.tracking) AND sl.status = 'OK';

  -- 5. PERMISSÕES RLS
  DO $$ 
  DECLARE 
    tbl text; 
  BEGIN 
    FOR tbl IN 
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP 
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl); 
      EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', tbl); 
      EXECUTE format('CREATE POLICY "allow_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl); 
    END LOOP; 
  END $$;

  RETURN 'Banco de dados sincronizado e atualizado (v3.4) com sucesso!';
END;
$$;

-- 6. FUNÇÕES RPC (Logica de Negocio no Banco)

-- Função: Ajuste Simples de Estoque
CREATE OR REPLACE FUNCTION adjust_stock_quantity(
    item_code text,
    quantity_delta real,
    origin_text text,
    ref_text text,
    user_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    item_id uuid;
    item_name text;
BEGIN
    SELECT id, name INTO item_id, item_name FROM public.stock_items WHERE code = item_code;
    IF item_id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;

    UPDATE public.stock_items SET current_qty = current_qty + quantity_delta WHERE id = item_id;

    INSERT INTO public.stock_movements (stock_item_code, stock_item_name, origin, qty_delta, ref, created_by_name)
    VALUES (item_code, item_name, origin_text, quantity_delta, ref_text, user_name);
END;
$$;

-- Função: Produção (Baixa de Insumos via BOM)
CREATE OR REPLACE FUNCTION record_production_run(
    item_code text,
    quantity_to_produce real,
    ref_text text,
    user_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    prod_id uuid;
    prod_name text;
    bom_data jsonb;
    bom_item jsonb;
    insumo_code text;
    qty_needed real;
    insumo_id uuid;
    insumo_name text;
    insumo_kind text;
    substitute_code text;
    insumo_stock real;
BEGIN
    -- 1. Get Product Info
    SELECT id, name INTO prod_id, prod_name FROM public.stock_items WHERE code = item_code;
    IF prod_id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;

    -- 2. Add Stock to Product
    PERFORM public.adjust_stock_quantity(item_code, quantity_to_produce, 'PRODUCAO_MANUAL', ref_text, user_name);

    -- 3. Get BOM
    SELECT items INTO bom_data FROM public.product_boms WHERE product_sku = item_code;
    
    -- 4. Deduct Ingredients
    IF bom_data IS NOT NULL THEN
        FOR bom_item IN SELECT * FROM jsonb_array_elements(bom_data)
        LOOP
            insumo_code := bom_item->>'stockItemCode';
            qty_needed := (bom_item->>'qty_per_pack')::real * quantity_to_produce;
            
            -- Find Insumo
            SELECT id, name, kind, current_qty, substitute_product_code INTO insumo_id, insumo_name, insumo_kind, insumo_stock, substitute_code 
            FROM public.stock_items WHERE code = insumo_code;

            IF insumo_id IS NOT NULL THEN
                -- Logic for substitution if primary is out of stock (simple check)
                IF insumo_stock < qty_needed AND substitute_code IS NOT NULL AND substitute_code != '' THEN
                     -- Try to deduct from substitute? For now, we deduct from primary and let it go negative, or logic can be complex.
                     -- Let's stick to primary deduction for simple trace, maybe log the substitution intention in ref.
                     NULL; 
                END IF;

                -- Deduct
                PERFORM public.adjust_stock_quantity(insumo_code, -qty_needed, 'PRODUCAO_MANUAL', ref_text || ' (Consumo)', user_name);
            END IF;
        END LOOP;
    END IF;
END;
$$;

-- Função: Login
CREATE OR REPLACE FUNCTION login(login_input text, password_input text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    found_user record;
BEGIN
    SELECT * INTO found_user FROM public.users WHERE email = login_input AND password = password_input LIMIT 1;
    IF found_user IS NOT NULL THEN
        RETURN to_jsonb(found_user);
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- Função: Reset Database (Danger)
CREATE OR REPLACE FUNCTION reset_database()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    DELETE FROM public.scan_logs;
    DELETE FROM public.orders;
    DELETE FROM public.stock_movements;
    DELETE FROM public.weighing_batches;
    DELETE FROM public.grinding_batches;
    DELETE FROM public.production_plans;
    DELETE FROM public.production_plan_items;
    DELETE FROM public.shopping_list_items;
    DELETE FROM public.returns;
    DELETE FROM public.import_history;
    DELETE FROM public.admin_notices;
    
    -- Reset stock counts
    UPDATE public.stock_items SET current_qty = 0;
    
    RETURN 'Banco de dados limpo com sucesso.';
END;
$$;

-- Função: Clear History
CREATE OR REPLACE FUNCTION clear_scan_history()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    DELETE FROM public.scan_logs;
    UPDATE public.orders SET status = 'NORMAL' WHERE status = 'BIPADO';
END;
$$;

-- Função: Bulk Inventory Update
CREATE OR REPLACE FUNCTION bulk_set_initial_stock(
    updates jsonb,
    user_name text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    update_item jsonb;
    item_code text;
    new_qty real;
    current_qty_val real;
    delta real;
BEGIN
    FOR update_item IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        item_code := update_item->>'item_code';
        new_qty := (update_item->>'new_initial_quantity')::real;
        
        SELECT current_qty INTO current_qty_val FROM public.stock_items WHERE code = item_code;
        
        IF current_qty_val IS NOT NULL THEN
            delta := new_qty - current_qty_val;
            IF delta != 0 THEN
                PERFORM public.adjust_stock_quantity(item_code, delta, 'AJUSTE_MANUAL', 'Inventário em Massa', user_name);
            END IF;
        END IF;
    END LOOP;
    RETURN 'Estoque atualizado em massa.';
END;
$$;

-- Função: Cancel Scan and Revert
CREATE OR REPLACE FUNCTION cancel_scan_id_and_revert_stock(
    scan_id_to_cancel uuid,
    user_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    scan_row record;
    order_row record;
    sku_link_row record;
    master_sku text;
BEGIN
    -- 1. Get Scan
    SELECT * INTO scan_row FROM public.scan_logs WHERE id = scan_id_to_cancel;
    IF scan_row IS NULL THEN RETURN; END IF;

    -- 2. Find Order
    SELECT * INTO order_row FROM public.orders 
    WHERE (order_id = scan_row.display_key OR tracking = scan_row.display_key) AND status = 'BIPADO';
    
    -- 3. Revert Order Status
    IF order_row IS NOT NULL THEN
        UPDATE public.orders SET status = 'NORMAL' WHERE id = order_row.id;
        
        -- 4. Revert Stock (Add +1 back)
        SELECT master_product_sku INTO master_sku FROM public.sku_links WHERE imported_sku = order_row.sku;
        IF master_sku IS NULL THEN master_sku := order_row.sku; END IF;
        
        PERFORM public.adjust_stock_quantity(master_sku, 1, 'AJUSTE_MANUAL', 'Cancelamento Bipagem ' || scan_row.display_key, user_name);
    END IF;

    -- 5. Delete Log
    DELETE FROM public.scan_logs WHERE id = scan_id_to_cancel;
END;
$$;

-- Função: Delete Orders
CREATE OR REPLACE FUNCTION delete_orders(order_ids text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM public.orders WHERE id = ANY(order_ids);
END;
$$;

-- Função: Record Weighing
CREATE OR REPLACE FUNCTION record_weighing_and_deduct_stock(
    item_code text,
    quantity_to_weigh real,
    weighing_type_text text,
    user_id text,
    user_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    item_name text;
BEGIN
    SELECT name INTO item_name FROM public.stock_items WHERE code = item_code;
    
    INSERT INTO public.weighing_batches (stock_item_code, stock_item_name, initial_qty, weighing_type, created_by_id, created_by_name)
    VALUES (item_code, item_name, quantity_to_weigh, weighing_type_text, user_id, user_name);
    
    PERFORM public.adjust_stock_quantity(item_code, quantity_to_weigh, 'PESAGEM', 'Lote Pesado', user_name);
END;
$$;

-- Função: Record Grinding
CREATE OR REPLACE FUNCTION record_grinding_run(
    source_code text,
    source_qty real,
    output_code text,
    output_name text,
    output_qty real,
    op_mode text,
    op_user_id text,
    op_user_name text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    source_name text;
BEGIN
    SELECT name INTO source_name FROM public.stock_items WHERE code = source_code;

    -- 1. Deduct Source
    PERFORM public.adjust_stock_quantity(source_code, -source_qty, 'MOAGEM', 'Consumo Moagem', op_user_name);

    -- 2. Add Output
    IF NOT EXISTS (SELECT 1 FROM public.stock_items WHERE code = output_code) THEN
        INSERT INTO public.stock_items (code, name, kind, unit, current_qty) 
        VALUES (output_code, output_name, 'INSUMO', 'kg', 0);
    END IF;
    
    PERFORM public.adjust_stock_quantity(output_code, output_qty, 'MOAGEM', 'Produção Moagem', op_user_name);

    -- 3. Log Batch
    INSERT INTO public.grinding_batches (source_insumo_code, source_insumo_name, source_qty_used, output_insumo_code, output_insumo_name, output_qty_produced, mode, user_id, user_name)
    VALUES (source_code, source_name, source_qty, output_code, output_name, output_qty, op_mode, op_user_id, op_user_name);
END;
$$;

-- Função: Check Status
CREATE OR REPLACE FUNCTION check_setup_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    tables_status jsonb;
    types_status jsonb;
    functions_status jsonb;
    columns_status jsonb;
    
    check_table text := 'SELECT jsonb_agg(jsonb_build_object(''name'', t, ''exists'', EXISTS (SELECT FROM pg_tables WHERE schemaname = ''public'' AND tablename = t))) FROM unnest($1::text[]) t';
    check_type text := 'SELECT jsonb_agg(jsonb_build_object(''name'', t, ''exists'', EXISTS (SELECT FROM pg_type WHERE typname = t))) FROM unnest($1::text[]) t';
    check_func text := 'SELECT jsonb_agg(jsonb_build_object(''name'', t, ''exists'', EXISTS (SELECT FROM pg_proc WHERE proname = t))) FROM unnest($1::text[]) t';

BEGIN
    EXECUTE check_table USING ARRAY['stock_items', 'orders', 'stock_movements', 'users', 'scan_logs', 'product_boms', 'sku_links', 'weighing_batches', 'production_plans', 'shopping_list_items', 'stock_pack_groups'] INTO tables_status;
    EXECUTE check_type USING ARRAY['canal_type', 'order_status_value'] INTO types_status;
    EXECUTE check_func USING ARRAY['sync_database', 'adjust_stock_quantity', 'record_production_run', 'login'] INTO functions_status;

    SELECT jsonb_agg(jsonb_build_object('table', t, 'column', c, 'exists', EXISTS (SELECT FROM information_schema.columns WHERE table_name=t AND column_name=c)))
    INTO columns_status
    FROM (VALUES ('stock_items', 'barcode'), ('stock_items', 'substitute_product_code')) AS v(t, c);

    RETURN jsonb_build_object(
        'tables_status', tables_status,
        'types_status', types_status,
        'functions_status', functions_status,
        'columns_status', columns_status,
        'db_version', '2.11.0'
    );
END;
$$;
`;
