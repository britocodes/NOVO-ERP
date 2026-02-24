// components/ConnectScannerModal.tsx
import React from 'react';
import { X, Usb, Search, ChevronsRight } from 'lucide-react';

interface ConnectScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ConnectScannerModal: React.FC<ConnectScannerModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Usb className="mr-2 text-blue-600" />
                        Conectar Novo Bipador USB
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4 text-sm text-gray-600">
                    <p>Para adicionar um novo bipador, precisamos da sua permissão para que o sistema possa encontrá-lo.</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                        <li>Certifique-se que o bipador USB está conectado ao seu computador.</li>
                        <li>Clique no botão <strong>"Procurar Dispositivo"</strong> abaixo.</li>
                        <li>Uma janela do seu navegador será aberta. Selecione o bipador na lista e clique em <strong>"Conectar"</strong>.</li>
                    </ol>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p>Após a conexão, você será solicitado a dar um nome amigável ao bipador para fácil identificação.</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                        <Search size={16} className="mr-2" />
                        Procurar Dispositivo
                        <ChevronsRight size={16} className="ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConnectScannerModal;
