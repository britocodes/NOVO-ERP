import React, { useState } from 'react';
import { X, ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { User } from '../types';

interface ConfirmDeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToDelete: User;
    currentUser: User;
    onConfirmDelete: (adminPassword: string) => Promise<boolean>;
}

const ConfirmDeleteUserModal: React.FC<ConfirmDeleteUserModalProps> = ({ isOpen, onClose, userToDelete, currentUser, onConfirmDelete }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setError('');
        setIsDeleting(true);
        const success = await onConfirmDelete(password);
        if (!success) {
            setError('Senha incorreta ou falha na exclusão. Tente novamente.');
        }
        setIsDeleting(false);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="mr-2 text-red-600" />
                        Confirmar Exclusão
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Você está prestes a excluir o usuário <strong>{userToDelete.name}</strong>. Esta ação não pode ser desfeita.
                </p>
                <p className="text-sm text-gray-600 mb-4">
                    Para confirmar, por favor, digite a sua senha de administrador.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">Sua Senha ({currentUser.name})</label>
                        <div className="mt-1 relative">
                             <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!password || isDeleting} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 w-44 flex items-center justify-center">
                        {isDeleting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirmar e Excluir'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteUserModal;
