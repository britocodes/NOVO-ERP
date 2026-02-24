import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, KeyRound, AlertTriangle, Loader2, CheckCircle, Copy, Check } from 'lucide-react';
// FIX: Changed import path to be consistent with the rest of the application.
import { SETUP_SQL_STRING } from '../lib/sql';
// FIX: getRawSql is not a valid export. Using SETUP_SQL_STRING directly.
// import { getRawSql } from '../lib/supabaseClient';
import { supabaseUrl } from '../lib/supabaseClient';

// New component for copy-to-clipboard functionality
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


interface ConfirmDbResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmReset: (adminPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const ConfirmDbResetModal: React.FC<ConfirmDbResetModalProps> = ({ isOpen, onClose, onConfirmReset }) => {
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [error, setError] = useState('');
    
    type Status = 'idle' | 'resetting' | 'success' | 'setup_needed';
    const [status, setStatus] = useState<Status>('idle');
    const [progress, setProgress] = useState(0);

    // FIX: getRawSql is not a valid export. Using SETUP_SQL_STRING directly.
    const rawSql = SETUP_SQL_STRING;

    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmText('');
            setError('');
            setStatus('idle');
            setProgress(0);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setError('');
        if (confirmText !== 'RESETAR BANCO DE DADOS') {
            setError('Você deve digitar "RESETAR BANCO DE DADOS" para confirmar.');
            return;
        }
        
        setStatus('resetting');
        setProgress(0);

        intervalRef.current = window.setInterval(() => {
            setProgress(p => {
                if (p < 90) return p + 10;
                if (intervalRef.current) clearInterval(intervalRef.current);
                return p;
            });
        }, 200);

        const result = await onConfirmReset(password);
        
        if (intervalRef.current) clearInterval(intervalRef.current);

        if (result.success) {
            setProgress(100);
            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 2500);
        } else {
            const errorMessage = result.message || 'Ocorreu um erro desconhecido durante a limpeza.';
            setError(errorMessage);
            if (errorMessage.includes('Could not find the function') || errorMessage.includes('does not exist')) {
                setStatus('setup_needed');
            } else {
                setStatus('idle');
            }
            setProgress(0);
        }
    };
    
    const canConfirm = password && confirmText === 'RESETAR BANCO DE DADOS' && status === 'idle';

    if (!isOpen) return null;

    const renderContent = () => {
        if (status === 'resetting' || status === 'success') {
            return (
                <div className="text-center">
                    {status === 'success' ? (
                        <>
                            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-800">Dados Limpos com Sucesso!</h3>
                            <p className="text-gray-600">O aplicativo será atualizado.</p>
                        </>
                    ) : (
                        <>
                            <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
                            <h3 className="text-lg font-semibold text-gray-800">Limpando Banco de Dados...</h3>
                            <p className="text-gray-600">Por favor, aguarde. Isso pode levar alguns segundos.</p>
                        </>
                    )}
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            );
        }

        if (status === 'setup_needed') {
            return (
                <div>
                    <h3 className="text-md font-semibold text-red-700 mb-2">Ação Requerida: Atualizar Banco de Dados</h3>
                    <p className="text-sm text-gray-600 mb-2">
                        A limpeza falhou porque as funções necessárias no seu banco de dados Supabase estão faltando ou desatualizadas.
                    </p>
                     <p className="text-sm text-gray-600 mb-4">
                        Para corrigir, copie e execute o script SQL abaixo no seu <strong>Editor SQL do Supabase</strong> e tente a operação novamente.
                    </p>
                    <div className="relative bg-gray-800 text-white p-4 rounded-md font-mono text-xs max-h-48 overflow-auto">
                        <CopyCodeButton code={rawSql} />
                        <pre><code>{rawSql}</code></pre>
                    </div>
                     <p className="text-xs text-red-600 mt-4"><strong>Erro original:</strong> {error}</p>
                </div>
            );
        }
        
        return (
            <>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 space-y-2 mb-4">
                    <p className="flex items-start"><AlertTriangle size={20} className="mr-2 mt-0.5 flex-shrink-0" /> <span>Você está prestes a apagar <strong>TODOS</strong> os dados (pedidos, estoque, usuários, etc), exceto o usuário Super Admin. A estrutura das tabelas será mantida.</span></p>
                    <p>Esta ação é <strong>IRREVERSÍVEL</strong>.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="confirm-text-reset" className="block text-sm font-medium text-gray-700">Para confirmar, digite <strong>RESETAR BANCO DE DADOS</strong> no campo abaixo.</label>
                        <input id="confirm-text-reset" type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
                    </div>
                    <div>
                        <label htmlFor="admin-password-reset" className="block text-sm font-medium text-gray-700">Sua Senha de Super Administrador</label>
                        <div className="mt-1 relative">
                            <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input id="admin-password-reset" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500" />
                        </div>
                    </div>
                    {error && status === 'idle' && <p className="text-xs text-red-600">{error}</p>}
                </div>
            </>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="mr-2 text-red-600" />
                        Confirmar Limpeza de Dados
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled={status !== 'idle' && status !== 'setup_needed'}>
                        <X size={24} />
                    </button>
                </div>
                {renderContent()}
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        {status === 'setup_needed' ? 'Fechar' : 'Cancelar'}
                    </button>
                    {status === 'idle' && (
                        <button onClick={handleConfirm} disabled={!canConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center">
                            Confirmar e Limpar Dados
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConfirmDbResetModal;