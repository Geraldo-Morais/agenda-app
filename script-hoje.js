document.addEventListener('DOMContentLoaded', () => {
    const containerDias = document.getElementById('container-dias');
    const isVistaDiaria = document.body.classList.contains('vista-diaria');
    const mapaDosDias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

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
                mensagemVazio.textContent = "Nenhuma atividade para hoje!";
                listaAtividades.appendChild(mensagemVazio);
            } else {
                atividadesDoDia.forEach(atividade => {
                    const itemLista = document.createElement('li');
                    itemLista.dataset.id = atividade.id;
                    itemLista.className = 'atividade';
                    const horario = atividade.inicio && atividade.fim ? `${atividade.inicio} - ${atividade.fim}` : (atividade.inicio || '');
                    itemLista.innerHTML = `<span class="descricao">${atividade.descricao}</span><span class="horario">${horario}</span>`;
                    itemLista.addEventListener('click', () => {
                        alert("Para editar ou marcar como concluída, use a página principal.");
                    });
                    listaAtividades.appendChild(itemLista);
                });
            }
            conteudoDiv.appendChild(listaAtividades);
            diaDiv.appendChild(conteudoDiv);
            containerDias.appendChild(diaDiv);
        });
    }
    
    function inicializar() {
        const savedTheme = localStorage.getItem('agendaTheme') || 'sunset';
        document.documentElement.setAttribute('data-theme', savedTheme);
        renderizarAgenda();
    }

    inicializar();
});
