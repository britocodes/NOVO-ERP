import React, { useState } from 'react';
import { X, UserPlus, KeyRound, Loader2, Mail } from 'lucide-react';
import { UserRole, UserSetor, GeneralSettings } from '../types';

interface AddFuncionarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddUser: (name: string, setor: UserSetor[], role: UserRole, email?: string, password?: string) => Promise<{ success: boolean; message?: string; }>;
    generalSettings: GeneralSettings;
}

const AddFuncionarioModal: React.FC<AddFuncionarioModalProps> = ({ isOpen, onClose, onAddUser, generalSettings }) => {
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('OPERATOR');
    const [newUserSetores, setNewUserSetores] = useState<UserSetor[]>(generalSettings.setorList.length > 0 ? [generalSettings.setorList[0]] : []);
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSetorChange = (setor: UserSetor) => {
        setNewUserSetores(prev => 
            prev.includes(setor) 
                ? prev.filter(s => s !== setor)
                : [...prev, setor]
        );
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        const result = await onAddUser(newUserName, newUserSetores, newUserRole, newUserEmail, newUserPassword);
        setIsAdding(false);
        if (result.success) {
            onClose();
            // Reset state for next time
            setNewUserName('');
            setNewUserRole('OPERATOR');
            setNewUserSetores(generalSettings.setorList.length > 0 ? [generalSettings.setorList[0]] : []);
            setNewUserPassword('');
            setNewUserEmail('');
        } else {
            alert(result.message || "Falha ao adicionar funcionário. Verifique os dados e tente novamente.");
        }
    };
    
    if (!isOpen) return null;

    const isLoginRequired = newUserRole === 'ADMIN' || newUserRole === 'SUPER_ADMIN';
    const isFormValid = newUserName.trim() !== '' && newUserSetores.length > 0 && (!isLoginRequired || newUserEmail.trim() !== '');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleConfirm} className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <UserPlus className="mr-2 text-blue-600" />
                        Cadastrar Novo Funcionário
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="new-user-name" className="text-sm font-medium text-gray-700">Nome Completo</label>
                            <input
                                id="new-user-name"
                                type="text"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                                placeholder="Nome do funcionário"
                                className="mt-1 p-2 w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                         <div>
                            <label className="text-sm font-medium text-gray-700">Função / Nível de Acesso</label>
                            <select
                                id="new-user-role"
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                                className="mt-1 p-2 w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="OPERATOR">Operador (Sem Login)</option>
                                <option value="ADMIN">Admin (Com Login)</option>
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">Setores</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border rounded-md">
                            {generalSettings.setorList.map(setor => (
                                <label key={setor} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={newUserSetores.includes(setor)}
                                        onChange={() => handleSetorChange(setor)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700">{setor}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {isLoginRequired && (
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="new-user-email"  className="text-sm font-medium text-gray-700">Email</label>
                                <div className="relative mt-1">
                                    <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        id="new-user-email"
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        placeholder="email@dominio.com"
                                        className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        required={isLoginRequired}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="new-user-password"  className="text-sm font-medium text-gray-700">Senha (Opcional)</label>
                                <div className="relative mt-1">
                                    <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        id="new-user-password"
                                        type="password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="Senha para o Admin"
                                        className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!isFormValid || isAdding}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {isAdding ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                        {isAdding ? 'Salvando...' : 'Salvar Funcionário'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddFuncionarioModal;