# Baile do Abismo

Jogo para TikTok LIVE: quem comenta vira um boneco 3D dançando na roda, com foto e nome.

```
BAILE DO ABISMO — jogo interativo para TikTok LIVE
Quem comenta vira uma CAVEIRA 3D dançando na roda, com a FOTO e o NOME em cima da cabeça.

COMO FUNCIONA
- Comentou, entrou: a caveira chega pelo tapete vermelho e vai dançar na roda.
- 4 tipos de caveira (simples, mago, encapuzada, guerreira), cada pessoa com olhos de uma cor, ossos de uma cor e um enfeite anos 80.
- Baile doido: requebrar, agachar até o chão, passinho, robozinho, cambalhota, estrela, deitar, pular, se DESMONTAR e REMONTAR,
  a roda inteira dançando junto, duplas dançando frente a frente, trenzinho correndo em volta da roda e a banda dançando.
- Tela limpa: só os presentes, as fotos e os nomes (e o tempo que falta pro fim do baile).
- A roda tem 30 lugares. LOTOU? Aparece "CONTINUE COMENTANDO PARA ENTRAR NO BAILE": quem comentar quando o próximo baile começar entra.
- Cada baile dura 5 minutos. No fim tem o CASAMENTO no altar e já começa outro baile.
- Comentar MENINA ou MENINO escolhe o enfeite (menina: laço, flor, coroa; o jogo tenta adivinhar pelo nome).
- Quem já está na roda e comenta: aparece um balãozinho com o comentário em cima da cabeça.
- Sem fala: o baile é só música e dança. O Palhação é o DJ no palco e a Serpente fica no altar.
- A câmera passeia sozinha como um drone: close com o nome grande, a roda de cima, de baixo, girando no meio,
  o palco, o altar e o tapete vermelho por onde a galera chega.

PRESENTES
  💬 Comentou (ou compartilhou / seguiu) = entra no baile. O comentário aparece em cima do boneco, no lugar do nome.
  🌹 Rosa (e presentes até 29 moedas) = DANÇA SOZINHO NA TELA por 10 s. Presente novo entra na hora;
     com muita gente mandando, a câmera intercala com a roda inteira.
  🍩 Rosquinha (30 moedas ou mais) = VIRA O DJ: foto e nome em cima do palhaço do palco, troca a música e a banda faz o show.
  🦖 Mini Dino = FOTO NO OUTDOOR até o fim do baile. O próximo que mandar troca a foto.
  🎆 Fogos de artifício = vira NOIVO (menino) ou NOIVA (menina) e vai pro altar. O próximo que mandar toma o lugar.
     No fim do baile, os dois casam.
  🎟️ Quem manda presente entra na hora, mesmo com a roda cheia (até 10 a mais que o limite).
  Noivo e noiva que ainda estiverem na live (comentaram, curtiram ou mandaram presente nos últimos 10 minutos)
  entram direto no próximo baile. O TikTok não avisa quando alguém sai da live, por isso o jogo usa esse tempo.
  A cada 500 curtidas tem festa com confete.

COMO USAR
1. Clique duas vezes no atalho "Baile do Abismo" (ou no iniciar.bat). O painel abre sozinho no navegador.
2. No TikTok LIVE Studio adicione uma fonte "Link" com:  http://localtest.me:3000/baile.html  (1080x1920)
3. Comece a live e clique em Conectar no painel. Deixe a janela preta aberta durante a live.
Testar sem live: no painel, cartão "Testar sem estar ao vivo", ou abra http://localhost:3000/baile.html?demo=1

PAINEL (http://localhost:3000/painel.html, só funciona no computador da live)
- Quantos estão na roda, quanto falta pro fim do baile, quem é o noivo e a noiva.
- Duração do baile e quantas pessoas cabem na roda. Botões: terminar o baile agora e esvaziar a roda.
- Botões de teste: comentário, "menina", "menino", rosa, rosquinha, presentão, seguir, compartilhar, curtidas, encher a roda.
- Música (ligada e volume), palavras proibidas, lista do que está acontecendo e Atualizar sistema.

DJ COMEDIANTE (cartão "DJ comediante" no painel)
- A cada 3 minutos (você escolhe de 1 a 10) o DJ pega um comentário do chat e responde brincando.
- A resposta aparece num balão no canto de cima da tela e sai na voz em português do Windows (a música abaixa enquanto ele fala).
- Ele só fala na tela do baile: não escreve nada no chat do TikTok.
- IA grátis (opcional): entre em aistudio.google.com com sua conta Google, clique em "Get API key" > "Create API key" e cole no painel.
  Sem chave, ele usa piadas prontas. Palavrões e pedidos de presente são bloqueados nas respostas.
- Se não sair voz: Configurações do Windows > Hora e idioma > Fala > adicionar a voz "Português (Brasil)".

MÚSICAS (pasta sua, a atualização nunca apaga)
- musicas-baile: seus MP3. Sem MP3, tocam as músicas do próprio jogo (funk, forró, disco e pagode).

PERSONAGENS PRÓPRIOS (Meshy + danças da Mixamo)
- Coloque os bonecos na pasta baile-personagens e as danças em baile-personagens/dancas (veja o LEIA-ME de lá).
  Com eles na pasta, o baile usa os seus personagens com as danças de verdade; sem eles, dançam as caveiras.

CAVEIRAS
- KayKit Character Pack: Skeletons, de Kay Lousberg (kaylousberg.com), licença CC0: pode usar à vontade, sem dar crédito.
  Ficam em public/esqueletos (o caveira.glb guarda as animações).

ARQUIVOS
- server.js: conecta na live e roda o baile · painel.js: o painel · config.js: suas configurações (pasta "privado")
- public/baile.html: a tela do baile · public/baile-motor.js: as regras · public/texto.js: filtro e nomes dos presentes
- public/esqueletos.js: as caveiras · public/dancarinos.js: os passos de dança
- public/personagens.js: o Palhação DJ e a Serpente · public/musica-baile.js: as músicas do jogo
- palavras-proibidas.txt: comentários e nomes com essas palavras não aparecem
```
