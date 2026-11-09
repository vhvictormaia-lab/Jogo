COBRINHA DA LIVE — jogo interativo para TikTok LIVE (versão em português)
Baseado no projeto gratuito landsbetween/tiktok-snake-live do GitHub.

COMO FUNCIONA
- A cobrinha joga sozinha num labirinto que muda a cada rodada.
- Presentes jogam frutas no campo (1 diamante = 1 fruta).
- Cada seguidor novo vale +1 fruta e a cobrinha agradece em voz alta.
- A cada 10 curtidas cai 1 fruta. Muitas curtidas seguidas colocam fogo no campo.
- Os presentes GG, Fireworks, Boxing Gloves e Rocket são "bombas": explodem o rabo da cobra.
- No fim da rodada (5 minutos) aparece o ranking: Top Apoiadores e Top Curtidas.

INSTALAR (uma vez só)
1. Extraia esta pasta num lugar fixo, por exemplo Documentos\cobrinha-da-live.
2. Clique duas vezes em INSTALAR.bat.
   Ele instala o Node.js se precisar, baixa as dependências e pergunta seu usuário do TikTok.
   No fim cria o atalho "Cobrinha da Live" na Área de Trabalho.

USAR NA LIVE
1. Comece a live no TikTok primeiro.
2. Abra o atalho "Cobrinha da Live" e deixe a janela preta aberta.
3. No TikTok LIVE Studio: Adicionar fonte > Link > http://localtest.me:3000
   Ligue "Resolução personalizada" 1080x1920 e "Sempre manter ativo", depois preencha a tela.
   (Use localtest.me, porque o LIVE Studio não aceita localhost.)

TESTAR SEM ESTAR AO VIVO
Com o jogo aberto, acesse no navegador: http://localhost:3000/?demo=1
Ou use as teclas: G presente, B bomba, F seguir, L curtir, K chuva de curtidas, E encerrar rodada.
(No navegador, clique uma vez na tela para liberar o som.)

TROCAR O USUÁRIO DO TIKTOK
Apague o arquivo .tiktok-snake-user que fica na sua pasta de usuário (C:\Users\SEU_NOME) e abra o atalho de novo.

AJUSTES (opcional)
Na pasta do jogo, edite o iniciar.bat e coloque antes da linha "node server.js":
  set APPLES_PER_DIAMOND=1      frutas por diamante
  set APPLES_PER_FOLLOW=1       frutas por seguidor
  set BOMB_GIFTS=GG,Rocket      nomes dos presentes que viram bomba
A duração da rodada (ROUND_MS) e a velocidade ficam no começo do public\index.html.

SOBRE A VOZ DE AGRADECIMENTO
O jogo usa a voz em português do Windows. Se o seu PC não tiver voz em português,
ele toca um efeito sonoro no lugar. Para instalar a voz: Configurações > Hora e idioma > Fala.

AVISOS
- Usa a biblioteca não oficial tiktok-live-connector. A live precisa estar no ar para conectar;
  se não estiver, o jogo tenta de novo a cada 20 segundos.
- O ranking zera quando você fecha o jogo.
- Jogos interativos com presentes podem ir contra as regras do TikTok LIVE. Use por sua conta.
