import React, { useState } from 'react';
import { ChevronDown, ScanLine, QrCode, ClipboardCheck, Package, Users, BarChart3, Printer, Settings, LayoutDashboard, ShoppingCart, Weight, Recycle, HelpCircle } from 'lucide-react';

interface AccordionItemProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ icon, title, children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-[var(--color-border)] rounded-lg">
            <button
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors rounded-t-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center">
                    {icon}
                    <span className="ml-3">{title}</span>
                </div>
                <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-[var(--color-surface)] rounded-b-lg">
                    <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] space-y-3">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};


const AjudaPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3"><HelpCircle size={32} /> Central de Ajuda</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Encontre respostas para as dúvidas mais comuns sobre o sistema.</p>
            </div>

            <div className="space-y-4">
                <AccordionItem icon={<Settings size={20} className="text-[var(--color-primary)]" />} title="Primeiros Passos e Configuração Inicial">
                    <p>Antes de começar a usar o sistema, é crucial realizar algumas configurações iniciais para garantir que tudo funcione corretamente.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Configurações Gerais:</strong> Vá para <strong>Configurações {'>'} Configurações Gerais</strong>. Preencha o nome da sua empresa, defina as nomenclaturas para seus produtos e cadastre os setores da sua empresa.</li>
                        <li><strong>Cadastro de Insumos e Produtos:</strong> Na tela de <strong>Estoque</strong>, cadastre todas as suas matérias-primas (Insumos) e seus produtos de venda (Produtos Finais). É importante que os códigos (SKUs) dos produtos de venda sejam os mesmos que você usa nas plataformas de e-commerce.</li>
                        <li><strong>Cadastro de Receitas (BOM):</strong> Para cada produto de venda, clique no ícone de engrenagem ⚙️ e defina a "receita", ou seja, quais insumos e em que quantidade são necessários para produzi-lo. Isso é essencial para a baixa automática de estoque.</li>
                        <li><strong>Cadastro de Funcionários:</strong> Na tela de <strong>Configurações</strong>, cadastre todos os operadores. Se um operador for também um administrador que precisa fazer login, mude sua função para "Admin" e defina um email e senha.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<ScanLine size={20} className="text-[var(--color-primary)]" />} title="Problemas Comuns na Importação">
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Erro "Não foi possível encontrar colunas essenciais":</strong> Verifique se o arquivo Excel que você está importando é o relatório de vendas correto, sem alterações na estrutura original. As colunas de "Pedido", "SKU" e "Quantidade" são obrigatórias.</li>
                        <li><strong>Muitos "SKUs Não Vinculados":</strong> Isso acontece quando os SKUs na sua planilha não correspondem exatamente aos códigos cadastrados na tela de <strong>Estoque</strong>. Certifique-se de que os códigos são idênticos. Use a função "Vincular" na tela de importação para corrigir as associações.</li>
                         <li><strong>Pedidos não aparecem após lançar:</strong> Verifique se você clicou no botão verde <strong>Lançar Pedidos Vinculados</strong> após vincular todos os SKUs. Apenas pedidos vinculados são salvos no sistema.</li>
                    </ol>
                </AccordionItem>
                
                <AccordionItem icon={<QrCode size={20} className="text-[var(--color-primary)]" />} title="Dúvidas sobre Bipagem">
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Bipador não funciona:</strong> Se você estiver usando um bipador USB físico na página de <strong>Bipagem</strong> e nada acontecer, verifique a conexão do dispositivo. Se estiver usando a <strong>Auto Bipagem</strong> global, certifique-se de que o botão no topo da tela está ativado.</li>
                        <li><strong>Erro "Não Encontrado":</strong> Este erro significa que o código de barras lido não corresponde a nenhum pedido lançado no sistema. Verifique se o pedido foi importado e lançado corretamente.</li>
                        <li><strong>Bipagem atribuída ao operador errado:</strong> Se vários operadores usam o mesmo computador, use os <strong>Prefixos de Operador</strong>. O administrador cadastra um prefixo (ex: "JOAO") e o operador bipa no formato <code>(JOAO)CODIGO_DO_PEDIDO</code>.</li>
                        <li><strong>Como cancelar uma bipagem errada?</strong> No histórico da página de <strong>Bipagem</strong> ou na tela de <strong>Pedidos</strong>, um Super Admin pode clicar no ícone de lixeira ou "Cancelar Bip" para reverter a ação. Isso devolve o estoque e o status do pedido.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<Package size={20} className="text-[var(--color-primary)]" />} title="Entendendo o Estoque">
                    <p>O controle de estoque é o coração do sistema e depende da configuração correta.</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Tipos de Itens:</strong>
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li><strong>Insumos:</strong> Matéria-prima que você compra (ex: cola, pigmento, embalagem).</li>
                                <li><strong>Processados:</strong> Materiais intermediários que você produz internamente (ex: base branca, base preta). Eles também têm uma receita (BOM).</li>
                                <li><strong>Produtos Finais:</strong> O que você vende ao cliente. O estoque deles é "virtual", calculado com base na disponibilidade dos insumos de sua receita.</li>
                            </ul>
                        </li>
                        <li><strong>Baixa Automática:</strong> O estoque dos insumos é baixado automaticamente quando um pedido é bipado. O sistema "explode" a receita do produto vendido e subtrai as quantidades correspondentes de cada insumo.</li>
                        <li><strong>Estoque não bate, o que fazer?</strong> Use a ação <strong>Ajustar Saldo</strong> (ícone de sliders 🎚️) na tela de Estoque para fazer correções manuais. Isso criará um registro de "AJUSTE_MANUAL" no histórico de movimentações.</li>
                    </ol>
                </AccordionItem>

                 <AccordionItem icon={<Users size={20} className="text-[var(--color-primary)]" />} title="Permissões de Usuário">
                     <p>O sistema possui três níveis de acesso:</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Super Admin:</strong> Tem acesso total a todas as funcionalidades, incluindo configurações perigosas como resetar o banco de dados e apagar outros administradores. Geralmente há apenas um por empresa.</li>
                        <li><strong>Admin:</strong> Pode acessar todas as telas operacionais, gerenciar usuários (exceto outros admins), cadastrar produtos e insumos, e ver relatórios. Precisa de email e senha para fazer login.</li>
                        <li><strong>Operador:</strong> Não tem acesso de login ao sistema. Sua função é ser associado a operações como pesagem e bipagem (via prefixo).</li>
                    </ul>
                </AccordionItem>

            </div>
        </div>
    );
};

export default AjudaPage;