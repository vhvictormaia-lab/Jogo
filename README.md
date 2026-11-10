COBRINHA DA LIVE — jogo interativo para TikTok LIVE (versão em português)
Baseado no projeto gratuito landsbetween/tiktok-snake-live do GitHub.

COMO FUNCIONA
- A cobrinha joga sozinha num labirinto que muda a cada rodada.
- Presentes jogam frutas no campo (1 diamante = 1 fruta).
- Cada seguidor novo vale +1 fruta e a cobrinha agradece em voz alta.
- A cada 10 curtidas cai 1 fruta. Muitas curtidas seguidas colocam fogo no campo.
- Os presentes GG, Fireworks, Boxing Gloves e Rocket são "bombas": explodem o rabo da cobra.
- No fim da rodada (5 minutos) aparece o ranking: Top Apoiadores e Top Curtidas.

PAINEL DE CONTROLE (novo)
Ao abrir o atalho, o painel abre sozinho no navegador: http://localhost:3000/painel.html
- Resumo da live: espectadores, curtidas, presentes, diamantes, seguidores, comentários e tempo.
- Conectar e desconectar da live, trocar o usuário do TikTok.
- Escolher o modo (Cobrinha, Abismo, Quiz ou Baile) e copiar os links para o LIVE Studio.
- Fala manual: você digita e o palhaço, a serpente, a cobrinha ou o narrador falam na hora.
- Eventos de teste (rosa, galáxia, GG, seguir, compartilhar, curtidas, comentário, entrou).
- TOP 6 com botão de zerar, e a lista do que está acontecendo na live.
- Vozes: escolher a voz de cada personagem, ajustar tom e velocidade, e testar.
- Voz de espectador: cada pessoa ganha uma voz própria (sempre a mesma) e o comentário é lido "com a voz dela"
  antes do personagem responder. Dá pra desligar no painel.
- Inteligência artificial: colar ou remover a chave da OpenAI e escolher o modelo.
- Música: ligar/desligar e volume; tempo entre as falas sozinhas.
- Cantorias: enviar um MP3 para cada presente direto pelo painel.
- Palavras proibidas: editar a lista ali mesmo.
- Atualizar sistema: baixa a versão nova do seu GitHub (com token, se o repositório for privado),
  mantém suas configurações, cantorias e palavras, e reinicia o jogo sozinho. Fica bloqueado com a live conectada.
As configurações ficam na pasta "privado" (nunca vai para o GitHub). O painel só funciona no computador da live.

COBRINHA NO ABISMO
O jogo da Cobrinha tem o mapa "Abismo": céu roxo com lua verde, tenda de circo, lanternas, árvores tortas e caveiras.
Nesse mapa a cobra vira a SERPENTE DAS TREVAS e o PALHAÇO DO ABISMO fica na frente do tabuleiro dançando e reagindo aos presentes.
O mapa Abismo entra no sorteio das rodadas. Para deixar SEMPRE no Abismo, use no LIVE Studio a fonte Link:
  http://localtest.me:3000/?tema=abismo

ABISMO LIVE (novo jogo)
Um cenário 3D de desenho com o PALHAÇO DO ABISMO e a SERPENTE DAS TREVAS andando, conversando e reagindo à live.
- Cada presente tem animação e fala: até 4 diamantes acena/ri, de 5 a 29 dança, de 30 a 99 gira e a serpente dá o bote,
  100 ou mais o palhaço VOA com balões e canta uma musiquinha com o nome de quem mandou (com fogos de artifício).
- GG, Fireworks, Boxing Gloves e Rocket explodem o rabo da serpente e o palhaço morre de rir.
- Cumprimentam pelo nome quem entra, leem e respondem comentários (quem foi chamado responde), pedem presente,
  conversam entre si e cantam quando a live está parada.
- Palhaço e serpente têm vozes diferentes. A boca mexe junto com a voz e a foto de quem foi agradecido aparece em cima deles.
- Trupe de palhaços doidos dançando no ritmo da marchinha de circo, que acelera conforme a live esquenta.
- Câmera tipo drone passeando pelo cenário e chegando perto de quem está falando.
- TOP 6 DO ABISMO no alto da tela.
Como usar: abra o atalho "Abismo Live" (ou iniciar-abismo.bat) e no LIVE Studio use a fonte Link:
  http://localtest.me:3000/abismo.html
Testar sem live: http://localhost:3000/abismo.html?demo=1  (teclas: G presente, B bomba, F seguir, S compartilhar, L curtir, C comentário, J entrar)
Trocar vozes (no iniciar-abismo.bat, antes de "node server.js"): set VOZ_PALHACO=..., set TOM_PALHACO=-14Hz, set VOZ_SERPENTE=..., set TOM_SERPENTE=-28Hz

