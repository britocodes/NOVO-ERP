import React, { useState } from 'react';
import { ChevronDown, ScanLine, QrCode, ClipboardCheck, Package, Users, BarChart3, Printer, Settings, LayoutDashboard, ShoppingCart, Weight, Recycle } from 'lucide-react';

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


const PassoAPassoPage: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Passo a Passo</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Guias detalhados para cada funcionalidade do sistema.</p>
            </div>

            <div className="space-y-4">
                <AccordionItem icon={<LayoutDashboard size={20} className="text-[var(--color-primary)]" />} title="Dashboard (Painel Inicial)">
                    <p>O Dashboard é sua central de informações rápidas sobre a operação.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Filtros de Período e Canal:</strong> No topo, você pode filtrar os dados para ver informações de "Hoje", "Últimos 7 dias" ou um período customizado, além de poder focar em um canal de venda específico (ML ou Shopee).</li>
                        <li><strong>Resumo da Produção:</strong> Mostra o total de unidades e pedidos para o período filtrado, com gráficos de distribuição por canal e por tipo de base (branca, preta, etc).</li>
                        <li><strong>Dedução de Materiais:</strong> Com base nos pedidos do período, o sistema calcula e exibe uma previsão de todos os insumos que serão consumidos.</li>
                        <li><strong>Cartões de Estatísticas:</strong> Exibem números-chave como total de pedidos, bipagens e atrasos, comparando os canais de venda.</li>
                        <li><strong>Ações Principais:</strong> Atalhos para as telas mais usadas, como Bipagem e Importação.</li>
                        <li><strong>Avisos da Administração:</strong> Um espaço onde administradores podem deixar recados importantes para a equipe.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<ScanLine size={20} className="text-[var(--color-primary)]" />} title="Importação de Pedidos">
                    <p>Este é o primeiro passo do seu dia: alimentar o sistema com os novos pedidos.</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Navegue até a página <strong>Importação</strong>.</li>
                        <li>Arraste e solte o arquivo Excel de vendas (do Mercado Livre ou Shopee) na área indicada, ou clique para selecionar.</li>
                        <li>Clique no botão <strong>Processar Arquivo</strong>.</li>
                        <li>O sistema analisará o arquivo e mostrará um resumo da produção e uma lista de <strong>"SKUs Não Vinculados"</strong>. Um SKU não vinculado é um código de produto que o sistema ainda não conhece.</li>
                        <li>Para cada SKU não vinculado na aba <strong>"Vínculo de SKUs"</strong>, você tem duas opções:
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li><strong>Vincular:</strong> Se o produto já existe no seu catálogo, clique em "Vincular" e selecione o "Produto Mestre" correspondente na busca.</li>
                                <li><strong>Criar:</strong> Se for um produto novo, clique em "Criar". O sistema usará o SKU importado como o código principal e pedirá o nome e a cor para cadastrá-lo.</li>
                            </ul>
                        </li>
                        <li>Após vincular todos os SKUs, revise as outras abas ("Lista Completa", "Resumida", "Totais por Cor", "Lista de Materiais") para conferir a produção.</li>
                        <li>Quando estiver tudo certo, clique no botão verde <strong>Lançar Pedidos Vinculados</strong>. Isso salvará os pedidos no sistema e os deixará prontos para a bipagem.</li>
                        <li><strong>Histórico de Importações:</strong> A coluna da direita mostra todas as importações feitas, quem as fez e quando. Você pode clicar em "Visualizar" para rever os dados de uma importação antiga sem precisar reenviar o arquivo.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<QrCode size={20} className="text-[var(--color-primary)]" />} title="Bipagem (Escaneamento) e Auto Bipagem">
                    <p>A bipagem confirma a separação de um pedido e aciona a baixa de estoque.</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Bipagem na Página Dedicada:</strong> Acesse a página <strong>Bipagem</strong>. Com o leitor de código de barras, escaneie a etiqueta do pedido. O sistema dará um feedback instantâneo (Sucesso, Duplicado, Não Encontrado).</li>
                        <li><strong>Auto Bipagem (Global):</strong> No topo de qualquer página, há um botão "Auto Bipagem".
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li>Quando <strong>ativado</strong>, o sistema fica "escutando" o leitor de código de barras em <strong>qualquer tela</strong>. Você não precisa estar na página de Bipagem.</li>
                                <li>Isso é útil para quem está embalando e precisa bipar pedidos enquanto consulta o estoque ou outra tela.</li>
                                <li>O feedback da bipagem aparecerá como uma notificação no canto da tela, em vez de no painel principal.</li>
                            </ul>
                        </li>
                        <li><strong>Prefixos de Operador:</strong> Se vários operadores compartilham o mesmo computador, um administrador pode cadastrar prefixos (ex: "JOAO", "MARIA") na página de Bipagem. O operador então bipa no formato <code>(JOAO)CODIGO_DO_PEDIDO</code>, e o sistema atribui a bipagem à pessoa correta.</li>
                        <li><strong>Histórico de Bipagens:</strong> A lista mostra todas as bipagens. Um administrador pode cancelar uma bipagem feita por engano, o que reverte a baixa de estoque e o status do pedido.</li>
                    </ol>
                </AccordionItem>

                 <AccordionItem icon={<ShoppingCart size={20} className="text-[var(--color-primary)]" />} title="Pedidos">
                    <p>Esta tela permite consultar, filtrar e gerenciar todos os pedidos que já foram lançados no sistema.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Consultar Pedidos:</strong> Use a barra de busca e os filtros (Canal, Status, Data) para encontrar pedidos específicos.</li>
                        <li><strong>Ações em Massa:</strong> Selecione um ou mais pedidos na lista para habilitar os botões de ação:
                             <ul className="list-disc list-inside pl-6 mt-1">
                                <li><strong>Marcar Erro:</strong> Altera o status do pedido para "ERRO" e permite registrar o motivo.</li>
                                <li><strong>Solucionar:</strong> Para pedidos com erro, permite registrar a solução aplicada (ex: reenviado, reembolso).</li>
                                <li><strong>Cancelar Bip:</strong> Reverte uma bipagem, retornando o estoque e o status do pedido.</li>
                                <li><strong>Excluir:</strong> Remove o pedido permanentemente do banco de dados (ação de Super Admin).</li>
                            </ul>
                        </li>
                        <li><strong>Conferência Pós-Bipagem:</strong> Uma aba para visualizar os últimos itens bipados e lançar erros rapidamente caso a separação esteja incorreta.</li>
                        <li><strong>Devoluções:</strong> Permite registrar devoluções de clientes, vinculando-as a um pedido existente pelo código de rastreio.</li>
                    </ol>
                </AccordionItem>

                 <AccordionItem icon={<ClipboardCheck size={20} className="text-[var(--color-primary)]" />} title="Planejamento e Compras">
                     <p>Use esta ferramenta para prever a produção necessária e automatizar sua lista de compras de matéria-prima.</p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Acesse a página <strong>Planejamento</strong>.</li>
                        <li>Ajuste os <strong>Parâmetros</strong> conforme sua necessidade (período de análise de vendas, dias de estoque de segurança, etc.).</li>
                        <li>Clique em <strong>Calcular Plano</strong>. O sistema analisará o histórico de vendas para projetar a demanda futura.</li>
                        <li>Revise a tabela <strong>Plano de Produção</strong>. A coluna "Produção Necessária" é calculada automaticamente, mas você pode editá-la se precisar produzir mais ou menos de um item específico.</li>
                        <li>Com o plano de produção ajustado, o sistema calculará automaticamente a <strong>Lista de Insumos Necessários</strong>, mostrando o que você precisa comprar (déficit).</li>
                        <li>Dê um nome ao plano e clique em <strong>Salvar e Gerar Lista de Compras</strong>.</li>
                        <li>Isso te levará para a página de <strong>Compras</strong>, onde você pode marcar os itens conforme forem sendo comprados e compartilhar a lista via WhatsApp.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<Weight size={20} className="text-[var(--color-primary)]" />} title="Pesagem e Moagem">
                     <p>Controle a entrada de matéria-prima pesada e a produção de material moído.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Pesagem:</strong> Na página <strong>Pesagem</strong>, clique em "Lançar Nova Pesagem", selecione o material processado, a quantidade e o operador. Isso cria um "lote pesado" que será consumido pela produção.</li>
                        <li><strong>Moagem:</strong> Na página <strong>Moagem</strong>, clique em "Lançar Nova Moagem", selecione o insumo de origem (ex: retalho), a quantidade usada, e defina o código e nome do insumo de saída (ex: fibra micronizada). O sistema dará baixa no insumo de origem e entrada no insumo de saída.</li>
                        <li>Ambas as telas exibem um resumo diário e um ranking de produção por operador.</li>
                    </ol>
                </AccordionItem>
                
                 <AccordionItem icon={<Package size={20} className="text-[var(--color-primary)]" />} title="Gerenciamento de Estoque">
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Acesse a página <strong>Estoque</strong>.</li>
                        <li>Navegue entre <strong>Insumos</strong> (matéria-prima), <strong>Processados</strong> (materiais intermediários, como bases) e <strong>Produtos Finais</strong> (itens de venda).</li>
                        <li><strong>Adicionar/Editar:</strong> Use os botões para criar novos itens ou editar existentes (nome, estoque mínimo).</li>
                        <li><strong>Configurar Receita (BOM):</strong> Para Processados e Produtos Finais, é crucial configurar a "receita". Clique no ícone de engrenagem <code className="text-xs">⚙️</code> na linha do item para definir quais insumos e em que quantidade são necessários para produzir uma unidade. Isso garante a baixa de estoque automática na bipagem.</li>
                        <li><strong>Configurar Itens de Expedição:</strong> Para Produtos Finais, clique no ícone de caixa <code className="text-xs">📦</code> para definir itens que são enviados junto com o produto (ex: manual, brinde). Isso também será abatido do estoque.</li>
                        <li><strong>Ajustar Saldo:</strong> Faça correções manuais no estoque (entrada ou saída).</li>
                        <li><strong>Registrar Produção:</strong> Dê entrada manual em um produto acabado, o que automaticamente dará baixa nos insumos da sua receita (BOM).</li>
                    </ol>
                </AccordionItem>

                 <AccordionItem icon={<Users size={20} className="text-[var(--color-primary)]" />} title="Funcionários e Ponto">
                     <ol className="list-decimal list-inside space-y-2">
                        <li>Acesse a página <strong>Funcionários</strong>.</li>
                        <li>A lista mostra todos os funcionários e o status de presença para o dia atual.</li>
                        <li>Use os botões em cada linha para marcar um funcionário como <strong>Presente</strong> ou registrar uma <strong>Falta</strong> (com opção de anexar atestado).</li>
                        <li>Para funcionários presentes, você pode registrar uma <strong>Saída Antecipada</strong> ou <strong>Hora Extra</strong>.</li>
                         <li>Clique em <strong>Editar</strong> para alterar nome, função ou setores de um funcionário.</li>
                    </ol>
                </AccordionItem>

                <AccordionItem icon={<BarChart3 size={20} className="text-[var(--color-primary)]" />} title="Relatórios">
                    <p>Esta página centraliza diversas análises sobre sua operação.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li>No menu da esquerda, escolha uma categoria (ex: Estoque, Pedidos, Bipagem).</li>
                        <li>Selecione o relatório específico que deseja visualizar.</li>
                        <li>Use os filtros no topo da página (Período, Operador, Busca) para refinar os dados.</li>
                        <li>Clique em <strong>Exportar para Excel</strong> para baixar uma planilha com os dados do relatório atual.</li>
                    </ol>
                </AccordionItem>
                
                <AccordionItem icon={<Printer size={20} className="text-[var(--color-primary)]" />} title="Etiquetas (ZPL)">
                    <p>Converta o código ZPL bruto das suas plataformas de venda em um PDF pronto para impressão, com informações de SKU adicionadas.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li>Cole o conteúdo do arquivo de etiquetas (normalmente um <code>.txt</code> da Shopee/ML) na área de texto à esquerda, ou clique em "Importar".</li>
                        <li>Clique em <strong>Processar</strong>. O sistema irá separar as páginas, extrair os dados e começar a gerar as pré-visualizações.</li>
                        <li>Se houver SKUs não reconhecidos, uma seção de <strong>"Vínculo de SKUs"</strong> aparecerá. Assim como na Importação, você pode "Vincular" ou "Criar" produtos para associá-los.</li>
                        <li>A área de pré-visualização à direita mostrará as imagens das DANFEs e das etiquetas. Note que as etiquetas de envio terão um rodapé com as informações de SKU.</li>
                        <li><strong>Para personalizar a impressão</strong>, clique no ícone de engrenagem <code className="text-xs">⚙️</code>. No modal de configurações, você pode:
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li><strong>Layout do Par:</strong> Escolher entre "Vertical" (padrão) ou "Horizontal" (DANFE e etiqueta lado a lado para economizar papel).</li>
                                <li><strong>Rodapé da Etiqueta:</strong> Mudar o template do texto (ex: de <code>SKU: {`{name}`} | QNT: {`{qty}`}</code> para <code>Produto: {`{name}`}</code>), a fonte, o tamanho e o alinhamento (esquerda, centro, direita).</li>
                            </ul>
                        </li>
                        <li>Quando estiver tudo pronto, marque/desmarque "Incluir DANFE" conforme sua necessidade e clique em <strong>Gerar PDF</strong>.</li>
                    </ol>
                </AccordionItem>
                
                <AccordionItem icon={<Settings size={20} className="text-[var(--color-primary)]" />} title="Configurações">
                     <p>Esta área é dividida em duas partes e é restrita a Administradores.</p>
                     <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Configurações (Gerenciamento de Usuários):</strong>
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li>Adicione novos funcionários, definindo nome, função (Operador ou Admin) e a quais setores ele pertence (um funcionário pode pertencer a vários).</li>
                                <li>Edite ou remova usuários existentes. Para promover um Operador a Admin, basta editar e mudar sua função, definindo um email e senha.</li>
                            </ul>
                        </li>
                        <li><strong>Configurações Gerais (Super Admin):</strong>
                            <ul className="list-disc list-inside pl-6 mt-1">
                                <li><strong>Configurações da Aplicação:</strong> Mude o nome da empresa, nomenclaturas e edite listas usadas em outras partes do sistema (ex: motivos de erro, setores).</li>
                                 <li><strong>Regras de Expedição:</strong> Crie regras globais para baixa de estoque de embalagens com base na quantidade de itens em um pedido.</li>
                                <li><strong>Ações do Banco de Dados:</strong> Verifique o status do banco, sincronize-o para aplicar atualizações e faça backups completos.</li>
                                <li><strong>Zona de Perigo:</strong> Ações destrutivas, como limpar todo o histórico de bipagens ou resetar completamente o banco de dados. <strong>Use com extremo cuidado.</strong></li>
                            </ul>
                        </li>
                    </ol>
                </AccordionItem>
            </div>
        </div>
    );
};

export default PassoAPassoPage;