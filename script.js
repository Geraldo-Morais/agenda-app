document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO E REFERÊNCIAS ---
    const canal = new BroadcastChannel('agenda_channel');

    const corpoPrincipal = document.querySelector('.corpo-principal');
    const loader = document.getElementById('loader');
    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const toastEl = document.getElementById('toast');
    
    // Botões
    const botoesControleDiv = document.getElementById('botoes-controle');
    const botoesEdicaoSelecaoDiv = document.getElementById('botoes-edicao-selecao');
    const btnEditar = document.getElementById('btn-editar');
    const btnCancelarSelecao = document.getElementById('btn-cancelar-selecao');
    
    // Modals
    const modalSettings = document.getElementById('modal-settings');
    const modalEditarDia = document.getElementById('modal-editar-dia');
    const tituloModalEdicao = document.getElementById('titulo-modal-edicao');
    const conteudoModalEdicao = document.getElementById('conteudo-modal-edicao');
    const rodapeModalEdicao = document.getElementById('rodape-modal-edicao');
    const btnSalvarEdicaoModal = document.getElementById('btn-salvar-edicao-modal');
    const btnCancelarEdicaoModal = document.getElementById('btn-cancelar-edicao-modal');
    const btnAddAtividadeModal = document.getElementById('btn-add-atividade-modal');
    const modalParabens = document.getElementById('modal-parabens');
    const btnFecharParabens = document.getElementById('btn-fechar-parabens');

    // Variáveis de estado
    let modoSelecao = false;
    let agendaDaSemana = {};
    let agendaTemplate = {};
    let semanaIdAtual = '';

    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    
    // --- LÓGICA DE TEMA E SINCRONIZAÇÃO ---
    function applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName || 'sunset');
        localStorage.setItem('agendaTheme', themeName || 'sunset');
    }

    function notificarMudanca(tipo, dados) {
        canal.postMessage({ type: tipo, payload: dados });
    }

    canal.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'theme_change') {
            applyTheme(payload.theme);
        } else if (type === 'agenda_change') {
            carregarDados(false); // Recarrega os dados sem mostrar o loader
        }
    };

    // --- LÓGICA DA AGENDA (localStorage) ---
    function mostrarToast(mensagem, tipo = 'sucesso') { if (!toastEl) return; toastEl.textContent = mensagem; toastEl.className = 'toast'; toastEl.classList.add(tipo); toastEl.classList.add('show'); setTimeout(() => { toastEl.classList.remove('show'); }, 4000); }
    
    function getWeekId(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
    }

    function salvarAgendaDaSemana() {
        localStorage.setItem(`semana_${semanaIdAtual}`, JSON.stringify(agendaDaSemana));
        notificarMudanca('agenda_change');
        notificarWidget();
    }

    function verificarConclusaoDoDia(diaId) {
        const atividadesDoDia = agendaDaSemana[diaId] || [];
        if (atividadesDoDia.length > 0 && atividadesDoDia.every(atv => atv.concluida)) {
            modalParabens.classList.add('visivel');
        }
    }

    function toggleConcluida(diaId, atividadeId) {
        const atividade = agendaDaSemana[diaId].find(atv => atv.id === atividadeId);
        if (atividade) {
            atividade.concluida = !atividade.concluida;
            salvarAgendaDaSemana();
            renderizarAgenda();
            const hoje = new Date();
            const nomeDiaHoje = mapaDosDias[hoje.getDay()];
            if(diaId === nomeDiaHoje) {
                verificarConclusaoDoDia(diaId);
            }
        }
    }

    function renderizarAgenda() {
        if (!containerDias) return;
        containerDias.innerHTML = '';
        const hoje = new Date();
        const diaDaSemanaDeHoje = hoje.getDay();
        mapaDosDias.forEach((nomeDia, index) => {
            const diaDiv = document.createElement('div');
            diaDiv.className = 'dia';
            diaDiv.id = nomeDia;
            if (index === diaDaSemanaDeHoje) diaDiv.classList.add('hoje');
            
            const numeroDiaEl = document.createElement('span');
            numeroDiaEl.className = 'dia-numero';
            const dataAtual = new Date();
            dataAtual.setDate(hoje.getDate() - diaDaSemanaDeHoje + index);
            numeroDiaEl.textContent = dataAtual.getDate();
            diaDiv.appendChild(numeroDiaEl);

            const conteudoDiv = document.createElement('div');
            conteudoDiv.className = 'conteudo-dia';
            const tituloContainer = document.createElement('div');
            tituloContainer.className = 'titulo-dia-container';
            const tituloDia = document.createElement('h2');
            let nomeCapitalizado = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
            tituloDia.textContent = (nomeDia !== 'sabado' && nomeDia !== 'domingo') ? `${nomeCapitalizado}-feira` : nomeCapitalizado;
            tituloContainer.appendChild(tituloDia);
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            const atividadesDoDia = agendaDaSemana[nomeDia] || [];
            
            if (atividadesDoDia.length === 0) {
                const mensagemVazio = document.createElement('p');
                mensagemVazio.className = 'mensagem-dia-vazio';
                mensagemVazio.textContent = modoSelecao ? "Clique para adicionar/copiar atividades." : "Nenhuma atividade.";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    itemLista.className = 'atividade';
                    if (atividade.concluida) itemLista.classList.add('concluida');
                    const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                    itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                    itemLista.addEventListener('click', () => { if (!modoSelecao) toggleConcluida(nomeDia, atividade.id); });
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });
    }

    // --- FLUXO DE EDIÇÃO ---
    function alternarModoSelecao(ativo) {
        modoSelecao = ativo;
        corpoPrincipal.classList.toggle('modo-selecao', ativo);
        botoesControleDiv.style.display = ativo ? 'none' : 'flex';
        botoesEdicaoSelecaoDiv.style.display = ativo ? 'flex' : 'none';
        renderizarAgenda();
    }

    function renderizarEditorDeAtividades(atividades) {
        conteudoModalEdicao.innerHTML = '';
        if (atividades.length > 0) {
            atividades.forEach(atv => conteudoModalEdicao.appendChild(criarLinhaDeAtividadeEditavel(atv)));
        }
        rodapeModalEdicao.style.display = 'flex';
        btnSalvarEdicaoModal.style.display = 'inline-flex';
    }

    function renderizarOpcoesDeCopia(diaId) {
        conteudoModalEdicao.innerHTML = '';
        const containerCopia = document.createElement('div');
        containerCopia.className = 'container-copia';
        containerCopia.innerHTML = '<h3>Este dia está vazio.</h3><p>Copiar atividades de:</p>';
        
        const listaDias = document.createElement('ul');
        listaDias.className = 'lista-dias-copia-modal';
        mapaDosDias.forEach(diaFonte => {
            if (diaFonte !== diaId && agendaTemplate[diaFonte] && agendaTemplate[diaFonte].length > 0) {
                let nomeFonteCapitalizado = diaFonte.charAt(0).toUpperCase() + diaFonte.slice(1);
                const nomeCompleto = (diaFonte !== 'sabado' && diaFonte !== 'domingo') ? `${nomeFonteCapitalizado}-feira` : nomeFonteCapitalizado;
                const item = document.createElement('li');
                item.innerHTML = `<button class="botao-copia" data-dia-fonte="${diaFonte}">${nomeCompleto}</button>`;
                listaDias.appendChild(item);
            }
        });
        containerCopia.appendChild(listaDias);
        conteudoModalEdicao.appendChild(containerCopia);

        rodapeModalEdicao.style.display = 'flex';
        btnSalvarEdicaoModal.style.display = 'none';
    }

    function abrirModalEdicao(diaId) {
        let nomeCapitalizado = diaId.charAt(0).toUpperCase() + diaId.slice(1);
        tituloModalEdicao.textContent = `Editando ${ (diaId !== 'sabado' && diaId !== 'domingo') ? `${nomeCapitalizado}-feira` : nomeCapitalizado}`;
        
        const atividadesDoDia = agendaTemplate[diaId] || [];
        
        if (atividadesDoDia.length === 0) {
            renderizarOpcoesDeCopia(diaId);
        } else {
            renderizarEditorDeAtividades(atividadesDoDia);
        }

        modalEditarDia.classList.add('visivel');
        modalEditarDia.dataset.diaId = diaId;
    }

    function salvarAlteracoesDoModal(diaId) {
        const novasAtividades = [];
        const linhasDeAtividade = conteudoModalEdicao.querySelectorAll('.atividade-editavel-modal');
        
        linhasDeAtividade.forEach(div => {
            const descricao = div.querySelector('.input-descricao').value.trim();
            if (descricao) {
                const id = div.dataset.id;
                const inicio = div.querySelectorAll('.input-horario')[0].value;
                const fim = div.querySelectorAll('.input-horario')[1].value;
                novasAtividades.push({ id: id.startsWith('temp-') ? `${diaId}-${Date.now()}` : id, descricao, inicio, fim });
            }
        });

        if (novasAtividades.length === 0 && linhasDeAtividade.length > 0) {
            mostrarToast('Preencha a descrição da atividade para salvar.', 'info');
            return;
        }

        agendaTemplate[diaId] = novasAtividades;
        localStorage.setItem('agendaTemplate', JSON.stringify(agendaTemplate));
        mostrarToast('Template de agenda salvo com sucesso!');
        fecharModalEdicao();

        if (confirm("Deseja aplicar estas alterações à semana atual?")) {
            atualizarSemanaComTemplate();
            mostrarToast('Semana atualizada com as novas atividades!');
        }
    }

    function atualizarSemanaComTemplate() {
        const templateCompletado = JSON.parse(JSON.stringify(agendaTemplate));
        Object.keys(templateCompletado).forEach(dia => {
            templateCompletado[dia].forEach(atv => {
                atv.concluida = false;
            });
        });
        agendaDaSemana = templateCompletado;
        salvarAgendaDaSemana();
        renderizarAgenda();
    }

    function fecharModalEdicao() {
        modalEditarDia.classList.remove('visivel');
        alternarModoSelecao(false);
    }
    
    function copiarAtividadesParaModal(diaFonte, diaDestino) {
        const atividadesCopiadas = JSON.parse(JSON.stringify(agendaTemplate[diaFonte]));
        atividadesCopiadas.forEach(atv => atv.id = `${diaDestino}-${Date.now()}-${Math.random()}`);
        renderizarEditorDeAtividades(atividadesCopiadas);
    }

    function criarLinhaDeAtividadeEditavel(atividade = {}) {
        const divAtividade = document.createElement('div');
        divAtividade.className = 'atividade-editavel-modal';
        divAtividade.dataset.id = atividade.id || `temp-${Date.now()}`;
        divAtividade.innerHTML = `
            <input type="text" class="input-descricao" value="${atividade.descricao || ''}" placeholder="Nova Atividade">
            <input type="time" class="input-horario" value="${atividade.inicio || ''}">
            <input type="time" class="input-horario" value="${atividade.fim || ''}">
            <button class="btn-remover-modal">X</button>
        `;
        return divAtividade;
    }

    function notificarWidget() {
        if (window.Android && typeof window.Android.onAgendaUpdated === 'function') {
            window.Android.onAgendaUpdated();
        }
    }

    // --- FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO ---
    async function carregarDados(mostrarLoader = true) {
        if(mostrarLoader) loader.classList.add('ativo');

        const savedTheme = localStorage.getItem('agendaTheme') || 'sunset';
        applyTheme(savedTheme);

        const templateJSON = localStorage.getItem('agendaTemplate');
        if (templateJSON) {
            agendaTemplate = JSON.parse(templateJSON);
        } else {
            try {
                const response = await fetch('agenda.json');
                agendaTemplate = await response.json();
                localStorage.setItem('agendaTemplate', JSON.stringify(agendaTemplate));
            } catch (error) {
                console.error("Erro ao carregar agenda.json:", error);
                mostrarToast('Não foi possível carregar o modelo de agenda.', 'info');
                agendaTemplate = {};
            }
        }

        semanaIdAtual = getWeekId(new Date());
        const semanaJSON = localStorage.getItem(`semana_${semanaIdAtual}`);

        if (semanaJSON) {
            agendaDaSemana = JSON.parse(semanaJSON);
        } else {
            mostrarToast('Criando agenda para esta semana...', 'info');
            atualizarSemanaComTemplate();
        }
        
        renderizarAgenda();
        if(mostrarLoader) loader.classList.remove('ativo');
    }

    function inicializar() {
        const hoje = new Date();
        const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        tituloPrincipalEl.textContent = `${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`.toUpperCase();

        document.querySelector('.theme-switcher').addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-btn')) {
                const theme = e.target.dataset.themeSet;
                applyTheme(theme);
                notificarMudanca('theme_change', { theme });
            }
        });
        document.querySelector('.sync-container').style.display = 'none';

        btnEditar.addEventListener('click', () => alternarModoSelecao(true));
        btnCancelarSelecao.addEventListener('click', () => alternarModoSelecao(false));
        containerDias.addEventListener('click', (e) => {
            if (modoSelecao) {
                const diaCard = e.target.closest('.dia');
                if (diaCard) abrirModalEdicao(diaCard.id);
            }
        });

        document.querySelectorAll('.botao-fechar-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal-overlay').classList.remove('visivel');
            });
        });

        btnFecharParabens.addEventListener('click', () => modalParabens.classList.remove('visivel'));

        btnSettings.addEventListener('click', () => modalSettings.classList.add('visivel'));
        btnSalvarEdicaoModal.addEventListener('click', () => salvarAlteracoesDoModal(modalEditarDia.dataset.diaId));
        btnCancelarEdicaoModal.addEventListener('click', fecharModalEdicao);
        
        btnAddAtividadeModal.addEventListener('click', () => {
            if (conteudoModalEdicao.querySelector('.container-copia')) {
                renderizarEditorDeAtividades([]);
            }
            conteudoModalEdicao.appendChild(criarLinhaDeAtividadeEditavel());
        });
        
        conteudoModalEdicao.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remover-modal')) {
                e.target.closest('.atividade-editavel-modal').remove();
                if (conteudoModalEdicao.querySelectorAll('.atividade-editavel-modal').length === 0) {
                    renderizarOpcoesDeCopia(modalEditarDia.dataset.diaId);
                }
            }
            if (e.target.classList.contains('botao-copia')) {
                copiarAtividadesParaModal(e.target.dataset.diaFonte, modalEditarDia.dataset.diaId);
            }
        });

        carregarDados();
    }

    inicializar();
});