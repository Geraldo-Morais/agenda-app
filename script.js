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
    const syncThemeCheckbox = document.getElementById('sync-theme-checkbox');
    
    // Modal de Edição de Dia
    const modalEditarDia = document.getElementById('modal-editar-dia');
    const tituloModalEdicao = document.getElementById('titulo-modal-edicao');
    const conteudoModalEdicao = document.getElementById('conteudo-modal-edicao');
    const rodapeModalEdicao = document.getElementById('rodape-modal-edicao');
    const btnSalvarEdicaoModal = document.getElementById('btn-salvar-edicao-modal');
    const btnCancelarEdicaoModal = document.getElementById('btn-cancelar-edicao-modal');
    const btnAddAtividadeModal = document.getElementById('btn-add-atividade-modal');

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
    function getChaveDeHoje() { const hoje = new Date(); const ano = hoje.getFullYear(); const mes = String(hoje.getMonth() + 1).padStart(2, '0'); const dia = String(hoje.getDate()).padStart(2, '0'); return `${ano}-${mes}-${dia}`; }
    async function salvarConcluidas() { const concluidasIds = Array.from(document.querySelectorAll('.atividade.concluida')).map(el => el.dataset.id); try { await db.collection('concluidas').doc(getChaveDeHoje()).set({ ids: concluidasIds }); } catch (error) { console.error("Erro ao salvar tarefas concluídas: ", error); } }
    function aplicarConcluidas(ids = []) { document.querySelectorAll('.atividade').forEach(el => { el.classList.toggle('concluida', ids.includes(el.dataset.id)); }); }
    
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
            const atividadesDoDia = agenda[nomeDia] || [];
            
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
                    const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                    itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                    itemLista.addEventListener('click', () => { if (!modoSelecao) { itemLista.classList.toggle('concluida'); salvarConcluidas(); }});
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
        if(atividades.length > 0) {
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
            if (diaFonte !== diaId && agenda[diaFonte] && agenda[diaFonte].length > 0) {
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
        
        const atividadesDoDia = agenda[diaId] || [];
        
        if (atividadesDoDia.length === 0) {
            renderizarOpcoesDeCopia(diaId);
        } else {
            renderizarEditorDeAtividades(atividadesDoDia);
        }

        modalEditarDia.classList.add('visivel');
        modalEditarDia.dataset.diaId = diaId;
    }

    function salvarAlteracoesDoModal(diaId) {
        loader.classList.add('ativo');
        const novasAtividades = [];
        conteudoModalEdicao.querySelectorAll('.atividade-editavel-modal').forEach(div => {
            const id = div.dataset.id;
            const descricao = div.querySelector('.input-descricao').value;
            const inicio = div.querySelectorAll('.input-horario')[0].value;
            const fim = div.querySelectorAll('.input-horario')[1].value;
            if (descricao) { 
                novasAtividades.push({ id: id.startsWith('temp-') ? `${diaId}-${Date.now()}` : id, descricao, inicio, fim });
            }
        });
        
        const novaAgenda = { ...agenda, [diaId]: novasAtividades };

        agendaDocRef.set(novaAgenda)
            .then(() => {
                mostrarToast('Alterações salvas com sucesso!');
                agenda = novaAgenda;
                fecharModalEdicao();
            })
            .catch(err => mostrarToast('Erro ao salvar.', 'info'))
            .finally(() => loader.classList.remove('ativo'));
    }

    function fecharModalEdicao() {
        modalEditarDia.classList.remove('visivel');
        alternarModoSelecao(false);
    }
    
    function copiarAtividadesParaModal(diaFonte, diaDestino) {
        const atividadesCopiadas = JSON.parse(JSON.stringify(agenda[diaFonte]));
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

    // --- FUNÇÃO DE INICIALIZAÇÃO ---
    function inicializar() {
        loader.classList.add('ativo');

        const hoje = new Date();
        const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        tituloPrincipalEl.textContent = `${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`.toUpperCase();

        const themeSwitcher = document.querySelector('.theme-switcher');
        const isSyncEnabled = localStorage.getItem('themeSync') === 'true';
        syncThemeCheckbox.checked = isSyncEnabled;
        if (isSyncEnabled) {
            gerenciarListenerDeTema(true);
        } else {
            applyTheme(localStorage.getItem('agendaTheme') || 'sunset');
        }
        
        themeSwitcher.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-btn')) {
                const themeName = e.target.dataset.themeSet;
                applyTheme(themeName); 
                localStorage.setItem('agendaTheme', themeName);
                if (syncThemeCheckbox.checked) {
                    saveThemeToCloud(themeName);
                }
            }
        });
        syncThemeCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('themeSync', enabled);
            gerenciarListenerDeTema(enabled);
            mostrarToast(enabled ? 'Sincronização ativada!' : 'Sincronização desativada.', enabled ? 'sucesso' : 'info');
        });
        
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
                const modal = e.target.closest('.modal-overlay');
                if (modal.id === 'modal-editar-dia') {
                    fecharModalEdicao();
                } else {
                    modal.classList.remove('visivel');
                }
            });
        });

        btnSettings.addEventListener('click', () => modalSettings.classList.add('visivel'));
        btnSalvarEdicaoModal.addEventListener('click', () => salvarAlteracoesDoModal(modalEditarDia.dataset.diaId));
        btnCancelarEdicaoModal.addEventListener('click', fecharModalEdicao);
        
        btnAddAtividadeModal.addEventListener('click', () => {
            if(conteudoModalEdicao.querySelector('.container-copia')) {
                renderizarEditorDeAtividades([]);
            }
            conteudoModalEdicao.appendChild(criarLinhaDeAtividadeEditavel());
        });
        
        conteudoModalEdicao.addEventListener('click', (e) => {
            if(e.target.classList.contains('btn-remover-modal')) {
                e.target.closest('.atividade-editavel-modal').remove();
            }
            if(e.target.classList.contains('botao-copia')) {
                copiarAtividadesParaModal(e.target.dataset.diaFonte, modalEditarDia.dataset.diaId);
            }
        });

        agendaDocRef.onSnapshot((doc) => {
            agenda = doc.exists ? doc.data() : {};
            renderizarAgenda();
            loader.classList.remove('ativo');
        });
        
        concluidasListener = db.collection('concluidas').doc(getChaveDeHoje()).onSnapshot((doc) => {
            if (doc.exists) {
                aplicarConcluidas(doc.data().ids);
            } else {
                aplicarConcluidas([]); // Garante que limpe se o doc for deletado
            }
        });
    }

    inicializar();
});
