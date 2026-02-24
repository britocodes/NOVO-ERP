// pages/DatabaseSetupPage.tsx
import React, { useState } from 'react';
import { SETUP_SQL_STRING } from '../lib/sql';
import { Copy, Check, AlertTriangle, ChevronRight, CheckCircle, XCircle, Server, Type, FunctionSquare } from 'lucide-react';

const CopyCodeButton: React.FC<{ code: string }> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 hover:text-white transition-colors"
            title="Copiar para a área de transferência"
        >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
    );
};

interface StatusItemProps {
    name: string;
    exists: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({ name, exists }) => (
    <div className={`flex items-center p-1.5 rounded ${exists ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
        {exists ? <CheckCircle size={14} className="mr-2 flex-shrink-0"/> : <XCircle size={14} className="mr-2 flex-shrink-0"/>}
        <span className="font-mono text-xs">{name}</span>
    </div>
);

interface DatabaseSetupPageProps {
    onRetry: () => void;
    details: any | null;
}

const Step: React.FC<{ title: string, isComplete: boolean, children: React.ReactNode }> = ({ title, isComplete, children }) => (
    <div className={`p-4 border rounded-lg ${isComplete ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <div className="flex items-center mb-2">
            {isComplete ? 
                <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" /> : 
                <XCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />}
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="pl-9 text-sm text-gray-700 space-y-2">
            {children}
        </div>
    </div>
);

const DatabaseSetupPage: React.FC<DatabaseSetupPageProps> = ({ onRetry, details }) => {
    const [showDetails, setShowDetails] = useState(false);
    
    const isUuidEnabled = details ? details.uuid : false;
    const areFunctionsCreated = details ? details.sync : false;
    const areTablesCreated = details ? details.tables : false;
    const isVersionMatch = details ? details.versionMatch : false;

    const rawSql = SETUP_SQL_STRING;

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)] p-4">
            <div className="w-full max-w-3xl p-8 space-y-6 bg-[var(--color-surface)] rounded-2xl shadow-lg">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center bg-red-100 p-3 rounded-full mb-4">
                       <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Configuração Inicial Requerida</h1>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">O aplicativo detectou que o banco de dados não está configurado corretamente. Siga os passos abaixo para começar.</p>
                </div>
                
                <div className="space-y-4">
                    <Step title="Passo 1: Verificar Versão do Schema" isComplete={isVersionMatch}>
                        <p>O aplicativo precisa que o banco de dados esteja em uma versão específica. Se houver uma divergência, a estrutura do banco está desatualizada.</p>
                        <p>Versão Esperada: <strong className="font-mono">{details?.expectedVersion || 'N/A'}</strong></p>
                        <p>Versão Encontrada: <strong className="font-mono">{details?.dbVersion || 'Não encontrada'}</strong></p>
                        {!isVersionMatch && <p className="font-semibold text-red-700 mt-2">Solução: Execute o script SQL completo no Passo 3 para atualizar tudo.</p>}
                    </Step>

                    <Step title="Passo 2: Habilitar a Extensão 'uuid-ossp'" isComplete={isUuidEnabled}>
                        <p>Esta extensão é essencial para gerar IDs únicos. A falta dela causa o erro <code className="text-xs bg-red-100 p-1 rounded">function uuid_generate_v4() does not exist</code>.</p>
                        <ol className="list-decimal list-inside space-y-1 pl-2">
                            <li>Vá para seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline font-semibold">Dashboard do Supabase</a>.</li>
                            <li>Navegue para <strong>Database</strong> &gt; <strong>Extensions</strong>.</li>
                            <li>Na busca, digite <strong>uuid-ossp</strong> e clique em <strong>Enable</strong>.</li>
                        </ol>
                    </Step>

                    <Step title="Passo 3: Criar/Atualizar a Estrutura do Banco" isComplete={areFunctionsCreated && areTablesCreated}>
                        <p>
                            Seu banco de dados parece estar com a estrutura desatualizada ou incompleta. 
                            Para corrigir, execute o script SQL abaixo no <strong>SQL Editor</strong> do seu projeto Supabase. Este script é seguro para ser executado múltiplas vezes e irá apenas criar/atualizar os componentes necessários.
                        </p>
                        { !areFunctionsCreated && <p className="font-semibold text-red-700 mt-2">Principal problema detectado: Funções de sistema (como `sync_database`) não encontradas.</p> }
                        { areFunctionsCreated && !areTablesCreated && <p className="font-semibold text-red-700 mt-2">Principal problema detectado: Algumas tabelas essenciais não foram encontradas.</p> }
                        <div className="relative bg-gray-800 text-white p-4 rounded-md font-mono text-xs max-h-48 overflow-auto mt-2">
                            <CopyCodeButton code={rawSql} />
                            <pre><code>{rawSql}</code></pre>
                        </div>
                    </Step>

                    <div className="border border-[var(--color-border)] rounded-lg">
                        <button onClick={() => setShowDetails(!showDetails)} className="w-full flex justify-between items-center p-3 bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] rounded-lg">
                            <h4 className="font-semibold text-[var(--color-text-primary)]">Verificar Status Detalhado do Banco</h4>
                            <ChevronRight className={`transform transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                        </button>
                        {showDetails && details && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--color-border)]">
                                <div>
                                    <h5 className="font-semibold mb-2 flex items-center"><Server size={16} className="mr-2"/> Tabelas</h5>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                        {details.tables_status?.map((item: any) => <StatusItem key={item.name} {...item} />) ?? <p className="text-xs text-[var(--color-text-secondary)]">Não foi possível verificar.</p>}
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-semibold mb-2 flex items-center"><Type size={16} className="mr-2"/> Tipos</h5>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                        {details.types_status?.map((item: any) => <StatusItem key={item.name} {...item} />) ?? <p className="text-xs text-[var(--color-text-secondary)]">Não foi possível verificar.</p>}
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-semibold mb-2 flex items-center"><FunctionSquare size={16} className="mr-2"/> Funções</h5>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                                        {details.functions_status?.map((item: any) => <StatusItem key={item.name} {...item} />) ?? <p className="text-xs text-[var(--color-text-secondary)]">Não foi possível verificar.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-center">Passo 4: Verifique a Instalação</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] text-center mb-2">Após completar os passos acima, clique no botão para conectar novamente.</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
                    >
                        Verificar e Tentar Novamente
                        <ChevronRight className="h-5 w-5 ml-2" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetupPage;