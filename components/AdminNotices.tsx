// components/AdminNotices.tsx
import React, { useState } from 'react';
import { AdminNotice, User } from '../types';
import { Megaphone, Plus, X, Eye, EyeOff, Save } from 'lucide-react';

interface AdminNoticesProps {
    notices: AdminNotice[];
    currentUser: User;
    onSaveNotice: (notice: AdminNotice) => void;
    onDeleteNotice: (id: string) => void;
}

interface NoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onSave: (notice: AdminNotice) => void;
}

const NoticeModal: React.FC<NoticeModalProps> = ({ isOpen, onClose, currentUser, onSave }) => {
    const [text, setText] = useState('');
    const [level, setLevel] = useState<'green' | 'yellow' | 'red'>('yellow');
    const [type, setType] = useState<'post-it' | 'banner'>('post-it');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!text.trim()) return;
        const newNotice: AdminNotice = {
            id: `notice_${Date.now()}`,
            text,
            level,
            type,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString(),
        };
        onSave(newNotice);
        onClose();
        setText('');
        setLevel('yellow');
        setType('post-it');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Criar Novo Aviso</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div className="space-y-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Digite a mensagem do aviso..."
                        className="w-full p-2 border rounded-md min-h-[100px]"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Nível de Urgência</label>
                            <div className="flex gap-2 mt-1">
                                {(['green', 'yellow', 'red'] as const).map(l => (
                                    <button key={l} onClick={() => setLevel(l)} className={`w-8 h-8 rounded-full border-2 ${level === l ? 'border-blue-500' : 'border-transparent'} bg-${l}-400`}></button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Tipo de Aviso</label>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => setType('post-it')} className={`px-3 py-1.5 rounded-md text-sm ${type === 'post-it' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Post-it</button>
                                <button onClick={() => setType('banner')} className={`px-3 py-1.5 rounded-md text-sm ${type === 'banner' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Banner</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold flex items-center gap-2"><Save size={16} /> Salvar Aviso</button>
                </div>
            </div>
        </div>
    );
};

const PostIt: React.FC<{ notice: AdminNotice, onDismiss: (id: string) => void, canDismiss: boolean }> = ({ notice, onDismiss, canDismiss }) => {
    const [isHidden, setIsHidden] = useState(false);

    const levelClasses = {
        green: 'bg-green-200 border-green-400 text-green-800',
        yellow: 'bg-yellow-200 border-yellow-400 text-yellow-800',
        red: 'bg-red-200 border-red-400 text-red-800',
    };

    if (isHidden) {
        return (
             <div className={`p-2 rounded-lg shadow-lg flex items-center justify-center cursor-pointer border-2 ${levelClasses[notice.level]}`} onClick={() => setIsHidden(false)}>
                <Eye size={20} />
             </div>
        )
    }

    return (
        <div className={`p-4 rounded-lg shadow-lg flex flex-col border-2 ${levelClasses[notice.level]}`}>
            <div className="flex justify-between items-center mb-2">
                 <button onClick={() => setIsHidden(true)}><EyeOff size={16} /></button>
                 {canDismiss && <button onClick={() => onDismiss(notice.id)}><X size={16} /></button>}
            </div>
            <p className="text-sm font-medium flex-grow">{notice.text}</p>
            <p className="text-xs mt-2 text-right opacity-70">por {notice.createdBy}</p>
        </div>
    );
}

const AdminNotices: React.FC<AdminNoticesProps> = ({ notices, currentUser, onSaveNotice, onDeleteNotice }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const postItNotices = notices.filter(n => n.type === 'post-it');

    return (
        <>
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Avisos da Administração</h2>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary-dark-text)] px-3 py-1.5 rounded-lg hover:opacity-80">
                        <Plus size={16}/> Novo Aviso
                    </button>
                </div>
            </div>
            {postItNotices.length > 0 && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {postItNotices.map(notice => (
                        <PostIt
                            key={notice.id}
                            notice={notice}
                            onDismiss={onDeleteNotice}
                            canDismiss={currentUser.role === 'SUPER_ADMIN' || currentUser.name === notice.createdBy}
                        />
                    ))}
                </div>
            )}
            <NoticeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentUser={currentUser}
                onSave={onSaveNotice}
            />
        </>
    );
};

export default AdminNotices;