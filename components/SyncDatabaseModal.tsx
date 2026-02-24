// components/SyncDatabaseModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertTriangle, RefreshCw, Server, Database, Columns, FunctionSquare } from 'lucide-react';

interface SyncDatabaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSync: () => Promise<{ success: boolean; message: string }>;
    onFinished: () => void;
    dbStatusDetails: any | null;
}

type VerificationStatus = 'idle' | 'verifying' | 'verified' | 'error';
type SyncStatus = 'idle' | 'running' | 'done' | 'error';


const SyncDatabaseModal: React.FC<SyncDatabaseModalProps> = ({ isOpen, onClose, onSync, onFinished, dbStatusDetails }) => {
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [pendingChanges, setPendingChanges] = useState<string[]>([]);
    const [finalMessage, setFinalMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            verifySchema();
        } else {
            // Reset state when modal closes
            setVerificationStatus('idle');
            setSyncStatus('idle');
            setPendingChanges([]);
            setFinalMessage(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, dbStatusDetails]);

    const verifySchema = () => {
        setVerificationStatus('verifying');
        setPendingChanges([]);

        if (!dbStatusDetails) {
            setVerificationStatus('error');
            return;
        }

        const pending: string[] = [];
        const formatName = (type: string, name: string) => `${type}: ${name}`;

        dbStatusDetails.tables_status?.forEach((item: { name: string; exists: boolean }) => {
            if (!item.exists) pending.push(formatName('Tabela ausente', item.name));
        });
        dbStatusDetails.types_status?.forEach((item: { name: string; exists: boolean }) => {
            if (!item.exists) pending.push(formatName('Tipo ausente', item.name));
        });
        dbStatusDetails.functions_status?.forEach((item: { name: string; exists: boolean }) => {
            if (!item.exists) pending.push(formatName('Função ausente', item.name));
        });
        dbStatusDetails.columns_status?.forEach((item: { table: string; column: string; exists: boolean }) => {
            if (!item.exists) pending.push(formatName('Coluna ausente', `${item.table}.${item.column}`));
        });

        setPendingChanges(pending);
        setVerificationStatus('verified');
    };

    const handleRunSync = async () => {
        setSyncStatus('running');
        setFinalMessage(null);
        const result = await onSync();
        
        if (result.success) {
            setSyncStatus('done');
            setFinalMessage("Banco de dados sincronizado com sucesso! A página será recarregada.");
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            setSyncStatus('error');
            setFinalMessage(result.message);
        }
        onFinished(); // Re-run verification to update status in the background
    };
    
    const renderContent = () => {
        const versionMatch = dbStatusDetails?.versionMatch;
        const dbVersion = dbStatusDetails?.dbVersion;
        const expectedVersion = dbStatusDetails?.expectedVersion;

         if (syncStatus === 'running') {
            return (
                <div className="text-center min-h-[200px] flex flex-col justify-center">
                    <Loader2 size={32} className="mx-auto text-blue-600 animate-spin mb-3" />
                    <h3 className="text-lg font-semibold text-gray-800">Sincronizando...</h3>
                    <p className="text-gray-600 text-sm">Aplicando alterações, por favor aguarde.</p>
                </div>
            )
        }

        if (verificationStatus === 'verifying') {
            return <div className="min-h-[200px] flex items-center justify-center p-4"><Loader2 className="animate-spin h-5 w-5 mr-3" /> Verificando esquema do banco...</div>;
        }
        if (verificationStatus === 'error') {
            return <div className="min-h-[200px] p-3 bg-red-100 text-red-800 border border-red-200 rounded-md">Erro ao verificar o esquema. Feche e tente novamente.</div>;
        }

        if (verificationStatus === 'verified') {
            if (pendingChanges.length === 0 && versionMatch) {
                 return (
                    <div className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg min-h-[200px] flex flex-col justify-center">
                        <div className="text-center">
                            <CheckCircle size={24} className="mx-auto mb-2" />
                            <h3 className="font-semibold">Seu banco de dados está sincronizado!</h3>
                            <p className="text-sm">Versão do App: {expectedVersion} | Versão do DB: {dbVersion}</p>
                        </div>
                        <p className="text-xs text-gray-600 mt-4 text-center p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <strong>Dica:</strong> Se você ainda estiver enfrentando problemas (como erros de "tabela não encontrada"), clique em "Aplicar Sincronização" mesmo assim. Isso forçará a recriação de permissões e pode resolver o problema.
                        </p>
                    </div>
                );
            }
             return (
                <div>
                    {!versionMatch && (
                        <div className="p-2 mb-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md text-sm">
                            <strong>Atenção:</strong> A versão do schema do banco de dados ({dbVersion || 'desconhecida'}) é diferente da esperada pelo aplicativo ({expectedVersion}). A sincronização irá atualizar o schema.
                        </div>
                    )}
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><AlertTriangle size={16} className="mr-2 text-yellow-600"/>Foram encontradas {pendingChanges.length} alterações pendentes.</h3>
                    <p className="text-sm text-gray-600 mb-3">O esquema no banco de dados está diferente do esperado pela aplicação. Para corrigir, aplique a sincronização.</p>
                    <div className="border rounded-lg max-h-60 overflow-y-auto bg-gray-50 p-3">
                        <ul className="space-y-1 text-sm text-gray-700">
                            {pendingChanges.map((change, index) => {
                                const [type, name] = change.split(': ');
                                let Icon = Database;
                                if (type.includes('Tabela')) Icon = Server;
                                if (type.includes('Coluna')) Icon = Columns;
                                if (type.includes('Função')) Icon = FunctionSquare;

                                return (
                                    <li key={index} className="flex items-center font-mono">
                                        <Icon size={14} className="mr-2 text-gray-500 flex-shrink-0"/>
                                        <span className="font-semibold text-gray-500 mr-2">{type}:</span>
                                        <span>{name}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            );
        }
        return null;
    }

    if (!isOpen) return null;

    const isActionInProgress = verificationStatus === 'verifying' || syncStatus === 'running';
    const isVerified = verificationStatus === 'verified';


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Sincronizar Banco de Dados</h2>
                    <button onClick={onClose} disabled={isActionInProgress} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="my-4">
                    {renderContent()}
                </div>

                {finalMessage && syncStatus !== 'running' && (
                    <div className={`mt-4 p-3 rounded-md text-sm text-center font-semibold ${syncStatus === 'done' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {finalMessage}
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                     <button onClick={onClose} disabled={isActionInProgress} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">
                        Fechar
                    </button>
                    {isVerified && syncStatus !== 'running' && (
                        <button onClick={handleRunSync} disabled={isActionInProgress} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            <RefreshCw size={16}/> Aplicar Sincronização
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SyncDatabaseModal;