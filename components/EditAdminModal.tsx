import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, KeyRound, Loader2, Save } from 'lucide-react';
import { User, UserSetor, UserRole, GeneralSettings } from '../types';

interface EditAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToEdit: User | null;
    onConfirmUpdate: (updatedUser: User) => Promise<boolean>;
    generalSettings: GeneralSettings;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({ isOpen, onClose, userToEdit, onConfirmUpdate, generalSettings }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('OPERATOR');
    const [setores, setSetores] = useState<UserSetor[]>([]);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && userToEdit) {
            setName(userToEdit.name);
            setEmail(userToEdit.email || '');
            setRole(userToEdit.role);
            setSetores(Array.isArray(userToEdit.setor) ? userToEdit.setor : []);
            setPassword('');
            setConfirmPassword('');
            setError('');
            setIsSaving(false);
        }
    }, [isOpen, userToEdit]);

    if (!isOpen || !userToEdit) return null;
    
    const handleSetorChange = (setor: UserSetor) => {
        setSetores(prev => 
            prev.includes(setor) 
                ? prev.filter(s => s !== setor)
                : [...prev, setor]
        );
    };

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        // When changing role, clear login credentials as they may become irrelevant or need to be set fresh.
        if (newRole === 'OPERATOR' || (userToEdit && userToEdit.role === 'OPERATOR')) {
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        }
    };

    const handleConfirm = async () => {
        setError('');
        const isLoginRequired = role === 'ADMIN' || role === 'SUPER_ADMIN';
        if (!name.trim() || (isLoginRequired && !email.trim())) {
            setError('Nome e Email são obrigatórios para Admins.');
            return;
        }
        if (password && password.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (setores.length === 0) {
            setError('O funcionário deve pertencer a pelo menos um setor.');
            return;
        }
        
        setIsSaving(true);
        
        const updatedUser: User = { ...userToEdit };
        delete updatedUser.password; // Remove old password first

        updatedUser.name = name.trim();
        updatedUser.email = isLoginRequired ? email.trim() : undefined;
        updatedUser.role = role;
        updatedUser.setor = setores;

        if (password) {
            updatedUser.password = password;
        }

        const success = await onConfirmUpdate(updatedUser);
        
        setIsSaving(false);

        if (success) {
            onClose();
        } else {
            setError('Falha ao salvar. Verifique se o email já está em uso.');
        }
    };
    
    const isLoginEnabled = role === 'ADMIN' || role === 'SUPER_ADMIN';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Editar Funcionário</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="relative">
                        <UserIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome Completo"
                            className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Função / Nível de Acesso</label>
                        <select value={role} onChange={e => handleRoleChange(e.target.value as UserRole)} className="mt-1 p-2 w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                            <option value="OPERATOR">Operador (Sem Login)</option>
                            <option value="ADMIN">Admin (Com Login)</option>
                            {userToEdit.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Setores</label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-md">
                            {generalSettings.setorList.map(setor => (
                                <label key={setor} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={setores.includes(setor)} onChange={() => handleSetorChange(setor)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                                    <span className="text-sm text-gray-700">{setor}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {isLoginEnabled && (
                        <>
                            <div className="relative">
                                <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email de Login"
                                    className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <p className="text-xs text-gray-500">Deixe os campos de senha em branco para não alterar a senha atual.</p>
                            <div className="relative">
                                <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nova Senha"
                                    className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="relative">
                                <KeyRound className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmar Nova Senha"
                                    className="w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </>
                    )}
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
                        {isSaving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                        <Save size={16} className="mr-2"/>
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditAdminModal;