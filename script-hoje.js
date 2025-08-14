document.addEventListener('DOMContentLoaded', () => {
    const containerDias = document.getElementById('container-dias');
    const isVistaDiaria = document.body.classList.contains('vista-diaria');
    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const mensagensFofas = [
        'Você conseguiu, Bea! <3',
        'Dia concluído com sucesso, Bezinha! ✨',
        'Parabéns, Amor! Todas as tarefas foram feitas! 🎉',
        'Você é incrível, B! Mais um dia perfeito! ❤️',
        'Isso aí, meu bem! Dia finalizado com maestria! 🥂'
    ];

    let agenda = JSON.parse(localStorage.getItem('minhaAgenda')) || {};

    function getChaveDeHoje() {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        return `concluidas-${hoje.getFullYear()}-${mes}-${dia}`;
    }

    function salvarConcluidas() {
        const chaveDeHoje = getChaveDeHoje();
        const concluidasIds = Array.from(document.querySelectorAll('.atividade.concluida')).map(el => el.dataset.id);
        localStorage.setItem(chaveDeHoje, JSON.stringify(concluidasIds));
    }

    function carregarConcluidas() {
        const chaveDeHoje = getChaveDeHoje();
        const concluidasIds = JSON.parse(localStorage.getItem(chaveDeHoje)) || [];
        concluidasIds.forEach(id => {
            const atividadeEl = document.querySelector(`.atividade[data-id="${id}"]`);
            if (atividadeEl) atividadeEl.classList.add('concluida');
        });
        mapaDosDias.forEach(verificarConclusaoDia);
    }
    
    function mostrarToast(mensagem, tipo = 'sucesso') {
        const toastEl = document.getElementById('toast');
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
            
            conteudoDiv.appendChild(tituloContainer);

            const listaAtividades = document.createElement('ul');
            const atividadesDoDia = agenda[nomeDia] || [];

            if (atividadesDoDia.length === 0) {
                const mensagemVazio = document.createElement('p');
                mensagemVazio.className = 'mensagem-dia-vazio';
                mensagemVazio.textContent = "Nenhuma atividade para hoje! Adicione na página principal.";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    itemLista.className = 'atividade';
                    const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                    itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                    
                    itemLista.addEventListener('click', () => {
                        itemLista.classList.toggle('concluida');
                        salvarConcluidas();
                        verificarConclusaoDia(nomeDia);
                    });
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });

        carregarConcluidas();
    }
    
    function inicializar() {
        const savedTheme = localStorage.getItem('agendaTheme') || 'sunset';
        document.documentElement.setAttribute('data-theme', savedTheme);
        renderizarAgenda();
    }

    inicializar();
});