QUIZ DO ABISMO (adivinhe pelo emoji)
Jogo de perguntas: aparecem emojis na tela e a galera escreve a resposta no CHAT. Ex.: 👑🦁 = O Rei Leão.
- Quem acerta primeiro ganha 10 pontos, o segundo 6 e o terceiro 4. Acertou 3 seguidas: pontos em dobro (🔥).
- As letras da resposta vão aparecendo aos poucos como dica. Ninguém acertou? A Serpente dá o bote e fala a resposta.
- PRESENTES (incentivo):
    🌹 Rosa e presentes pequenos = abre uma letra da resposta na hora (dica pra todo mundo)
    🍩 Rosquinha (30 moedas ou mais) = pontos em DOBRO para quem mandou nas próximas 3 respostas certas
    🦁 Presente de 100 moedas ou mais = o palhaço pula na tela (susto!) e a PRÓXIMA PERGUNTA VALE O TRIPLO
    Todo presente também dá pontos no ranking (2 pontos por moeda). Seguir dá 5 pontos.
- O Palhaço do Abismo e a Serpente das Trevas apresentam, na versão sombria: olhos vermelhos, dentes pontudos e língua de cobra.
  Eles falam o nome de quem acerta e de quem manda presente, chamam a galera pra mandar presente e dão boas-vindas.
- Ranking de hoje, da semana e geral, salvo no computador (pasta privado). No painel dá para mostrar a tela de CAMPEÕES.
- 168 perguntas brasileiras: filmes, séries e novelas, músicas, ditados, expressões, comidas, lugares e futebol.
  Para mudar ou criar perguntas, edite public\perguntas-quiz.js (uma por linha; os emojis na mesma ordem das palavras).
Como usar: abra o atalho "Quiz do Abismo" (ou iniciar-quiz.bat) e no LIVE Studio use a fonte Link:
  http://localtest.me:3000/quiz.html
