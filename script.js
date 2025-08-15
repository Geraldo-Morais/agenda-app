document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO E REFERÊNCIAS ---
    const firebaseConfig = {
        apiKey: "AIzaSyAYhpZykVwZ-_KVkgx5iGBAITKtcuZMfUQ",
        authDomain: "agenda-da-bea.firebaseapp.com",
        projectId: "agenda-da-bea",
        storageBucket: "agenda-da-bea.appspot.com",
        messagingSenderId: "509913679664",
        appId: "1:509913679664:web:9e251227071260b55e2af5"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const agendaDocRef = db.collection('agendas').doc('minhaAgenda');
    const themeDocRef = db.collection('configuracoes').doc('tema');

    // Elementos do DOM
    const corpoPrincipal = document.querySelector('.corpo-principal');
    const loader = document.getElementById('loader');
    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const toastEl = document.getElementById('toast');
    
    // Botões de Controle (Cabeçalho)
    const botoesControleDiv = document.getElementById('botoes-controle');
    const botoesEdicaoSelecaoDiv = document.getElementById('botoes-edicao-selecao');
    const btnEditar = document.getElementById('btn-editar');
    const btnCancelarSelecao = document.getElementById('btn-cancelar-selecao');
    
    // Modal de Configurações
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    
    // Modal de Edição de Dia
    const modalEditarDia = document.getElementById('modal-editar-dia');
    const tituloModalEdicao = document.getElementById('titulo-modal-edicao');
    const conteudoModalEdicao = document.getElementById('conteudo-modal-edicao');
    const btnSalvarEdicaoModal = document.getElementById('btn-salvar-edicao-modal');
    const btnCancelarEdicaoModal = document.getElementById('btn-cancelar-edicao-modal');
    const btnAddAtividadeModal = document.getElementById('btn-add-atividade-modal');
    
    // Outros Modals
    const modalCopiar = document.getElementById('modal-copiar');
    const listaDiasCopia = document.getElementById('lista-dias-copia');
    const btnAddAvulso = document.getElementById('btn-add-avulso');

    // Variáveis de estado
    let modoSelecao = false;
    let agenda = {};
    let destaqueInterval;
    let concluidasListener = null;
    let themeListener = null; 

    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    
    // --- LÓGICA DE TEMA ---
    function applyTheme(themeName) { document.documentElement.setAttribute('data-theme', themeName); }
    async function saveThemeToCloud(themeName) { try { await themeDocRef.set({ name: themeName }); } catch (error) { mostrarToast('Erro ao sincronizar tema.', 'info'); } }
    function gerenciarListenerDeTema(syncAtivo) {
        if (themeListener) { themeListener(); themeListener = null; }
        if (syncAtivo) {
            themeListener = themeDocRef.onSnapshot((doc) => {
                const cloudTheme = (doc.exists && doc.data().name) ? doc.data().name : 'sunset';
                applyTheme(cloudTheme);
                localStorage.setItem('agendaTheme', cloudTheme);
            });
        }
    }

    // --- LÓGICA DA AGENDA (VISUALIZAÇÃO) ---
    function mostrarToast(mensagem, tipo = 'sucesso') { if (!toastEl) return; toastEl.textContent = mensagem; toastEl.className = 'toast'; toastEl.classList.add(tipo); toastEl.classList.add('show'); setTimeout(() => { toastEl.classList.remove('show'); }, 4000); }
    function destacarAtividadeAtual() { /* ... (código existente sem alterações) ... */ }
    
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
            tituloDia.textContent = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
            if (nomeDia !== 'sabado' && nomeDia !== 'domingo') tituloDia.textContent += '-feira';
            tituloContainer.appendChild(tituloDia);
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            (agenda[nomeDia] || []).forEach(atividade => {
                const itemLista = document.createElement('li');
                itemLista.dataset.id = atividade.id;
                itemLista.className = 'atividade';
                const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                itemLista.addEventListener('click', () => { if (!modoSelecao) { itemLista.classList.toggle('concluida'); salvarConcluidas(); }});
                listaAtividades.appendChild(itemLista);
            });
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });
        aplicarConcluidasDoDiaAtual();
    }

    // --- NOVO FLUXO DE EDIÇÃO ---
    function alternarModoSelecao(ativo) {
        modoSelecao = ativo;
        corpoPrincipal.classList.toggle('modo-selecao', ativo);
        botoesControleDiv.style.display = ativo ? 'none' : 'flex';
        botoesEdicaoSelecaoDiv.style.display = ativo ? 'flex' : 'none';
    }

    function abrirModalEdicao(diaId) {
        const nomeCapitalizado = diaId.charAt(0).toUpperCase() + diaId.slice(1);
        tituloModalEdicao.textContent = `Editando ${nomeCapitalizado.replace('a', 'a-feira')}`;
        
        conteudoModalEdicao.innerHTML = ''; // Limpa conteúdo anterior
        const atividadesDoDia = agenda[diaId] || [];

        atividadesDoDia.forEach(atv => {
            const divAtividade = document.createElement('div');
            divAtividade.className = 'atividade-editavel-modal';
            divAtividade.dataset.id = atv.id;
            divAtividade.innerHTML = `
                <input type="text" class="input-descricao" value="${atv.descricao}">
                <input type="time" class="input-horario" value="${atv.inicio || ''}">
                <input type="time" class="input-horario" value="${atv.fim || ''}">
                <button class="btn-remover-modal">X</button>
            `;
            conteudoModalEdicao.appendChild(divAtividade);
        });

        modalEditarDia.classList.add('visivel');
        
        // Atribui o dia atual ao botão salvar para uso posterior
        btnSalvarEdicaoModal.dataset.diaId = diaId;
    }

    function salvarAlteracoesDoModal(diaId) {
        loader.classList.add('ativo');
        const novasAtividades = [];
        conteudoModalEdicao.querySelectorAll('.atividade-editavel-modal').forEach(div => {
            const id = div.dataset.id;
            const descricao = div.querySelector('.input-descricao').value;
            const inicio = div.querySelectorAll('.input-horario')[0].value;
            const fim = div.querySelectorAll('.input-horario')[1].value;
            if (descricao) { // Só salva se tiver descrição
                novasAtividades.push({ id, descricao, inicio, fim });
            }
        });
        
        const novaAgenda = { ...agenda, [diaId]: novasAtividades };

        agendaDocRef.set(novaAgenda)
            .then(() => {
                mostrarToast('Alterações salvas com sucesso!');
                agenda = novaAgenda; // Atualiza o estado local
                fecharModalEdicao();
            })
            .catch(err => mostrarToast('Erro ao salvar.', 'info'))
            .finally(() => loader.classList.remove('ativo'));
    }

    function fecharModalEdicao() {
        modalEditarDia.classList.remove('visivel');
        alternarModoSelecao(false); // Sempre sai do modo de seleção ao fechar
    }

    function adicionarAtividadeVaziaNoModal() {
        const divAtividade = document.createElement('div');
        divAtividade.className = 'atividade-editavel-modal';
        divAtividade.dataset.id = `temp-${Date.now()}`; // ID temporário
        divAtividade.innerHTML = `
            <input type="text" class="input-descricao" placeholder="Nova Atividade">
            <input type="time" class="input-horario">
            <input type="time" class="input-horario">
            <button class="btn-remover-modal">X</button>
        `;
        conteudoModalEdicao.appendChild(divAtividade);
    }
    
    // --- FUNÇÕES AUXILIARES E INICIALIZAÇÃO ---
    async function salvarConcluidas() { /* ... (código existente) ... */ }
    function aplicarConcluidasDoDiaAtual() { /* ... (código existente, se houver) ... */ }

    function inicializar() {
        loader.classList.add('ativo');

        // Título
        const hoje = new Date();
        const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        tituloPrincipalEl.textContent = `${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`.toUpperCase();

        // Listeners de Tema
        const themeSwitcher = document.querySelector('.theme-switcher');
        const syncCheckbox = document.getElementById('sync-theme-checkbox');
        const isSyncEnabled = localStorage.getItem('themeSync') === 'true';
        syncCheckbox.checked = isSyncEnabled;
        if (isSyncEnabled) gerenciarListenerDeTema(true);
        else applyTheme(localStorage.getItem('agendaTheme') || 'sunset');
        
        themeSwitcher.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-btn')) {
                const themeName = e.target.dataset.themeSet;
                applyTheme(themeName); 
                localStorage.setItem('agendaTheme', themeName);
                if (syncCheckbox.checked) saveThemeToCloud(themeName);
            }
        });
        syncCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('themeSync', enabled);
            gerenciarListenerDeTema(enabled);
            mostrarToast(enabled ? 'Sincronização ativada!' : 'Sincronização desativada.', enabled ? 'sucesso' : 'info');
        });
        
        // Listeners Principais
        btnEditar.addEventListener('click', () => alternarModoSelecao(true));
        btnCancelarSelecao.addEventListener('click', () => alternarModoSelecao(false));
        containerDias.addEventListener('click', (e) => {
            if (modoSelecao) {
                const diaCard = e.target.closest('.dia');
                if (diaCard) abrirModalEdicao(diaCard.id);
            }
        });

        // Listeners dos Modais
        document.querySelectorAll('.botao-fechar-modal').forEach(btn => {
            btn.addEventListener('click', (e) => e.target.closest('.modal-overlay').classList.remove('visivel'));
        });
        btnSettings.addEventListener('click', () => modalSettings.classList.add('visivel'));
        btnSalvarEdicaoModal.addEventListener('click', () => salvarAlteracoesDoModal(btnSalvarEdicaoModal.dataset.diaId));
        btnCancelarEdicaoModal.addEventListener('click', fecharModalEdicao);
        btnAddAtividadeModal.addEventListener('click', adicionarAtividadeVaziaNoModal);
        conteudoModalEdicao.addEventListener('click', (e) => {
            if(e.target.classList.contains('btn-remover-modal')) e.target.closest('.atividade-editavel-modal').remove();
        });

        // Carregamento de Dados
        agendaDocRef.onSnapshot((doc) => {
            agenda = doc.exists ? doc.data() : {};
            renderizarAgenda();
            destacarAtividadeAtual();
            loader.classList.remove('ativo');
        }, (error) => {
            loader.style.display = 'none';
            mostrarToast("Erro de conexão.", "info");
        });

        destaqueInterval = setInterval(destacarAtividadeAtual, 60000);
    }

    inicializar();
});
