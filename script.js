document.addEventListener('DOMContentLoaded', () => {
    // Configuração do Firebase
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
    const loader = document.getElementById('loader');
    const agendaContainer = document.querySelector('.agenda-container');
    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const toastEl = document.getElementById('toast');
    
    // Botões de Controle
    const botoesControleDiv = document.getElementById('botoes-controle');
    const botoesEdicaoDiv = document.getElementById('botoes-edicao');
    const btnEditar = document.getElementById('btn-editar');
    const btnSalvar = document.getElementById('btn-salvar');
    const btnCancelar = document.getElementById('btn-cancelar');
    
    // Modal de Configurações
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnFecharSettings = document.getElementById('btn-fechar-settings');
    const syncThemeCheckbox = document.getElementById('sync-theme-checkbox');
    
    // Modal de Cópia
    const modalCopiar = document.getElementById('modal-copiar');
    const listaDiasCopia = document.getElementById('lista-dias-copia');
    const btnCancelarCopia = document.getElementById('btn-cancelar-copia');
    const btnAddAvulso = document.getElementById('btn-add-avulso');

    // Variáveis de estado
    let modoEdicao = false;
    let agenda = {};
    let destaqueInterval;
    let concluidasListener = null;
    let themeListener = null; 

    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const mensagensFofas = [ 'Você conseguiu, Bea! <3', 'Dia concluído com sucesso, Bezinha! ✨', 'Parabéns, Amor! Todas as tarefas foram feitas! 🎉', 'Você é incrível, B! Mais um dia perfeito! ❤️', 'Isso aí, meu bem! Dia finalizado com maestria! 🥂' ];
    
    // --- LÓGICA DE TEMA ---
    function applyTheme(themeName) { document.documentElement.setAttribute('data-theme', themeName); }
    async function saveThemeToCloud(themeName) { try { await themeDocRef.set({ name: themeName }); } catch (error) { console.error("Erro ao salvar tema na nuvem: ", error); mostrarToast('Erro ao sincronizar tema.', 'info'); } }
    function gerenciarListenerDeTema(syncAtivo) {
        if (themeListener) { themeListener(); themeListener = null; }
        if (syncAtivo) {
            themeListener = themeDocRef.onSnapshot((doc) => {
                const cloudTheme = (doc.exists && doc.data().name) ? doc.data().name : 'sunset';
                applyTheme(cloudTheme);
                localStorage.setItem('agendaTheme', cloudTheme);
            }, (error) => { console.error("Erro no listener do tema: ", error); mostrarToast("Erro ao sincronizar tema.", "info"); });
        }
    }

    // --- LÓGICA DA AGENDA ---
    function getChaveDeHoje() { const hoje = new Date(); const ano = hoje.getFullYear(); const mes = String(hoje.getMonth() + 1).padStart(2, '0'); const dia = String(hoje.getDate()).padStart(2, '0'); return `${ano}-${mes}-${dia}`; }
    async function salvarConcluidas() { const concluidasIds = Array.from(document.querySelectorAll('.atividade.concluida')).map(el => el.dataset.id); try { await db.collection('concluidas').doc(getChaveDeHoje()).set({ ids: concluidasIds }); } catch (error) { console.error("Erro ao salvar tarefas concluídas: ", error); } }
    function aplicarConcluidas(ids = []) { document.querySelectorAll('.atividade').forEach(el => { el.classList.toggle('concluida', ids.includes(el.dataset.id)); }); mapaDosDias.forEach(verificarConclusaoDia); }
    function mostrarToast(mensagem, tipo = 'sucesso') { if (!toastEl) return; toastEl.textContent = mensagem; toastEl.className = 'toast'; toastEl.classList.add(tipo); toastEl.classList.add('show'); setTimeout(() => { toastEl.classList.remove('show'); }, 4000); }
    function verificarConclusaoDia(nomeDia) { const diaEl = document.getElementById(nomeDia); if (!diaEl) return; const totalAtividades = (agenda[nomeDia] || []).filter(atv => atv.descricao && atv.descricao !== 'Dia de descanso').length; const atividadesConcluidas = diaEl.querySelectorAll('.atividade.concluida').length; const estavaConcluido = diaEl.classList.contains('dia-concluido'); if (totalAtividades > 0 && totalAtividades === atividadesConcluidas) { diaEl.classList.add('dia-concluido'); if (!estavaConcluido) { const mensagemAleatoria = mensagensFofas[Math.floor(Math.random() * mensagensFofas.length)]; mostrarToast(mensagemAleatoria, 'info'); } } else { diaEl.classList.remove('dia-concluido'); } }
    function destacarAtividadeAtual() { const agora = new Date(); const nomeDiaHoje = mapaDosDias[agora.getDay()]; document.querySelectorAll('.atividade.agora').forEach(el => el.classList.remove('agora')); const atividadesDeHoje = agenda[nomeDiaHoje] || []; const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`; for (const atividade of atividadesDeHoje) { if (atividade.inicio && atividade.fim && horaAtual >= atividade.inicio && horaAtual <= atividade.fim) { const atividadeEl = document.querySelector(`.atividade[data-id="${atividade.id}"]`); if (atividadeEl) atividadeEl.classList.add('agora'); break; } } }
    
    function renderizarAgenda() {
        if (!containerDias) return;
        containerDias.innerHTML = '';
        const hoje = new Date();
        const diaDaSemanaDeHoje = hoje.getDay();
        const primeiroDiaDaSemana = new Date(hoje);
        primeiroDiaDaSemana.setDate(hoje.getDate() - diaDaSemanaDeHoje);

        mapaDosDias.forEach((nomeDia, index) => {
            const diaDiv = document.createElement('div');
            diaDiv.className = 'dia';
            diaDiv.id = nomeDia;
            if (index === diaDaSemanaDeHoje) diaDiv.classList.add('hoje');
            
            const dataAtualDoLoop = new Date(primeiroDiaDaSemana);
            dataAtualDoLoop.setDate(primeiroDiaDaSemana.getDate() + index);
            const numeroDiaEl = document.createElement('span');
            numeroDiaEl.className = 'dia-numero';
            numeroDiaEl.textContent = dataAtualDoLoop.getDate();
            diaDiv.appendChild(numeroDiaEl);

            const conteudoDiv = document.createElement('div');
            conteudoDiv.className = 'conteudo-dia';
            
            const tituloContainer = document.createElement('div');
            tituloContainer.className = 'titulo-dia-container';
            
            const tituloDia = document.createElement('h2');
            tituloDia.textContent = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
            if (nomeDia !== 'sabado' && nomeDia !== 'domingo') tituloDia.textContent += '-feira';
            tituloContainer.appendChild(tituloDia);
            
            if (modoEdicao) {
                const btnAdicionar = document.createElement('button');
                btnAdicionar.className = 'btn-adicionar';
                btnAdicionar.textContent = '+';
                btnAdicionar.addEventListener('click', () => abrirModalCopia(nomeDia));
                tituloContainer.appendChild(btnAdicionar);
            }
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            const atividadesDoDia = agenda[nomeDia] || [];
            if (atividadesDoDia.length === 0 && modoEdicao) {
                const mensagemVazio = document.createElement('p');
                mensagemVazio.className = 'mensagem-dia-vazio';
                mensagemVazio.textContent = "Clique em '+' para adicionar ou copiar atividades.";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    if (modoEdicao) {
                        itemLista.className = 'atividade editavel';
                        itemLista.innerHTML = `<div class="campos-edicao"><input type="text" class="input-descricao" value="${atividade.descricao}"><input type="time" class="input-horario" value="${atividade.inicio || ""}"><input type="time" class="input-horario" value="${atividade.fim || ""}"></div><button class="btn-remover" data-id="${atividade.id}" data-dia="${nomeDia}">X</button>`;
                    } else {
                        itemLista.className = 'atividade';
                        const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                        itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                        itemLista.addEventListener('click', () => { itemLista.classList.toggle('concluida'); salvarConcluidas(); });
                    }
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });
        if (modoEdicao) { document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', removerAtividade)); }
    }
    
    // --- LÓGICA DE MODAIS E EDIÇÃO ---
    function abrirModalCopia(diaDestino) { if (!modalCopiar) return; listaDiasCopia.innerHTML = ''; modalCopiar.dataset.diaDestino = diaDestino; mapaDosDias.forEach(nomeDiaFonte => { if (nomeDiaFonte !== diaDestino && agenda[nomeDiaFonte] && agenda[nomeDiaFonte].length > 0 && agenda[nomeDiaFonte].some(atv => atv.descricao !== 'Dia de descanso')) { const itemLista = document.createElement('li'); const botaoDia = document.createElement('button'); botaoDia.className = 'btn-copiar-dia'; botaoDia.dataset.diaFonte = nomeDiaFonte; let nomeCapitalizado = nomeDiaFonte.charAt(0).toUpperCase() + nomeDiaFonte.slice(1); botaoDia.textContent = (nomeDiaFonte !== 'sabado' && nomeDiaFonte !== 'domingo') ? `${nomeCapitalizado}-feira` : nomeCapitalizado; itemLista.appendChild(botaoDia); listaDiasCopia.appendChild(itemLista); } }); modalCopiar.classList.add('visivel'); }
    function fecharModalCopia() { if(modalCopiar) modalCopiar.classList.remove('visivel'); }
    function copiarAtividades(evento) { if (!evento.target.classList.contains('btn-copiar-dia')) return; const diaFonte = evento.target.dataset.diaFonte; const diaDestino = modalCopiar.dataset.diaDestino; const atividadesCopiadas = JSON.parse(JSON.stringify(agenda[diaFonte])); atividadesCopiadas.forEach((atividade, index) => { atividade.id = `${diaDestino}-${Date.now()}-${index}`; }); agenda[diaDestino] = atividadesCopiadas; fecharModalCopia(); renderizarAgenda(); }
    function adicionarAtividadeSimples(nomeDia) { const novaAtividade = { id: `${nomeDia}-${Date.now()}`, descricao: 'Nova Atividade', inicio: '', fim: '' }; if (!agenda[nomeDia]) agenda[nomeDia] = []; if (agenda[nomeDia].length === 1 && agenda[nomeDia][0].descricao === 'Dia de descanso') { agenda[nomeDia] = []; } agenda[nomeDia].push(novaAtividade); renderizarAgenda(); }
    function removerAtividade(evento) { const idParaRemover = evento.target.dataset.id; const nomeDia = evento.target.dataset.dia; agenda[nomeDia] = agenda[nomeDia].filter(atividade => atividade.id !== idParaRemover); renderizarAgenda(); }
    
    async function salvarAlteracoes() {
        loader.classList.add('ativo');
        const todosDias = document.querySelectorAll('.dia');
        todosDias.forEach(diaEl => { 
            const nomeDia = diaEl.id; 
            const novasAtividades = []; 
            const atividadesEditaveis = diaEl.querySelectorAll('.atividade.editavel');
            atividadesEditaveis.forEach(itemLista => { 
                const descricao = itemLista.querySelector('.input-descricao')?.value || ''; 
                const inicio = itemLista.querySelectorAll('.input-horario')[0]?.value || ''; 
                const fim = itemLista.querySelectorAll('.input-horario')[1]?.value || ''; 
                const idOriginal = itemLista.dataset.id; 
                if (descricao) { novasAtividades.push({ id: idOriginal, descricao, inicio, fim }); } 
            }); 
            agenda[nomeDia] = novasAtividades; 
        }); 
        try { await agendaDocRef.set(agenda); mostrarToast('Agenda salva com sucesso na nuvem!'); } 
        catch (error) { console.error("Erro ao salvar agenda: ", error); mostrarToast('Erro ao salvar. Verifique sua conexão.', 'info'); } 
        finally { loader.classList.remove('ativo'); }
    }

    function alternarModoEdicao(ativo) {
        modoEdicao = ativo;
        botoesControleDiv.style.display = ativo ? 'none' : 'flex';
        botoesEdicaoDiv.style.display = ativo ? 'flex' : 'none';
        if (ativo) {
            if (destaqueInterval) clearInterval(destaqueInterval);
        } else {
            destaqueInterval = setInterval(destacarAtividadeAtual, 60000);
        }
        renderizarAgenda();
    }
    
    // --- LISTENERS DE EVENTOS ---
    btnEditar.addEventListener('click', () => alternarModoEdicao(true));
    btnCancelar.addEventListener('click', () => alternarModoEdicao(false));
    btnSalvar.addEventListener('click', () => { salvarAlteracoes().then(() => alternarModoEdicao(false)); });
    
    btnSettings.addEventListener('click', () => modalSettings.classList.add('visivel'));
    btnFecharSettings.addEventListener('click', () => modalSettings.classList.remove('visivel'));

    btnCancelarCopia.addEventListener('click', fecharModalCopia);
    listaDiasCopia.addEventListener('click', copiarAtividades);
    btnAddAvulso.addEventListener('click', () => { const diaDestino = modalCopiar.dataset.diaDestino; if (diaDestino) { adicionarAtividadeSimples(diaDestino); fecharModalCopia(); } });
    
    // --- FUNÇÃO DE INICIALIZAÇÃO ---
    function inicializar() {
        // Define o título
        const hoje = new Date();
        const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        tituloPrincipalEl.textContent = `${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`.toUpperCase();

        // Gerencia o tema
        const themeSwitcher = document.querySelector('.theme-switcher');
        const isSyncEnabled = localStorage.getItem('themeSync') === 'true';
        if (syncThemeCheckbox) syncThemeCheckbox.checked = isSyncEnabled;
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
                if (syncThemeCheckbox && syncThemeCheckbox.checked) { saveThemeToCloud(themeName); }
            }
        });
        syncThemeCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            localStorage.setItem('themeSync', enabled);
            gerenciarListenerDeTema(enabled);
            mostrarToast(enabled ? 'Sincronização de tema ativada!' : 'Sincronização de tema desativada.', enabled ? 'sucesso' : 'info');
        });

        // Carrega a agenda e as tarefas concluídas
        agendaDocRef.onSnapshot((doc) => {
            if (doc.exists) { agenda = doc.data(); }
            renderizarAgenda();
            destacarAtividadeAtual();
            loader.classList.remove('ativo');
        }, (error) => {
            console.error("Erro ao ouvir a agenda principal: ", error);
            mostrarToast("Erro de conexão.", "info");
            renderizarAgenda();
            loader.style.display = 'none';
        });

        concluidasListener = db.collection('concluidas').doc(getChaveDeHoje()).onSnapshot((concluidasDoc) => {
            const ids = concluidasDoc.exists && concluidasDoc.data().ids ? concluidasDoc.data().ids : [];
            aplicarConcluidas(ids);
        });

        destaqueInterval = setInterval(destacarAtividadeAtual, 60000);
    }

    inicializar();
});
