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
    const auth = firebase.auth();

    let agendaTemplateRef;
    let semanaDocRef;
    let userUid;

    // --- ELEMENTOS DO DOM ---
    const corpoPrincipal = document.querySelector('.corpo-principal');
    const loader = document.getElementById('loader');
    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const toastEl = document.getElementById('toast');
    
    // Modals e Botões
    const btnEditar = document.getElementById('btn-editar');
    const btnCancelarSelecao = document.getElementById('btn-cancelar-selecao');
    const modalEditarDia = document.getElementById('modal-editar-dia');
    const tituloModalEdicao = document.getElementById('titulo-modal-edicao');
    const conteudoModalEdicao = document.getElementById('conteudo-modal-edicao');
    const btnSalvarEdicaoModal = document.getElementById('btn-salvar-edicao-modal');
    const btnAddAtividadeModal = document.getElementById('btn-add-atividade-modal');

    // --- VARIÁVEIS DE ESTADO ---
    let modoSelecao = false;
    let agendaDaSemana = {};
    let agendaTemplate = {};
    let semanaListener = null;

    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    // --- FUNÇÕES AUXILIARES ---
    const mostrarToast = (mensagem, tipo = 'sucesso') => {
        toastEl.textContent = mensagem;
        toastEl.className = `toast ${tipo} show`;
        setTimeout(() => toastEl.classList.remove('show'), 4000);
    };

    const getWeekId = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
    };

    // --- LÓGICA DA AGENDA COM FIREBASE ---
    const toggleConcluida = async (diaId, atividadeId) => {
        const atividade = agendaDaSemana[diaId].find(atv => atv.id === atividadeId);
        if (atividade) {
            atividade.concluida = !atividade.concluida;
            try {
                await semanaDocRef.update({ [diaId]: agendaDaSemana[diaId] });
            } catch (error) {
                mostrarToast('Erro ao atualizar tarefa.', 'info');
            }
        }
    };

    const renderizarAgenda = () => {
        if (!containerDias) return;
        containerDias.innerHTML = '';
        const hoje = new Date();
        const diaDaSemanaDeHoje = hoje.getDay();
        mapaDosDias.forEach((nomeDia, index) => {
            const diaDiv = document.createElement('div');
            diaDiv.className = 'dia';
            diaDiv.id = nomeDia;
            if (index === diaDaSemanaDeHoje) diaDiv.classList.add('hoje');

            diaDiv.addEventListener('click', () => {
                if (modoSelecao) abrirModalEdicao(nomeDia);
            });

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
            tituloDia.textContent = (nomeDia !== 'sabado' && nomeDia !== 'domingo') ? `${nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1)}-feira` : nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
            tituloContainer.appendChild(tituloDia);
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            const atividadesDoDia = agendaDaSemana[nomeDia] || [];
            
            if (atividadesDoDia.length === 0) {
                const mensagemVazio = document.createElement('p');
                mensagemVazio.className = 'mensagem-dia-vazio';
                mensagemVazio.textContent = modoSelecao ? "Clique para adicionar" : "Nenhuma atividade.";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    itemLista.className = 'atividade';
                    if (atividade.concluida) itemLista.classList.add('concluida');
                    itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${atividade.inicio || ''}</span>`;
                    itemLista.addEventListener('click', (e) => {
                        if (!modoSelecao) {
                            e.stopPropagation();
                            toggleConcluida(nomeDia, atividade.id);
                        }
                    });
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });
    };

    // --- FLUXO DE EDIÇÃO ---
    const alternarModoSelecao = (ativo) => {
        modoSelecao = ativo;
        corpoPrincipal.classList.toggle('modo-selecao', ativo);
        document.getElementById('botoes-controle').style.display = ativo ? 'none' : 'flex';
        document.getElementById('botoes-edicao-selecao').style.display = ativo ? 'flex' : 'none';
        renderizarAgenda();
    };

    const criarLinhaDeAtividadeEditavel = (atividade = {}) => {
        const div = document.createElement('div');
        div.className = 'atividade-editavel-modal';
        div.dataset.id = atividade.id || `temp-${Date.now()}`;
        div.innerHTML = `
            <input type="text" class="input-descricao" value="${atividade.descricao || ''}" placeholder="Nova Atividade">
            <input type="time" class="input-horario" value="${atividade.inicio || ''}">
            <input type="time" class="input-horario" value="${atividade.fim || ''}">
            <button class="btn-remover-modal">X</button>
        `;
        div.querySelector('.btn-remover-modal').onclick = () => div.remove();
        return div;
    };

    const renderizarEditorDeAtividades = (atividades) => {
        conteudoModalEdicao.innerHTML = '';
        atividades.forEach(atv => conteudoModalEdicao.appendChild(criarLinhaDeAtividadeEditavel(atv)));
    };

    const abrirModalEdicao = (diaId) => {
        tituloModalEdicao.textContent = `Editando ${diaId.charAt(0).toUpperCase() + diaId.slice(1)}`;
        const atividadesDoDia = agendaTemplate[diaId] || [];
        renderizarEditorDeAtividades(atividadesDoDia);
        modalEditarDia.classList.add('visivel');
        modalEditarDia.dataset.diaId = diaId;
    };

    const salvarAlteracoesDoModal = async () => {
        const diaId = modalEditarDia.dataset.diaId;
        const novasAtividades = [];
        conteudoModalEdicao.querySelectorAll('.atividade-editavel-modal').forEach(div => {
            const descricao = div.querySelector('.input-descricao').value.trim();
            if (descricao) {
                novasAtividades.push({
                    id: div.dataset.id.startsWith('temp-') ? `${diaId}-${Date.now()}` : div.dataset.id,
                    descricao,
                    inicio: div.querySelectorAll('.input-horario')[0].value,
                    fim: div.querySelectorAll('.input-horario')[1].value,
                });
            }
        });

        loader.classList.add('ativo');
        const novoTemplate = { ...agendaTemplate, [diaId]: novasAtividades };
        try {
            await agendaTemplateRef.set(novoTemplate);
            agendaTemplate = novoTemplate;
            mostrarToast('Template salvo com sucesso!');
            modalEditarDia.classList.remove('visivel');
            if (confirm("Deseja aplicar as alterações à semana atual?")) {
                await atualizarSemanaComTemplate();
            }
        } catch (error) {
            mostrarToast('Erro ao salvar template.', 'info');
        } finally {
            loader.classList.remove('ativo');
        }
    };

    const atualizarSemanaComTemplate = async () => {
        const templateCompletado = JSON.parse(JSON.stringify(agendaTemplate));
        Object.keys(templateCompletado).forEach(dia => {
            templateCompletado[dia].forEach(atv => atv.concluida = false);
        });
        try {
            await semanaDocRef.set(templateCompletado);
            mostrarToast('Semana atualizada!');
        } catch (error) {
            mostrarToast('Erro ao atualizar a semana.', 'info');
        }
    };
    
    // --- INICIALIZAÇÃO ---
    const startApp = async (user) => {
        userUid = user.uid;
        agendaTemplateRef = db.collection('usuarios').doc(userUid).collection('agendas').doc('template');

        const semanaId = getWeekId(new Date());
        semanaDocRef = db.collection('usuarios').doc(userUid).collection('semanas').doc(semanaId);

        loader.classList.add('ativo');

        try {
            const templateDoc = await agendaTemplateRef.get();
            if (templateDoc.exists) {
                agendaTemplate = templateDoc.data();
            } else {
                await agendaTemplateRef.set({}); // Cria um template vazio se não existir
            }

            const semanaDoc = await semanaDocRef.get();
            if (!semanaDoc.exists) {
                await atualizarSemanaComTemplate();
            }

            if (semanaListener) semanaListener();
            semanaListener = semanaDocRef.onSnapshot((doc) => {
                agendaDaSemana = doc.exists ? doc.data() : {};
                renderizarAgenda();
                loader.classList.remove('ativo');
            });
        } catch (error) {
            mostrarToast('Erro ao carregar dados. Verifique suas regras de segurança no Firebase.', 'info');
            loader.classList.remove('ativo');
        }

        // Event Listeners
        btnEditar.onclick = () => alternarModoSelecao(true);
        btnCancelarSelecao.onclick = () => alternarModoSelecao(false);
        btnAddAtividadeModal.onclick = () => conteudoModalEdicao.appendChild(criarLinhaDeAtividadeEditavel());
        btnSalvarEdicaoModal.onclick = salvarAlteracoesDoModal;
        document.querySelectorAll('.botao-fechar-modal').forEach(btn => {
            btn.onclick = (e) => e.target.closest('.modal-overlay').classList.remove('visivel');
        });
    };

    auth.onAuthStateChanged((user) => {
        if (user) {
            startApp(user);
        } else {
            auth.signInAnonymously().catch((error) => {
                mostrarToast('Falha na autenticação. O app pode não funcionar online.', 'info');
            });
        }
    });
});