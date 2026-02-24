// components/Toast.tsx
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
    toast: ToastMessage;
    removeToast: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, removeToast }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => removeToast(toast.id), 300); // Allow time for exit animation
        }, 10000); // 10 seconds

        return () => clearTimeout(timer);
    }, [toast.id, removeToast]);

    const handleClose = () => {
        setExiting(true);
        setTimeout(() => removeToast(toast.id), 300);
    };

    const typeInfo = {
        success: {
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            bg: 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]',
            text: 'text-[var(--color-success-text)]',
        },
        error: {
            icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            bg: 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)]',
            text: 'text-[var(--color-danger-text)]',
        },
        info: {
            icon: <Info className="h-5 w-5 text-blue-500" />,
            bg: 'bg-[var(--color-info-bg)] border-[var(--color-info-border)]',
            text: 'text-[var(--color-info-text)]',
        },
    };

    const { icon, bg, text } = typeInfo[toast.type];

    return (
        <div
            className={`w-full max-w-sm rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${bg} transition-all duration-300 ease-in-out transform ${
                exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
            }`}
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">{icon}</div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-medium ${text}`}>{toast.message}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={handleClose}
                            className={`inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none`}
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;