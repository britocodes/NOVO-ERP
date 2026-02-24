import React, { useState, useEffect } from 'react';
import { X, KeyRound, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onConfirm: (userId: string, newPass: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, user, onConfirm }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setNewPassword('');
            setConfirmPassword('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleConfirm = () => {
        setError('');
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        onConfirm(user.id, newPassword);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <ShieldAlert className="mr-2 text-orange-500" />
                        Alterar Senha de Administrador
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Por segurança, após conectar ao banco de dados, é necessário alterar a senha do usuário <strong>{user.name}</strong>.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                        <div className="mt-1 relative">
                             <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                        <div className="mt-1 relative">
                             <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-9 p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Confirmar e Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;