document.addEventListener('DOMContentLoaded', () => {
    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const btnEditar = document.getElementById('btn-editar');
    const btnResetar = document.getElementById('btn-resetar');
    const btnExportar = document.getElementById('btn-exportar');
    const toastEl = document.getElementById('toast');
    const modalCopiar = document.getElementById('modal-copiar');
    const listaDiasCopia = document.getElementById('lista-dias-copia');
    const btnCancelarCopia = document.getElementById('btn-cancelar-copia');
    const btnAddAvulso = document.getElementById('btn-add-avulso');

    let modoEdicao = false;
    const isVistaDiaria = document.body.classList.contains('vista-diaria');
    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    
    const mensagensFofas = [ 'Você conseguiu, Bea! <3', 'Dia concluído com sucesso, Bezinha! ✨', 'Parabéns, Amor! Todas as tarefas foram feitas! 🎉', 'Você é incrível, B! Mais um dia perfeito! ❤️', 'Isso aí, meu bem! Dia finalizado com maestria! 🥂' ];

    const agendaPadrao = {
        domingo: [{ id: 'dom-descanso', descricao: 'Dia de descanso', inicio: '', fim: '' }],
        segunda: [ { id: 'seg-estagio', descricao: 'Estágio', inicio: '07:00', fim: '12:30' }, { id: 'seg-frontend', descricao: 'Aula Front-End', inicio: '13:00', fim: '15:00' }, { id: 'seg-revisao', descricao: 'Revisão Front', inicio: '16:30', fim: '18:00' }, { id: 'seg-contratos', descricao: 'Teoria Geral dos Contratos', inicio: '19:00', fim: '22:00' }, ],
        terca: [ { id: 'ter-exercicios', descricao: 'Exercícios', inicio: '06:30', fim: '07:30' }, { id: 'ter-estagio', descricao: 'Estágio', inicio: '09:00', fim: '15:30' }, { id: 'ter-revisao', descricao: 'Revisão', inicio: '16:30', fim: '18:00' }, { id: 'ter-democratica', descricao: 'Instruções Democráticas', inicio: '18:30', fim: '20:10' }, { id: 'ter-atividades', descricao: 'Atividades práticas', inicio: '', fim: '' }, ],
        quarta: [ { id: 'qua-exercicios', descricao: 'Exercícios', inicio: '06:30', fim: '07:30' }, { id: 'qua-estagio', descricao: 'Estágio', inicio: '09:00', fim: '15:30' }, { id: 'qua-revisao', descricao: 'Revisão', inicio: '16:30', fim: '18:00' }, { id: 'qua-tutelas', descricao: 'Tutelas Provisórias', inicio: '18:30', fim: '20:10' }, { id: 'qua-civil', descricao: 'Responsabilidade Civil', inicio: '20:20', fim: '22:00' }, ],
        quinta: [ { id: 'qui-estagio', descricao: 'Estágio', inicio: '07:00', fim: '12:30' }, { id: 'qui-frontend', descricao: 'Aula Front-End', inicio: '13:00', fim: '15:00' }, { id: 'qui-revisao', descricao: 'Revisão', inicio: '16:30', fim: '18:00' }, { id: 'qui-negocios', descricao: 'Direito dos Negócios', inicio: '18:30', fim: '21:00' }, ],
        sexta: [ { id: 'sex-exercicio', descricao: 'Exercício', inicio: '06:30', fim: '07:30' }, { id: 'sex-estagio', descricao: 'Estágio', inicio: '09:00', fim: '15:00' }, { id: 'sex-revisao', descricao: 'Revisão', inicio: '16:30', fim: '18:00' }, { id: 'sex-crimes', descricao: 'Crimes em Espécie', inicio: '18:30', fim: '20:10' }, { id: 'sex-teclado', descricao: 'Teclado', inicio: '21:30', fim: '22:30' }, ],
        sabado: [ { id: 'sab-piano', descricao: 'Aulas Piano', inicio: '10:00', fim: '11:00' }, { id: 'sab-org', descricao: 'Organização pessoal', inicio: '13:00', fim: '16:00' }, ],
    };
    let agenda = JSON.parse(localStorage.getItem('minhaAgenda')) || agendaPadrao;
    let destaqueInterval;

    function mostrarToast(mensagem, tipo = 'sucesso') {
        if (!toastEl) return;
        toastEl.textContent = mensagem;
        toastEl.className = 'toast';
        toastEl.classList.add(tipo);
        toastEl.classList.add('show');
        setTimeout(() => { toastEl.classList.remove('show'); }, 4000);
    }

    function verificarConclusaoDia(nomeDia) {
        const diaEl = document.getElementById(nomeDia);
        if (!diaEl) return;
        const totalAtividades = (agenda[nomeDia] || []).filter(atv => atv.descricao && atv.descricao !== 'Dia de descanso').length;
        const atividadesConcluidas = diaEl.querySelectorAll('.atividade.concluida').length;
        const estavaConcluido = diaEl.classList.contains('dia-concluido');
        if (totalAtividades > 0 && totalAtividades === atividadesConcluidas) {
            diaEl.classList.add('dia-concluido');
            if (!estavaConcluido) {
                const mensagemAleatoria = mensagensFofas[Math.floor(Math.random() * mensagensFofas.length)];
                mostrarToast(mensagemAleatoria, 'info');
            }
        } else {
            diaEl.classList.remove('dia-concluido');
        }
    }

    function destacarAtividadeAtual() {
        const agora = new Date();
        const diaDaSemanaDeHoje = agora.getDay();
        const nomeDiaHoje = mapaDosDias[diaDaSemanaDeHoje];
        document.querySelectorAll('.atividade.agora').forEach(el => el.classList.remove('agora'));
        const atividadesDeHoje = agenda[nomeDiaHoje] || [];
        const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
        for (const atividade of atividadesDeHoje) {
            if (atividade.inicio && atividade.fim && horaAtual >= atividade.inicio && horaAtual <= atividade.fim) {
                const atividadeEl = document.querySelector(`.atividade[data-id="${atividade.id}"]`);
                if (atividadeEl) atividadeEl.classList.add('agora');
                break;
            }
        }
    }

    function salvarAgenda() { localStorage.setItem('minhaAgenda', JSON.stringify(agenda)); }
    function getChaveDeHoje() { const hoje = new Date(); const mes = String(hoje.getMonth() + 1).padStart(2, '0'); const dia = String(hoje.getDate()).padStart(2, '0'); return `concluidas-${hoje.getFullYear()}-${mes}-${dia}`; }
    function salvarConcluidas() { const chaveDeHoje = getChaveDeHoje(); const concluidasIds = Array.from(document.querySelectorAll('.atividade.concluida')).map(el => el.dataset.id); localStorage.setItem(chaveDeHoje, JSON.stringify(concluidasIds)); }
    function carregarConcluidas() { const chaveDeHoje = getChaveDeHoje(); const concluidasIds = JSON.parse(localStorage.getItem(chaveDeHoje)) || []; concluidasIds.forEach(id => { const atividadeEl = document.querySelector(`.atividade[data-id="${id}"]`); if (atividadeEl) atividadeEl.classList.add('concluida'); }); mapaDosDias.forEach(verificarConclusaoDia); }

    function renderizarAgenda() {
        if (!containerDias) return;
        containerDias.innerHTML = '';
        const hoje = new Date();
        const diaDaSemanaDeHoje = hoje.getDay();
        const primeiroDiaDaSemana = new Date(hoje);
        primeiroDiaDaSemana.setDate(hoje.getDate() - diaDaSemanaDeHoje);

        mapaDosDias.forEach((nomeDia, index) => {
            if (isVistaDiaria && index !== diaDaSemanaDeHoje) return;

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
                btnAdicionar.dataset.dia = nomeDia;
                btnAdicionar.addEventListener('click', (e) => {
                    const dia = e.target.dataset.dia;
                    const atividadesDoDia = agenda[dia] || [];
                    if (atividadesDoDia.length > 0 && !(atividadesDoDia.length === 1 && atividadesDoDia[0].descricao === 'Dia de descanso')) {
                        adicionarAtividadeSimples(dia);
                    } else {
                        abrirModalCopia(dia);
                    }
                });
                tituloContainer.appendChild(btnAdicionar);
            }
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            const atividadesDoDia = agenda[nomeDia] || [];

            if (atividadesDoDia.length === 0) {
                const mensagemVazio = document.createElement('p');
                mensagemVazio.className = 'mensagem-dia-vazio';
                mensagemVazio.textContent = modoEdicao ? "Clique em '+' para adicionar ou copiar atividades." : "Nenhuma atividade para hoje!";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    if (modoEdicao) {
                        itemLista.className = 'atividade editavel';
                        itemLista.innerHTML = `<div class="campos-edicao"><input type="text" class="input-descricao" value="${atividade.descricao}"><input type="time" class="input-horario" value="${atividade.inicio}"><input type="time" class="input-horario" value="${atividade.fim}"></div><button class="btn-remover" data-id="${atividade.id}" data-dia="${nomeDia}">X</button>`;
                    } else {
                        itemLista.className = 'atividade';
                        const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                        itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                        itemLista.addEventListener('click', (e) => {
                            itemLista.classList.toggle('concluida');
                            salvarConcluidas();
                            verificarConclusaoDia(nomeDia);
                        });
                    }
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });

        if (modoEdicao) {
            document.querySelectorAll('.btn-remover').forEach(btn => {
                btn.addEventListener('click', removerAtividade);
            });
        }
        carregarConcluidas();
        if(!modoEdicao) destacarAtividadeAtual();
    }
    
    function abrirModalCopia(diaDestino) {
        if (!modalCopiar || !listaDiasCopia) return;
        listaDiasCopia.innerHTML = '';
        modalCopiar.dataset.diaDestino = diaDestino;
        mapaDosDias.forEach(nomeDiaFonte => {
            if (nomeDiaFonte !== diaDestino && agenda[nomeDiaFonte] && agenda[nomeDiaFonte].length > 0 && agenda[nomeDiaFonte].some(atv => atv.descricao !== 'Dia de descanso')) {
                const itemLista = document.createElement('li');
                const botaoDia = document.createElement('button');
                botaoDia.className = 'btn-copiar-dia';
                botaoDia.dataset.diaFonte = nomeDiaFonte;
                let nomeCapitalizado = nomeDiaFonte.charAt(0).toUpperCase() + nomeDiaFonte.slice(1);
                botaoDia.textContent = (nomeDiaFonte !== 'sabado' && nomeDiaFonte !== 'domingo') ? `${nomeCapitalizado}-feira` : nomeCapitalizado;
                itemLista.appendChild(botaoDia);
                listaDiasCopia.appendChild(itemLista);
            }
        });
        modalCopiar.classList.add('visivel');
    }

    function fecharModalCopia() { if(modalCopiar) modalCopiar.classList.remove('visivel'); }

    function copiarAtividades(evento) {
        if (!evento.target.classList.contains('btn-copiar-dia')) return;
        const diaFonte = evento.target.dataset.diaFonte;
        const diaDestino = modalCopiar.dataset.diaDestino;
        const atividadesCopiadas = JSON.parse(JSON.stringify(agenda[diaFonte]));
        atividadesCopiadas.forEach((atividade, index) => {
            atividade.id = `${diaDestino}-${Date.now()}-${index}`;
        });
        agenda[diaDestino] = atividadesCopiadas;
        fecharModalCopia();
        renderizarAgenda();
    }
    
    function adicionarAtividadeSimples(nomeDia) { const novaAtividade = { id: `${nomeDia}-${Date.now()}`, descricao: 'Nova Atividade', inicio: '', fim: '' }; if (!agenda[nomeDia]) agenda[nomeDia] = []; if (agenda[nomeDia].length === 1 && agenda[nomeDia][0].descricao === 'Dia de descanso') { agenda[nomeDia] = []; } agenda[nomeDia].push(novaAtividade); renderizarAgenda(); }
    function removerAtividade(evento) { const idParaRemover = evento.target.dataset.id; const nomeDia = evento.target.dataset.dia; agenda[nomeDia] = agenda[nomeDia].filter(atividade => atividade.id !== idParaRemover); renderizarAgenda(); }

    function salvarAlteracoes() {
        const todosDias = document.querySelectorAll('.dia');
        todosDias.forEach(diaEl => {
            const nomeDia = diaEl.id;
            const novasAtividades = [];
            const atividadesEditaveis = diaEl.querySelectorAll('.atividade.editavel');
            atividadesEditaveis.forEach(itemLista => {
                const descricaoInput = itemLista.querySelector('.input-descricao');
                const horariosInputs = itemLista.querySelectorAll('.input-horario');
                const descricao = descricaoInput ? descricaoInput.value : '';
                const inicio = horariosInputs[0] ? horariosInputs[0].value : '';
                const fim = horariosInputs[1] ? horariosInputs[1].value : '';
                const idOriginal = itemLista.dataset.id;
                if (descricao) { novasAtividades.push({ id: idOriginal, descricao: descricao, inicio: inicio, fim: fim }); }
            });
            agenda[nomeDia] = novasAtividades;
        });
        salvarAgenda();
        mostrarToast('Agenda salva com sucesso!');
    }

    if (btnEditar) {
        btnEditar.addEventListener('click', () => {
            modoEdicao = !modoEdicao;
            if(btnResetar) btnResetar.style.display = modoEdicao ? 'inline-block' : 'none';
            if(btnExportar) btnExportar.style.display = modoEdicao ? 'none' : 'inline-block';
            if (modoEdicao) {
                btnEditar.textContent = 'Salvar';
                btnEditar.classList.add('salvar');
                if (destaqueInterval) clearInterval(destaqueInterval);
            } else {
                salvarAlteracoes();
                btnEditar.textContent = 'Editar';
                btnEditar.classList.remove('salvar');
                destaqueInterval = setInterval(destacarAtividadeAtual, 60000);
            }
            renderizarAgenda();
        });
    }

    if(btnResetar) {
        btnResetar.addEventListener('click', () => {
            const confirmou = confirm('Tem certeza que deseja apagar TODAS as suas alterações e voltar para a rotina padrão?');
            if (confirmou) {
                localStorage.removeItem('minhaAgenda');
                localStorage.removeItem('agendaTheme');
                Object.keys(localStorage).forEach(key => { if (key.startsWith('concluidas-')) { localStorage.removeItem(key); } });
                location.reload();
            }
        });
    }

    async function exportarWidgetHTML() {
        try {
            const response = await fetch('style.css');
            if (!response.ok) throw new Error('Não foi possível carregar o style.css');
            const cssText = await response.text();
            const diaDeHojeEl = document.querySelector('.dia.hoje');
            if (!diaDeHojeEl) { alert('Card do dia de hoje não encontrado para exportar.'); return; }
            const cardHTML = diaDeHojeEl.outerHTML;
            const temaAtual = document.documentElement.getAttribute('data-theme') || 'default';
            const htmlFinal = `<!DOCTYPE html><html lang="pt-BR" data-theme="${temaAtual}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Widget da Agenda</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>${cssText} body { display: flex; justify-content: center; align-items: center; padding: 0; margin: 0; background-color: transparent; } .dias-semana { display: block; width: 100%; max-width: 400px; } .dia { opacity: 1; animation: none; transform: none; border: none; padding-bottom: 4rem; box-shadow: none; } </style></head><body><div class="dias-semana">${cardHTML}</div></body></html>`;
            const blob = new Blob([htmlFinal], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'widget.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            mostrarToast('Widget exportado como widget.html!');
        } catch (error) {
            console.error('Erro ao exportar widget:', error);
            alert('Ocorreu um erro ao exportar. Verifique se está usando um servidor local (como o Live Server) e tente novamente.');
        }
    }

    if(btnExportar) { btnExportar.addEventListener('click', exportarWidgetHTML); }
    if(btnCancelarCopia) btnCancelarCopia.addEventListener('click', fecharModalCopia);
    if(listaDiasCopia) listaDiasCopia.addEventListener('click', copiarAtividades);
    if(btnAddAvulso) {
        btnAddAvulso.addEventListener('click', () => {
            const diaDestino = modalCopiar.dataset.diaDestino;
            if (diaDestino) {
                adicionarAtividadeSimples(diaDestino);
                fecharModalCopia();
            }
        });
    }
    
    function inicializar() {
        if (tituloPrincipalEl) {
            const hoje = new Date();
            const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            tituloPrincipalEl.textContent = `Agenda - ${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
        }
        
        const savedTheme = localStorage.getItem('agendaTheme') || 'sunset';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeSwitcher = document.querySelector('.theme-switcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', (e) => {
                if (e.target.classList.contains('theme-btn')) {
                    const themeName = e.target.dataset.themeSet;
                    document.documentElement.setAttribute('data-theme', themeName);
                    localStorage.setItem('agendaTheme', themeName);
                }
            });
        }
        
        renderizarAgenda();
        if(!isVistaDiaria) {
            destaqueInterval = setInterval(destacarAtividadeAtual, 60000); 
        } else {
            destacarAtividadeAtual();
        }
    }

    inicializar();
});
