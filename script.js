document.addEventListener('DOMContentLoaded', () => {
    const APP_VERSION = "build 14.08.2025-21:20"; // Indicador de build

    const containerDias = document.getElementById('container-dias');
    const tituloPrincipalEl = document.getElementById('titulo-principal');
    const versionEl = document.getElementById('app-version');
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

    function inicializar() {
        if (tituloPrincipalEl) {
            const hoje = new Date();
            const nomeDosMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            tituloPrincipalEl.textContent = `Agenda - ${nomeDosMeses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
            if (versionEl) {
                versionEl.textContent = `(${APP_VERSION})`;
            }
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
    
    // Todas as outras funções (renderizarAgenda, salvar, etc.) permanecem as mesmas
    // ... (cole aqui o restante do seu script.js da última versão)
});
