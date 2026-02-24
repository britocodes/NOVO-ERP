
// components/EditItemModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Edit3, ShieldCheck, Scan } from 'lucide-react';
import { StockItem, User, GeneralSettings } from '../types';

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: StockItem;
    currentUser: User;
    onConfirm: (itemId: string, updates: Partial<Pick<StockItem, 'name' | 'min_qty' | 'category' | 'color' | 'product_type' | 'substitute_product_code' | 'barcode'>>) => Promise<boolean>;
    generalSettings: GeneralSettings;
    products: StockItem[]; // All products to choose as substitute
}

const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, item, currentUser, onConfirm, generalSettings, products }) => {
    const [name, setName] = useState('');
    const [minQty, setMinQty] = useState(0);
    const [category, setCategory] = useState('');
    const [color, setColor] = useState('');
    const [productType, setProductType] = useState<'papel_de_parede' | 'miudos'>('papel_de_parede');
    const [substituteProductCode, setSubstituteProductCode] = useState<string | null>('');
    const [barcode, setBarcode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && item) {
            setName(item.name);
            setMinQty(item.min_qty);
            setCategory(item.category || '');
            setColor(item.color || '');
            setProductType(item.product_type || 'papel_de_parede');
            setSubstituteProductCode(item.substitute_product_code || null);
            setBarcode(item.barcode || '');
            setError('');
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleConfirm = async () => {
        setError('');
        if (!name.trim()) {
            setError('O nome do item não pode ser vazio.');
            return;
        }
        
        const updates: Partial<Pick<StockItem, 'name' | 'min_qty' | 'category' | 'color' | 'product_type' | 'substitute_product_code' | 'barcode'>> = {
            name: name.trim(),
            barcode: barcode.trim() || undefined,
        };

        if (item.kind === 'PRODUTO') {
            updates.color = color.trim();
            updates.product_type = productType;
            updates.substitute_product_code = substituteProductCode;
        } else {
            updates.min_qty = minQty;
            if (item.kind === 'INSUMO') {
                updates.category = category;
            }
            if(item.kind === 'PROCESSADO') {
                 updates.substitute_product_code = substituteProductCode;
            }
        }

        const success = await onConfirm(item.id, updates);
        if (!success) {
            setError('Falha ao salvar. Verifique se você tem permissão para esta ação.');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Edit3 className="mr-2 text-blue-600" />
                        Editar Item
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                    Editando: <strong>{item.code}</strong>.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="edit-item-name" className="block text-sm font-medium text-gray-700">Nome do Item</label>
                        <input
                            id="edit-item-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {item.kind === 'PRODUTO' ? (
                        <>
                            <div>
                                <label htmlFor="edit-item-color" className="block text-sm font-medium text-gray-700">Cor</label>
                                <input
                                    id="edit-item-color"
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-item-product-type" className="block text-sm font-medium text-gray-700">Tipo do Produto</label>
                                <select
                                    id="edit-item-product-type"
                                    value={productType}
                                    onChange={(e) => setProductType(e.target.value as any)}
                                    className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="papel_de_parede">{generalSettings.productTypeNames.papel_de_parede}</option>
                                    <option value="miudos">{generalSettings.productTypeNames.miudos}</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            {item.kind === 'INSUMO' && (
                                <div>
                                    <label htmlFor="edit-item-category" className="block text-sm font-medium text-gray-700">Categoria</label>
                                    <select
                                        id="edit-item-category"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Sem Categoria</option>
                                        {(generalSettings.insumoCategoryList || []).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                             <div>
                                <label htmlFor="edit-min-qty" className="block text-sm font-medium text-gray-700">Estoque Mínimo</label>
                                <input
                                    id="edit-min-qty"
                                    type="number"
                                    value={minQty}
                                    onChange={(e) => setMinQty(Number(e.target.value))}
                                    className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </>
                    )}

                     {/* Barcode Field */}
                    <div>
                        <label htmlFor="edit-barcode" className="text-sm font-medium text-gray-700">Código de Barras (EAN/GTIN)</label>
                        <div className="relative mt-1">
                            <Scan size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="edit-barcode"
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                                className="block w-full pl-9 p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="Escaneie ou digite..."
                            />
                        </div>
                    </div>

                    {(item.kind === 'PRODUTO' || item.kind === 'PROCESSADO') && (
                        <div>
                            <label htmlFor="substitute-product" className="block text-sm font-medium text-gray-700">Produto Substituto (Opcional)</label>
                             <select
                                id="substitute-product"
                                value={substituteProductCode || ''}
                                onChange={(e) => setSubstituteProductCode(e.target.value || null)}
                                className="mt-1 w-full p-2 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Nenhum substituto</option>
                                {products.filter(p => p.code !== item.code && p.kind === item.kind).map(p => (
                                    <option key={p.id} value={p.code}>{p.name} ({p.code})</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Se o estoque deste produto acabar, o sistema usará o estoque do substituto no planejamento.</p>
                        </div>
                    )}
                    
                    {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!name.trim()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">Confirmar Alteração</button>
                </div>
            </div>
        </div>
    );
};

export default EditItemModal;