No painel (http://localhost:3000/painel.html), cartão "Quiz do Abismo": tempo por pergunta, categorias, pular pergunta,
mostrar campeões, zerar ranking e botões de teste. Também dá para trocar para o modo 🧠 Quiz no cartão "Jogo".
Teclas para testar na tela do quiz: A alguém acerta, C chute errado, G rosa, D rosquinha, B presentão, F seguir, J entrar.

BAILE DO ABISMO (quem comenta entra na roda)
Igual aos bailes que fazem sucesso no TikTok: cada pessoa que comenta vira um personagem 3D dançando na roda,
com a FOTO e o NOME em cima da cabeça. A câmera passeia sozinha (close com o nome grande, roda de cima, palco).
- O Palhaço do Abismo é o DJ no palco e a Serpente das Trevas fica no altar. Eles anunciam quem entra e quem manda presente.
- Quem fala no chat já estando na roda: aparece um balãozinho com o comentário em cima da cabeça.
- PRESENTES:
    🌹 Rosa (e presentes pequenos) = TROQUE DE ROUPA: cor nova + acessório (cartola, coroa, laço, óculos...)
    🍩 Rosquinha (30 moedas ou mais) = TOQUE NA BANDA: troca a música e todo mundo muda a dança
    🦁 Presente de 100 moedas ou mais = VIRE NOIVOS: quem mandou e a última pessoa que comentou vão para o altar
    Quem mais manda presente no baile vira o REI DO BAILE (coroa). A cada 500 curtidas: festa com confete.
- Cronômetro: cada baile dura 30 minutos (muda no painel). No fim aparece o rei do baile e começa outro (a roda esvazia).
- PERSONAGENS: coloque os seus (feitos na Meshy, com danças da Mixamo) na pasta baile-personagens (veja o LEIA-ME de lá).
  Enquanto ela estiver vazia, dança um robozinho de teste.
- MÚSICAS: coloque MP3 na pasta musicas-baile. Sem MP3, tocam as músicas do jogo (funk, forró, disco e pagode).
Como usar: abra o atalho "Baile do Abismo" (ou iniciar-baile.bat) e no LIVE Studio use a fonte Link:
  http://localtest.me:3000/baile.html
Teclas para testar na tela do baile: C alguém comenta, G rosa, D rosquinha, B noivos, F seguir, S compartilhar, L curtidas.

NOVIDADES (versão 2)
- TOP 6 DA LIVE fixo no alto da tela, com foto, nome e pontos de cada pessoa.
  Pontos: 1 diamante = 100 · seguir = 500 · compartilhar = 200 (1 vez por minuto) · cada curtida = 10 · comentário = 20 (no máximo 1 a cada 10 s).
  O ranking vale pela live inteira (zera quando você fecha o jogo).
- A cobra FALA com voz natural (voz neural da Microsoft, "Francisca"):
  agradece cada presente pelo nome ("Valeu pelas 5 Rosas, Lisa!"), agradece quem segue,
  lê comentários em voz alta e responde (um narrador, voz Antonio, lê o comentário e a cobra responde),
  agradece quem compartilha a live, dá boas-vindas e solta uma frase sozinha a cada 20 a 30 segundos quando ninguém interage.
  Comentários com palavrão, link ou número de telefone não são lidos.
  Em live agitada ela prioriza presentes e seguidores, e não responde a mesma pessoa toda hora.
- MÚSICA de fundo estilo festa de fazenda, criada pelo próprio jogo (sem direitos autorais):
  fica mais rápida e com mais instrumentos quando a live esquenta, muda a cada rodada,
  toca vinhetas em presentes, seguidores e bombas, e abaixa sozinha quando a cobra fala.
- A foto de quem mandou o presente aparece flutuando em cima da fruta dela.

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
Ou use as teclas: G presente, B bomba, F seguir, S compartilhar, L curtir, C comentário, K chuva de curtidas, E encerrar rodada.
(No navegador, clique uma vez na tela para liberar o som.)

TROCAR O USUÁRIO DO TIKTOK
Apague o arquivo .tiktok-snake-user que fica na sua pasta de usuário (C:\Users\SEU_NOME) e abra o atalho de novo.

AJUSTES (opcional)
Na pasta do jogo, edite o iniciar.bat e coloque antes da linha "node server.js":
  set APPLES_PER_DIAMOND=1      frutas por diamante
  set APPLES_PER_FOLLOW=1       frutas por seguidor
  set BOMB_GIFTS=GG,Rocket      nomes dos presentes que viram bomba
A duração da rodada (ROUND_MS) e a velocidade ficam no começo do public\index.html.

NOVIDADES (versão 3)
- Narrador + cobra: o Antonio lê o comentário e a Francisca (a cobra) responde. Parece uma conversa.
- Compartilhar a live dá 200 pontos no TOP 6 e a cobra agradece.
- Cada presente tem a sua vinheta. E você pode pôr MÚSICA PRÓPRIA por presente: veja cantorias\LEIA-ME.txt
  (ex.: coloque rosa.mp3 na pasta "cantorias" e toda Rosa toca essa música).
- Lista de palavras proibidas que você mesmo edita: palavras-proibidas.txt (recarrega sozinha).
- IA opcional (paga, da OpenAI): com a chave, a cobra entende e responde os comentários de verdade.
  Sem a chave, continua tudo funcionando com as frases prontas.

IA DA OPENAI (OPCIONAL)
1. Crie uma chave em platform.openai.com (precisa colocar crédito, normalmente a partir de 5 dólares).
2. Abra o iniciar.bat no Bloco de Notas e, ANTES da linha "node server.js", coloque:
     set OPENAI_API_KEY=sk-...sua-chave...
3. Salve e abra o jogo. Na primeira resposta a janela preta mostra "IA ligada".
Nunca mostre essa chave na live nem mande pra ninguém. Se a IA falhar, o jogo volta pras frases prontas sozinho.

SOBRE A VOZ
A voz natural (Francisca) precisa de internet. Ao abrir o jogo, a janela preta mostra
"Voz natural ativada" na primeira fala. Para trocar a voz, edite o iniciar.bat e coloque antes de "node server.js":
  set VOZ=pt-BR-ThalitaNeural     (outra voz feminina)
  set VOZ=pt-BR-AntonioNeural     (voz masculina)
Para trocar a voz do narrador (que lê os comentários):
  set VOZ_NARRADOR=pt-BR-FranciscaNeural
Se a voz natural falhar (sem internet, por exemplo), o jogo usa sozinho a voz do Windows ("Microsoft Maria").
No LIVE Studio, deixe o som ligado (ícone do alto-falante sem o X).

SOBRE A MÚSICA
Para deixar a música mais baixa ou desligar, abra public\index.html no Bloco de Notas,
procure "MUSICA_VOLUME=.22" e troque o número (0 desliga, 0.4 mais alto).

AVISOS
- Usa a biblioteca não oficial tiktok-live-connector. A live precisa estar no ar para conectar;
  se não estiver, o jogo tenta de novo a cada 20 segundos.
- O ranking zera quando você fecha o jogo.
- Jogos interativos com presentes podem ir contra as regras do TikTok LIVE. Use por sua conta.
