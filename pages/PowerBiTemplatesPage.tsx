import React, { useState } from 'react';
import { ArrowLeft, Database, Clipboard, ChevronDown, Check } from 'lucide-react';

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="bg-gray-800 text-white p-4 rounded-md text-sm relative my-4">
            <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">
                {copied ? <Check size={16} /> : <Clipboard size={16} />}
            </button>
            <pre><code>{code}</code></pre>
        </div>
    );
};

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-[var(--color-border)] rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors">
                <span>{title}</span>
                <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 bg-[var(--color-surface)] prose prose-sm max-w-none text-[var(--color-text-secondary)]">{children}</div>}
        </div>
    );
};

const PowerBiTemplatesPage: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
    return (
        <div className="space-y-6">
            <button onClick={() => setCurrentPage('powerbi')} className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:underline">
                <ArrowLeft size={18} />
                Voltar para o Dashboard
            </button>
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Modelos e Instruções para Power BI</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Siga este guia para conectar e criar seus próprios dashboards.</p>
            </div>
            
            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3"><Database size={24}/>Conexão com o Banco de Dados</h2>
                <ol className="list-decimal list-inside space-y-3 text-[var(--color-text-secondary)]">
                    <li>No Power BI Desktop, clique em <strong>Obter dados</strong> e procure por <strong>"PostgreSQL"</strong>.</li>
                    <li>
                        Na janela que abrir, preencha os seguintes campos (fornecidos pelo suporte):
                        <ul className="list-disc list-inside pl-6 mt-2 space-y-1 font-mono text-sm bg-[var(--color-surface-secondary)] p-3 rounded-md border">
                            <li><strong>Servidor:</strong> <code>db.uafsmsiwaxopxznupuqw.supabase.co</code></li>
                            <li><strong>Banco de dados:</strong> <code>postgres</code></li>
                        </ul>
                    </li>
                    <li>Mantenha o Modo de Conectividade de Dados como <strong>DirectQuery</strong> para dados em tempo real.</li>
                    <li>Na aba "Credenciais", insira o <strong>Nome de usuário</strong> e <strong>Senha</strong> fornecidos pelo suporte. Use o Nível "Banco de dados".</li>
                    <li>Clique em Conectar. No Navegador, selecione todas as tabelas dentro do schema <strong>"public"</strong> e clique em "Carregar".</li>
                </ol>
            </div>

            <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Modelos de Relatórios (Fórmulas DAX)</h2>
                <div className="space-y-4">
                    <AccordionItem title="Modelo 1: Eficiência Operacional">
                        <p><strong>Objetivo:</strong> Medir a produtividade da equipe e identificar gargalos no processo de separação e bipagem.</p>
                        <h4>Medida: Tempo Médio de Separação (Horas)</h4>
                        <p>Calcula o tempo médio, em horas, entre a data de importação do pedido e o momento em que ele foi bipado.</p>
                        <CodeBlock code={`Tempo Médio de Separação (Horas) = 
VAR BipagensValidas =
    FILTER(
        'scan_logs',
        'scan_logs'[status] = "OK" || 'scan_logs'[status] = "ADJUSTED" || 'scan_logs'[synced] = TRUE()
    )
VAR TabelaComDatas =
    ADDCOLUMNS(
        BipagensValidas,
        "DataPedido", RELATED('orders'[data])
    )
RETURN
    AVERAGEX(
        TabelaComDatas,
        DATEDIFF(
            DATEVALUE([DataPedido]),
            [scanned_at],
            HOUR
        )
    )`} />

                        <h4>Coluna Calculada: Status de Atraso</h4>
                        <p>Crie esta coluna na tabela 'orders' para classificar facilmente os pedidos.</p>
                        <CodeBlock code={`Status Atraso = 
VAR DataPedido = DATEVALUE('orders'[data])
VAR ScanInfo = 
    LOOKUPVALUE(
        'scan_logs'[scanned_at],
        'scan_logs'[display_key], 'orders'[order_id]
    )
VAR DataScan = IF(ISBLANK(ScanInfo), BLANK(), DATEVALUE(ScanInfo))
RETURN
    IF(
        'orders'[status] <> "BIPADO",
        IF(DataPedido < TODAY(), "Atrasado", "Pendente"),
        IF(DataScan > DataPedido, "Bipado com Atraso", "Bipado no Prazo")
    )`} />
                    </AccordionItem>
                    
                    <AccordionItem title="Modelo 2: Análise de Estoque">
                        <p><strong>Objetivo:</strong> Monitorar a saúde do estoque, prever necessidades e otimizar as compras.</p>
                        <h4>Medida: Giro de Estoque (Anualizado)</h4>
                        <p>Calcula quantas vezes o estoque de um insumo foi renovado no período. Um giro alto é bom, um giro baixo pode indicar estoque parado. Use em uma tabela com 'stock_items'[name].</p>
                        <CodeBlock code={`Giro de Estoque = 
VAR PeriodoDias = DATEDIFF(MIN('stock_movements'[created_at]), MAX('stock_movements'[created_at]), DAY)
VAR ConsumoTotal = 
    CALCULATE(
        SUM('stock_movements'[qty_delta]) * -1,
        'stock_movements'[qty_delta] < 0,
        'stock_movements'[origin] IN {"BIP", "PRODUCAO_MANUAL", "PRODUCAO_INTERNA"}
    )
VAR EstoqueMedio = 
    AVERAGEX(
        VALUES('stock_items'[code]),
        'stock_items'[current_qty]
    )
RETURN
    IF(
        EstoqueMedio > 0 && PeriodoDias > 0,
        (ConsumoTotal / EstoqueMedio) * (365 / PeriodoDias),
        0
    )
`} />
                    </AccordionItem>

                     <AccordionItem title="Modelo 3: Produção e Vendas">
                        <p><strong>Objetivo:</strong> Ter uma visão clara do que foi produzido e vendido, com detalhes por cor e canal.</p>
                        <h4>Medida: Total de Unidades Produzidas (Papel de Parede)</h4>
                        <p>Soma a quantidade final de todos os pedidos que são do tipo 'papel_de_parede'. Requer relacionamento entre 'orders'[sku] e 'sku_links'[imported_sku], e entre 'sku_links'[master_product_sku] e 'stock_items'[code].</p>
                        <CodeBlock code={`Total Unidades (Papel de Parede) = 
CALCULATE(
    SUM('orders'[qty_final]),
    'stock_items'[product_type] = "papel_de_parede"
)`} />
                         <h4>Medida: Total de Unidades (Miúdos)</h4>
                         <p>Soma a quantidade final de todos os pedidos que são do tipo 'miudos'.</p>
                         <CodeBlock code={`Total Unidades (Miúdos) = 
CALCULATE(
    SUM('orders'[qty_final]),
    'stock_items'[product_type] = "miudos"
)`} />
                     </AccordionItem>
                </div>
            </div>
        </div>
    );
};

export default PowerBiTemplatesPage;