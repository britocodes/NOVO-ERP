import React, { useState } from 'react';
import { Factory, LogIn, Loader2, AlertTriangle } from 'lucide-react';

interface LoginPageProps {
    onLogin: (login: string, pass: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!loginInput.trim() || !password.trim()) {
            setError('Por favor, preencha o usuário e a senha.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 820);
            return;
        }

        setIsLoading(true);

        const success = await onLogin(loginInput, password);

        if (!success) {
            setError('Usuário ou senha incorreta. Por favor, verifique suas credenciais.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 820); // Animation duration
        }
        
        setIsLoading(false);
    };

    const errorInputClass = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]';

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
            <div className={`w-full max-w-sm p-8 space-y-6 bg-[var(--color-surface)] rounded-2xl shadow-lg ${isShaking ? 'animate-shake' : ''}`}>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center bg-[var(--color-primary-light)] p-3 rounded-full mb-4">
                       <Factory className="h-8 w-8 text-[var(--color-primary)]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Acesso ao Sistema</h1>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Acesso ao sistema de gerenciamento.</p>
                </div>
                
                <form className="space-y-6" onSubmit={handleEmailLogin}>
                    <div className="rounded-md -space-y-px">
                        <div>
                            <label htmlFor="login-input" className="sr-only">Usuário ou Email</label>
                            <input
                                id="login-input"
                                name="login"
                                type="text"
                                autoComplete="username"
                                required
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-[var(--color-text-secondary)] text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-t-md focus:outline-none focus:z-10 sm:text-sm ${errorInputClass}`}
                                placeholder="Usuário ou Email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Senha</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-[var(--color-text-secondary)] text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-b-md focus:outline-none focus:z-10 sm:text-sm ${errorInputClass}`}
                                placeholder="Senha"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center justify-center p-2 rounded-md bg-red-50 text-red-700">
                            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-[var(--color-primary-text)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-70"
                        >
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                {isLoading ? <Loader2 className="h-5 w-5 text-blue-300 animate-spin" /> : <LogIn className="h-5 w-5 text-[var(--color-primary)] opacity-70 group-hover:opacity-80" aria-hidden="true" />}
                            </span>
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;