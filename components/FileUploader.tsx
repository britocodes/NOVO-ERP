
import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

interface FileUploaderProps {
    onFileSelect: (file: File | null) => void;
    selectedFile: File | null;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, selectedFile }) => {
    const [isDragging, setIsDragging] = useState(false);
    
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };
    
    return (
        <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm w-full">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Importar Pedidos</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Arraste ou selecione o arquivo Excel do Mercado Livre ou Shopee.</p>
            
            <label 
                htmlFor="file-upload"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)]'}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    {selectedFile ? (
                        <>
                            <FileText className="w-10 h-10 mb-3 text-green-500" />
                            <p className="mb-2 text-sm text-[var(--color-text-primary)] font-semibold">{selectedFile.name}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">Arquivo pronto para processar. <br/>Clique aqui para selecionar outro.</p>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-10 h-10 mb-3 text-[var(--color-text-secondary)]" />
                            <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                                <span className="font-semibold text-[var(--color-primary)]">Clique para enviar</span> ou arraste e solte
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">XLSX, XLS ou CSV</p>
                        </>
                    )}
                </div>
                <input id="file-upload" type="file" className="hidden" onChange={handleChange} accept=".xlsx, .xls, .csv"/>
            </label>
        </div>
    );
};

export default FileUploader;