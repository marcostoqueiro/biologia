/* Conteúdo: linhas de produção (estações) e roteiros das reações 3D. */

const LINES = {
  whey: {
    area: "Área 100",
    name: "Whey protein",
    start: "leite",
    intro: "O soro do queijo é 93% água e só ~0,7% de proteína. Oito equipamentos separam essa proteína sem cozinhá-la. Clique em cada máquina, mexa nos controles e veja o que muda.",
    rx: ["hidrolise"],
    stations: [
      {
        tag: "T-101", name: "Tanque de coagulação", kind: "tank", stream: "whey", scene: "coag", out: "queijo",
        what: "O leite recebe coalho. A enzima quimosina corta a κ-caseína entre os aminoácidos 105 (fenilalanina) e 106 (metionina). As micelas de caseína se juntam num gel, a coalhada, e o líquido que sobra é o soro.",
        why: "A κ-caseína forma uma \"cabeleira\" hidrofílica e negativa na superfície das micelas, que as mantém afastadas. Cortada a cabeleira, as micelas expõem regiões hidrofóbicas e se ligam por pontes de cálcio (Ca²⁺). As proteínas do soro são pequenas e solúveis: não entram no gel e saem com o líquido. O pedaço cortado (glicomacropeptídeo, GMP) também vai para o soro.",
        nums: [["Temperatura", "~30–35 °C"], ["Tempo", "~30–40 min até o corte"], ["Rendimento", "10 L de leite → ~1 kg de queijo + ~9 L de soro"], ["Soro doce", "pH ~6,0–6,6"]],
        risk: "Frio demais (abaixo de ~20 °C), as micelas cortadas quase não se agregam. Coagular com ácido gera soro ácido, com mais minerais e mais difícil de filtrar."
      },
      {
        tag: "C-201", name: "Centrífuga de pratos", kind: "centrifuge", stream: "whey", scene: "centri", out: "creme · lodo",
        what: "O soro entra numa centrífuga que gira a milhares de rpm. A gordura, mais leve, vai para o centro e sai como creme de soro. Partículas pesadas (finos de caseína) são jogadas contra a parede e descarregadas como lodo.",
        why: "Lei de Stokes: a velocidade de separação cresce com a diferença de densidade, com o quadrado do tamanho da partícula e com a aceleração. A centrífuga troca a gravidade (1 × g) por milhares de g. Os pratos cônicos empilhados encurtam o caminho de cada partícula de metros para milímetros.",
        nums: [["Gordura", "~0,93 g/cm³"], ["Soro", "~1,02–1,03 g/cm³"], ["Glóbulos de gordura", "~1–10 µm"], ["Aceleração", "~5.000–10.000 × g"]],
        risk: "Gordura que sobra no soro entope as membranas da ultrafiltração e oxida no pó (gosto de ranço)."
      },
      {
        tag: "HX-301", name: "Pasteurizador a placas", kind: "plates", stream: "heat", scene: "pasteur",
        what: "O soro passa entre placas finas de inox; do outro lado corre água quente, em sentido contrário. Em segundos chega a ~72 °C, fica ~15 s num tubo de retenção e é resfriado.",
        why: "Bactérias morrem de forma exponencial: cada \"valor D\" de tempo mata 90% delas, e poucos graus a mais encurtam muito esse tempo. As proteínas do soro só começam a se desdobrar por volta de 70–75 °C, quando se rompem as ligações de hidrogênio e as interações hidrofóbicas que mantêm o \"novelo\" dobrado. A janela útil é estreita.",
        nums: [["Binômio", "72 °C por 15 s (HTST)"], ["Placas", "inox de ~0,5 mm"], ["Regeneração", "o soro quente que sai pré-aquece o frio que entra"]],
        risk: "Abaixo de ~70 °C sobram microrganismos. Acima de ~80 °C a proteína desnatura, perde solubilidade e incrusta as placas."
      },
      {
        tag: "UF-401", name: "Ultrafiltração + diafiltração", kind: "membrane", stream: "whey", scene: "uf", out: "permeado (lactose)",
        what: "O soro é bombeado em alta velocidade rente a uma membrana (fluxo tangencial). A pressão empurra água, lactose e sais pelos poros; as proteínas, grandes demais, ficam e se concentram. Na diafiltração entra água limpa para \"lavar\" a lactose que sobrou.",
        why: "É uma peneira molecular. Uma membrana de corte ~10 kDa separa pelo tamanho: a lactose tem 0,34 kDa; a β-lactoglobulina, ~18 kDa (36 kDa como dímero). Só concentrar não basta: a lactose sai na mesma concentração em que está, então o soro precisa ser concentrado ~20× e depois lavado para chegar a 80% de proteína. Empurrar com mais pressão tem limite: as proteínas formam uma camada-gel na membrana e o fluxo para de subir.",
        nums: [["Pressão transmembrana", "1–5 bar"], ["Membrana", "espiral de polímero, ~10 kDa"], ["Fator de concentração", "~20–30× para WPC 80"], ["Lactose", "342 Da = 0,34 kDa"]],
        risk: "Corte grande demais (50–100 kDa) deixa proteína escapar no permeado. Pressão alta só engrossa a camada-gel e suja a membrana mais rápido."
      },
      {
        tag: "IX-501", name: "Troca iônica (isolado)", kind: "column", stream: "whey", scene: "ix", out: "lactose · minerais",
        what: "Para o isolado (WPI), o soro acidificado passa por colunas cheias de esferas de resina com cargas negativas. As proteínas grudam; lactose, gordura e minerais passam direto. Depois, uma solução de pH mais alto e com sal solta as proteínas, que saem quase puras.",
        why: "Toda proteína tem um ponto isoelétrico (pI). Abaixo dele ela ganha prótons e fica com carga líquida positiva; acima, negativa. A β-lactoglobulina tem pI ≈ 5,2. Em pH ~3,5–4,5 as proteínas do soro ficam positivas e são atraídas pela resina negativa. Subindo o pH, a carga inverte e elas são repelidas. O GMP é tão ácido (pI abaixo de 3,8) que continua negativo e não gruda.",
        nums: [["Proteína", "> 90% no extrato seco (WPI)"], ["pI β-lactoglobulina", "≈ 5,2"], ["pI α-lactalbumina", "≈ 4,5"], ["Alternativa", "microfiltração (0,1–1,4 µm) + UF"]],
        risk: "Parte das frações (GMP, um pouco de lactoferrina) se perde. Extremos de pH podem desnaturar a proteína."
      },
      {
        tag: "R-551", name: "Reator de hidrólise (opcional)", kind: "reactor", stream: "whey", scene: "hydro", rx: "hidrolise",
        what: "Só para o whey hidrolisado (WPH): o concentrado ou isolado recebe proteases, enzimas que cortam ligações peptídicas. O processo é parado por aquecimento quando atinge o grau de hidrólise desejado.",
        why: "Cada corte consome uma molécula de água e transforma uma proteína longa em peptídeos menores. Peptídeos curtos são absorvidos mais rápido e são menos alergênicos. Só que eles expõem aminoácidos hidrofóbicos (leucina, isoleucina, fenilalanina) que o novelo da proteína escondia, e esses pedaços têm gosto amargo.",
        nums: [["Enzimas", "alcalase, tripsina, papaína"], ["Controle", "grau de hidrólise (GH, % de ligações cortadas)"], ["Parada", "aquecimento a ~85 °C inativa a enzima"]],
        risk: "Hidrolisar demais deixa o produto muito amargo e caro. Parar tarde demais não tem volta."
      },
      {
        tag: "EV-601", name: "Evaporador a vácuo", kind: "evaporator", stream: "water", scene: "evap", out: "vapor d'água",
        what: "O concentrado escorre em filme fino por dentro de tubos aquecidos a vapor, sob vácuo. A água evapora e vai para um condensador. (O retentado de WPC 80, muito viscoso, às vezes vai direto ao spray dryer.)",
        why: "A água ferve quando sua pressão de vapor iguala a pressão ao redor. Baixando a pressão, ela ferve a temperaturas menores: a ~200 mbar ferve a ~60 °C. Assim se tira água sem cozinhar a proteína. O filme fino garante que cada gota passe só segundos aquecida.",
        nums: [["Ebulição", "~50–70 °C sob vácuo"], ["Economia", "vários efeitos em série ou recompressão do vapor (MVR)"]],
        risk: "Vácuo fraco significa temperatura alta: a proteína desnatura, escurece (reação de Maillard) e incrusta os tubos."
      },
      {
        tag: "SD-701", name: "Spray dryer + aglomeração", kind: "spraydryer", stream: "heat", scene: "spray", out: "pó → envase",
        what: "Um disco girando a milhares de rpm pulveriza o concentrado em gotículas dentro de uma câmara com ar a ~180 °C. Em segundos a água evapora e cada gota vira uma partícula de pó. Na aglomeração, os finos voltam para a zona úmida e grudam em grânulos porosos; a lecitina ajuda o pó a molhar.",
        why: "Gotas minúsculas têm área enorme: um litro vira bilhões delas. Enquanto há água evaporando, a gota fica perto da temperatura de bulbo úmido (~40–50 °C), porque a evaporação consome o calor. Por isso a proteína não cozinha mesmo com ar a 180 °C. A lecitina é anfifílica (uma ponta gosta de água, a outra de gordura) e faz a ponte entre o pó e a água.",
        nums: [["Ar de entrada", "~160–200 °C"], ["Ar de saída", "~70–90 °C"], ["Gotas", "~20–150 µm"], ["Umidade final", "~3–5%"]],
        risk: "Gota grande ou ar frio dão pó úmido que gruda na câmara. Saída quente demais desnatura e escurece a proteína."
      }
    ]
  },

  creatina: {
    area: "Área 200",
    name: "Creatina",
    start: "CaC₂ + N₂",
    intro: "Química industrial do começo ao fim: um forno a 1000 °C, um reator onde pH, temperatura e velocidade de dosagem decidem o lote, e um laboratório que aprova ou reprova o resultado. O que você escolher no reator e no cristalizador aparece no laudo final.",
    rx: ["creatina", "dcd", "creatinina"],
    stations: [
      {
        tag: "F-101", name: "Forno de cianamida cálcica", kind: "furnace", stream: "heat", scene: "furnace", out: "CaCN₂",
        what: "Carbeto de cálcio (CaC₂, feito de cal e coque em forno elétrico a ~2000 °C) reage com nitrogênio puro a ~1000 °C e vira cianamida cálcica (CaCN₂). Depois, em água com CO₂, a CaCN₂ libera a cianamida (H₂N–C≡N) e o cálcio precipita como carbonato.",
        why: "O N₂ tem uma ligação tripla fortíssima (~945 kJ/mol). Só em alta temperatura há energia para rompê-la e prender o nitrogênio ao carbono do carbeto. A reação libera ~300 kJ por mol: depois de começar, ela mesma ajuda a manter o forno quente. Esse processo (Frank-Caro, 1898) foi uma das primeiras formas industriais de fixar o nitrogênio do ar.",
        nums: [["Reação", "CaC₂ + N₂ → CaCN₂ + C"], ["Temperatura", "~1000–1100 °C"], ["Hidrólise", "CaCN₂ + H₂O + CO₂ → H₂NCN + CaCO₃"]],
        risk: "Frio demais, a conversão é lenta. Quente demais, a massa sinteriza (começa a fundir) e o N₂ não penetra mais."
      },
      {
        tag: "R-201", name: "Reator encamisado", kind: "reactor", stream: "water", scene: "reactor", rx: "creatina", chart: "ph", in: "sarcosinato",
        what: "Num reator de inox com camisa de aquecimento, uma solução de sarcosinato de sódio é mantida em pH e temperatura controlados enquanto a cianamida é bombeada devagar, por horas. A creatina formada é pouco solúvel e começa a cristalizar no próprio reator.",
        why: "O nitrogênio da sarcosina tem um par de elétrons livre (nucleófilo) e ataca o carbono da cianamida, pobre em elétrons (eletrófilo). O pH decide quem está pronto: em meio ácido o nitrogênio recebe um H⁺ e perde o par livre; em meio básico demais a cianamida perde um H⁺, deixa de ser eletrófila e passa a reagir consigo mesma, formando diciandiamida (DCD). Dosar devagar mantém a cianamida diluída: a reação útil depende de [cianamida]¹, a formação de DCD de [cianamida]².",
        nums: [["pKa da sarcosina (NH)", "≈ 10,0"], ["pKa da cianamida", "≈ 10,3"], ["Faixa usual", "pH ~9–10, 50–100 °C"], ["Patentes", "20–150 °C e pH 7–14"]],
        risk: "Dosagem rápida gera DCD. Calor demais forma creatinina e decompõe a creatina. pH baixo quase para a reação."
      },
      {
        tag: "CR-301", name: "Cristalizador", kind: "crystallizer", stream: "water", scene: "cryst",
        what: "A solução quente e rica em creatina é resfriada de forma controlada. A creatina que não cabe mais dissolvida sai da solução como cristais de creatina monohidratada.",
        why: "A solubilidade cai com a temperatura, e o excesso dissolvido (supersaturação) é a força que move tudo. Primeiro surgem núcleos (nucleação), depois eles crescem. Resfriar rápido cria supersaturação alta: nascem muitos núcleos e o produto vira um pó fino, difícil de filtrar e lavar. Devagar, nascem poucos cristais, que crescem maiores e mais puros, porque cada molécula tem tempo de achar seu lugar na rede.",
        nums: [["4 °C", "6 g/L"], ["20 °C", "14 g/L"], ["50 °C", "34 g/L"], ["60 °C", "45 g/L"]],
        risk: "Cristal fino e irregular prende água-mãe (com impurezas) por dentro e entope a centrífuga."
      },
      {
        tag: "CF-401", name: "Centrífuga de cesto", kind: "basket", stream: "water", scene: "basket", out: "água-mãe",
        what: "A suspensão de cristais entra num cesto perfurado, forrado com tecido filtrante, que gira rápido. O líquido atravessa o tecido; os cristais formam uma torta na parede. Um spray de água lava a torta.",
        why: "A força centrífuga empurra o líquido pelos espaços entre os cristais. A lavagem desloca a água-mãe presa entre eles, levando sais e impurezas. Só que a creatina é um pouco solúvel, então cada lavagem também dissolve produto. Existe um ponto ótimo.",
        nums: [["Aceleração", "~1.000 × g"], ["Torta", "~5–10% de umidade"], ["Perda por volume de lavagem", "~1,5% (didático)"]],
        risk: "Pouca lavagem deixa sódio e impurezas no produto. Lavagem demais derruba o rendimento."
      },
      {
        tag: "DR-501", name: "Secador a vácuo", kind: "dryer", stream: "heat", scene: "dryer", out: "vapor",
        what: "A torta úmida gira num secador aquecido até sair a água que está por fora dos cristais.",
        why: "Há dois tipos de água. A umidade livre fica entre os cristais e sai fácil. A água de cristalização faz parte da rede do cristal: uma molécula de água para cada creatina, 12,1% da massa. Ela só sai acima de ~100 °C. Para vender monohidratada, seca-se em temperatura moderada.",
        nums: [["Composição", "87,9% creatina + 12,1% água"], ["1 g de monohidratada", "= 0,88 g de creatina"]],
        risk: "Quente demais vira creatina anidra (outra especificação). Seco de menos, o pó empedra."
      },
      {
        tag: "ML-601", name: "Moinho + peneira", kind: "mill", stream: "water", scene: "mill",
        what: "Os cristais passam por um moinho de pinos que os quebra em partículas menores; uma peneira separa o tamanho certo e devolve os grandes ao moinho.",
        why: "Partículas menores têm mais área em contato com a água: dispersam e dissolvem mais rápido. \"Micronizada\" significa só isso. A molécula é a mesma.",
        nums: [["200 mesh", "≈ 74 µm de abertura"], ["Moinho de pinos", "milhares de rpm"]],
        risk: "Fino demais vira poeira e empedra com umidade. Moagem agressiva aquece o pó."
      },
      {
        tag: "QC-701", name: "Laboratório (HPLC)", kind: "lab", stream: "water", scene: "qc", rx: "creatinina", out: "laudo",
        what: "Uma amostra de cada lote é dissolvida e injetada num cromatógrafo (HPLC). Cada substância atravessa a coluna em um tempo diferente e aparece como um pico; a área do pico é proporcional à quantidade. O laudo aqui usa o lote que você rodou no reator, o resfriamento do cristalizador e a lavagem da centrífuga.",
        why: "As moléculas interagem de forma diferente com o recheio da coluna (polaridade, tamanho, carga), então se separam no tempo. Impurezas presas dentro do cristal não saem na lavagem: só uma recristalização (dissolver e cristalizar de novo) tira.",
        nums: [["Mercado", "≥ 99,9% de pureza por HPLC"], ["Impurezas", "medidas em ppm (partes por milhão)"], ["Olhar", "creatinina, diciandiamida, di-hidrotriazina"]],
        risk: "Tempos de retenção do gráfico são ilustrativos: dependem da coluna e do método."
      }
    ]
  },

  pre: {
    area: "Área 300",
    name: "Pré-treino",
    start: "café verde",
    intro: "Pré-treino não é uma substância: é uma mistura. Aqui, três etapas que explicam a fabricação: de onde vem a cafeína natural, por que a mistura precisa de premix e por que o pó empedra. No palco 3D, o que cafeína e beta-alanina fazem no corpo.",
    rx: ["cafeina", "carnosina", "tampao"],
    stations: [
      {
        tag: "EX-101", name: "Extração com CO₂ supercrítico", kind: "extractor", stream: "water", scene: "co2", out: "cafeína",
        what: "Grãos verdes de café umedecidos ficam num vaso de alta pressão por onde circula CO₂ supercrítico. Ele dissolve a cafeína e a leva para um separador; ao baixar a pressão, o CO₂ volta a ser gás e a cafeína fica para trás. (A maior parte da cafeína anidra do mercado é sintética, pela rota de Traube: mesma molécula.)",
        why: "Acima de 31 °C e 73,8 bar (o ponto crítico), o CO₂ não é gás nem líquido: entra nos grãos como um gás e dissolve como um líquido. O poder de dissolver cresce com a densidade, então dá para ligar e desligar o solvente só mudando a pressão. Não deixa resíduo.",
        nums: [["Ponto crítico do CO₂", "31,0 °C e 73,8 bar"], ["Ponto triplo", "−56,6 °C e 5,2 bar"], ["Extração", "~100–300 bar"], ["Guaraná", "~2,5–6% de cafeína na semente"]],
        risk: "Abaixo do ponto crítico, o CO₂ gasoso quase não dissolve cafeína. Natural ou sintética, a diferença só aparece no carbono-14."
      },
      {
        tag: "MX-201", name: "Premix + misturador em V", kind: "blender", stream: "water", scene: "blend", in: "ingredientes",
        what: "Os ingredientes são pesados e vão a um misturador que gira e faz o pó cair sobre si mesmo. Os ativos potentes em dose pequena, como a cafeína, antes são diluídos num pouco da base (premix).",
        why: "Uma dose de 10 g com 200 mg de cafeína tem 2% de cafeína. Se ela entra como poucas partículas, cada scoop pega um número aleatório delas: uns vêm com pouco, outros com o dobro. Diluindo antes, muito mais partículas carregam cafeína e a variação entre doses cai. É estatística: o desvio relativo cai com a raiz do número de partículas.",
        nums: [["Dose exemplo", "200 mg de cafeína em 10 g"], ["Critério comum", "desvio-padrão relativo (RSD) ≤ 5%"], ["Cafeína estudada", "3–6 mg/kg ~60 min antes"]],
        risk: "Um scoop com o dobro de cafeína significa 400 mg de uma vez."
      },
      {
        tag: "EN-301", name: "Envase com ar seco", kind: "filler", stream: "water", scene: "humid", out: "potes",
        what: "O pré-treino é envasado em sala com ar desumidificado, e o pote é lacrado logo em seguida.",
        why: "Ingredientes higroscópicos (citrulina malato, betaína, ácidos) puxam água do ar. Acima de uma certa umidade relativa (a umidade crítica de cada pó), a superfície das partículas fica pegajosa e formam-se pontes líquidas entre elas. Quando secam, viram pontes sólidas: o pó empedra. Antiumectantes como o dióxido de silício cobrem as partículas e atrapalham essas pontes.",
        nums: [["Umidade crítica", "varia por ingrediente (no simulador: ilustrativa)"], ["Antiumectante", "dióxido de silício (SiO₂)"]],
        risk: "Pote mal fechado empedra mesmo com o pó bem feito."
      }
    ]
  }
};

/* Roteiros das reações. Números = mapa atômico do arquivo de moléculas.
   ann: lp = par de elétrons livre; dp = carga parcial; ar = setas (de → para);
   hl = destaque; lab = rótulos [[átomos], texto]. */
const RX = {
  hidrolise: {
    title: "Cortando a proteína",
    sub: "Hidrólise da ligação peptídica: como a protease gera o whey hidrolisado.",
    steps: [
      { f: [0], t: "Um pedaço de proteína e uma água",
        txt: "À esquerda, um dipeptídeo (leucina ligada a glicina), o menor pedaço possível de uma proteína. À direita, uma molécula de água.",
        why: "A ligação peptídica (C–N entre dois aminoácidos) é muito estável: sozinha, na água, levaria anos para quebrar. A protease acelera isso milhões de vezes, posicionando a água e estabilizando o intermediário.",
        ann: { dp: [[7, "δ+"], [8, "δ−"]], lp: [14], lab: [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "Leu–Gly"], [[14], "água"]] } },
      { f: [0, 1], t: "A água encosta no carbono",
        txt: "O oxigênio puxa os elétrons da dupla C=O para si. O carbono da ligação peptídica fica com falta de elétrons (δ+) e atrai o par livre do oxigênio da água.",
        ann: { dp: [[7, "δ+"]], lp: [14] } },
      { f: [1, 2], t: "Ataque da água",
        txt: "O oxigênio da água forma uma ligação com o carbono. Um par da dupla C=O sobe para o oxigênio, e um H da água vai para ele. O carbono passa a ter 4 ligações: é o intermediário tetraédrico.",
        ann: { ar: [[["lp", 14], ["at", 7]], [["bd", 7, 8], ["at", 8]]], lp: [14] } },
      { f: [2, 3], t: "A ligação C–N se rompe",
        txt: "O oxigênio devolve o par e refaz a C=O. Para isso, o carbono expulsa o nitrogênio, que leva junto um H. Resultado: dois aminoácidos livres.",
        ann: { ar: [[["lp", 8], ["at", 7]], [["bd", 7, 9], ["at", 9]]] } },
      { f: [3, 4], t: "Leucina e glicina livres",
        txt: "Numa proteína inteira, milhares desses cortes geram peptídeos menores: é o whey hidrolisado.",
        why: "Peptídeos curtos são absorvidos mais rápido e são menos alergênicos. Mas eles expõem aminoácidos hidrofóbicos, como a leucina (aqui à esquerda), que o novelo da proteína escondia. Esses pedaços têm gosto amargo.",
        ann: { lab: [[[1, 2, 3, 4, 5, 6, 7, 8, 14], "leucina"], [[9, 10, 11, 12, 13], "glicina"]] } }
    ]
  },

  creatina: {
    title: "Nasce a creatina",
    sub: "Sarcosinato + cianamida → creatina, como no reator R-201.",
    steps: [
      { f: [0], t: "Os reagentes",
        txt: "À esquerda, a cianamida (H₂N–C≡N). À direita, o sarcosinato: a sarcosina (N-metilglicina) sem o H do ácido, por causa do pH básico.",
        why: "O nitrogênio da ponta (N≡) puxa os elétrons da ligação tripla, e o carbono da cianamida fica pobre em elétrons (δ+). O nitrogênio da sarcosina tem um par de elétrons sobrando: é o \"braço\" que vai atacar.",
        ann: { dp: [[2, "δ+"], [1, "δ−"]], lp: [6], lab: [[[1, 2, 3], "cianamida"], [[6, 7, 8, 9, 16, 17], "sarcosinato"]] } },
      { f: [0, 1], t: "Colisão na orientação certa",
        txt: "Na água quente as moléculas se chocam bilhões de vezes por segundo, mas só reagem quando o par livre do nitrogênio encontra o carbono da cianamida com energia suficiente.",
        why: "Temperatura maior significa choques mais fortes e mais frequentes, e por isso reação mais rápida. Mas também acelera as reações indesejadas.",
        ann: { dp: [[2, "δ+"]], lp: [6] } },
      { f: [1, 2], t: "Ataque nucleofílico",
        txt: "O par de elétrons do nitrogênio da sarcosina forma uma nova ligação com o carbono. Para o carbono não ficar com 5 ligações, um par da ligação tripla sobe para o nitrogênio da ponta, que fica negativo. O nitrogênio que doou o par fica positivo.",
        why: "Se o pH estivesse ácido, esse nitrogênio já estaria ocupado por um H⁺ (NH₂⁺) e não teria par livre para atacar. Por isso a reação quase não anda em pH 7–8.",
        ann: { ar: [[["lp", 6], ["at", 2]], [["bd", 2, 1], ["at", 1]]], lp: [6] } },
      { f: [2, 3], t: "Troca de próton",
        txt: "O H preso ao nitrogênio positivo migra para o nitrogênio negativo (na prática, com ajuda das moléculas de água). As cargas se anulam e nasce o grupo guanidino: um carbono ligado a três nitrogênios.",
        ann: { ar: [[["lp", 1], ["at", 10]], [["bd", 6, 10], ["at", 6]]], hl: [10] } },
      { f: [3], t: "Creatina",
        txt: "Pronto: creatina. Em pH próximo do neutro ela ganha mais um H⁺ no grupo =NH e vira um zwitterion, com uma ponta positiva e outra negativa.",
        why: "Nessa forma as moléculas se empilham muito bem, puxando uma molécula de água para dentro da rede: é a creatina monohidratada, pouco solúvel, que cristaliza e sai da solução.",
        ann: { hl: [1, 2, 3, 6], lab: [[[1, 2, 3, 6, 7, 8, 9, 16, 17], "creatina"]] } }
    ]
  },

  dcd: {
    title: "O atalho indesejado",
    sub: "Cianamida + cianamida → diciandiamida (DCD), a principal impureza do processo.",
    steps: [
      { f: [0], t: "Duas cianamidas",
        txt: "Em pH alto, parte da cianamida perde um H⁺ e vira ânion (direita). O ânion é um nucleófilo forte e pode atacar outra cianamida (esquerda), no lugar da sarcosina.",
        why: "O pKa da cianamida é ≈ 10,3: em pH 10,3 metade dela está como ânion. É exatamente aí que essa reação é mais rápida.",
        ann: { dp: [[2, "δ+"]], lp: [8], lab: [[[1, 2, 3], "cianamida"], [[6, 7, 8, 9], "ânion"], [[10], "H⁺ (da água)"]] } },
      { f: [0, 1], t: "Encontro",
        txt: "Quanto mais cianamida livre no reator, mais frequentes são esses encontros entre duas cianamidas.",
        ann: { lp: [8], dp: [[2, "δ+"]] } },
      { f: [1, 2], t: "Ataque",
        txt: "O nitrogênio negativo do ânion ataca o carbono da outra cianamida, e um par da ligação tripla sobe para a ponta.",
        ann: { ar: [[["lp", 8], ["at", 2]], [["bd", 2, 1], ["at", 1]]], lp: [8] } },
      { f: [2, 3], t: "Diciandiamida",
        txt: "Dois prótons se rearranjam (um vem da água) e sobra a diciandiamida: um dímero da cianamida, sem nenhum valor como suplemento.",
        ann: { ar: [[["lp", 1], ["at", 10]], [["bd", 8, 9], ["at", 8]]], hl: [9, 10] } },
      { f: [3], t: "Por que dosar devagar",
        txt: "A velocidade dessa reação depende de [cianamida] × [cianamida]. A da creatina, de [cianamida] × [sarcosina]. Com a cianamida pingando devagar, sua concentração fica baixa e o atalho fica raro.",
        why: "Teste no R-201: rode um lote com dosagem de 0,5 h e outro com 4 h e compare a DCD no laudo do QC-701.",
        ann: { lab: [[[1, 2, 3, 6, 7, 8, 9, 10], "diciandiamida (DCD)"]] } }
    ]
  },

  creatinina: {
    title: "Como a creatina estraga",
    sub: "Creatina → creatinina + água: a degradação que o laboratório procura.",
    steps: [
      { f: [0], t: "Creatina dissolvida",
        txt: "Creatina em solução (desenhada na forma neutra para facilitar). Repare no NH₂ do grupo guanidino e no carbono do grupo ácido, na outra ponta.",
        why: "O carbono do ácido (C=O) é δ+ e o nitrogênio do NH₂ tem par livre: os dois estão na mesma molécula, a poucos átomos de distância.",
        ann: { lp: [3], dp: [[9, "δ+"]], lab: [[[1, 2, 3, 6, 7, 8, 9, 16, 17], "creatina"]] } },
      { f: [0, 1], t: "A molécula se dobra",
        txt: "A cadeia gira até o NH₂ ficar perto do carbono do ácido. Como os dois estão na mesma molécula, esse encontro é muito provável.",
        why: "Reações que fecham anéis de 5 átomos são rápidas: o anel não fica tensionado e as pontas já estão perto.",
        ann: { lp: [3], dp: [[9, "δ+"]] } },
      { f: [1, 2], t: "Ataque ao carbono do ácido",
        txt: "O par livre do nitrogênio ataca o carbono; um par da dupla C=O sobe para o oxigênio. Fecha-se o anel.",
        why: "Em pH ácido o oxigênio da C=O recebe um H⁺ antes, e o carbono fica ainda mais positivo. Por isso a creatina degrada mais rápido em soluções ácidas e quentes.",
        ann: { ar: [[["lp", 3], ["at", 9]], [["bd", 9, 16], ["at", 16]]], lp: [3] } },
      { f: [2, 3], t: "Prótons se ajeitam",
        txt: "Um H sai do nitrogênio positivo e vai para o oxigênio do –OH, que vira –OH₂⁺: um ótimo grupo de saída.",
        ann: { ar: [[["lp", 17], ["at", 5]], [["bd", 3, 5], ["at", 3]]], hl: [5] } },
      { f: [3, 4], t: "Sai uma água",
        txt: "O oxigênio negativo devolve o par, refaz a C=O e empurra o –OH₂⁺ para fora como água.",
        ann: { ar: [[["lp", 16], ["at", 9]], [["bd", 9, 17], ["at", 17]]] } },
      { f: [4, 5], t: "Creatinina",
        txt: "Um último H muda de nitrogênio e sobra a creatinina: um anel de 5 átomos, sem função para o músculo.",
        why: "Em pó seco a creatina é estável por anos. Dissolvida, principalmente em bebidas ácidas e mornas, ela vira creatinina com o tempo. No corpo isso também acontece (~1,7% por dia), e a creatinina sai na urina.",
        ann: { lab: [[[1, 2, 3, 6, 7, 8, 9, 16], "creatinina"], [[17], "água"]] } }
    ]
  },

  cafeina: {
    title: "Cafeína no lugar da adenosina",
    sub: "Por que a cafeína tira o sono: mesma forma, efeito oposto.",
    pocketFrom: 2,
    steps: [
      { f: [0], t: "Adenosina e cafeína",
        txt: "À esquerda, a adenosina, com seu açúcar (ribose) embaixo. À direita, a cafeína.",
        why: "A adenosina vem do uso de ATP e se acumula no cérebro ao longo do dia. Ligada aos receptores A₁ e A₂A dos neurônios, ela sinaliza cansaço.",
        ann: { lab: [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 18], "adenosina"], [[101, 102, 103, 104, 105, 106, 107, 108, 109], "cafeína"]] } },
      { f: [0, 1], t: "O mesmo esqueleto",
        txt: "Sobrepondo as duas, os anéis coincidem: dois anéis fundidos, com nitrogênios nas mesmas posições (núcleo de purina).",
        why: "Para o receptor, o formato importa. Com o mesmo esqueleto, a cafeína cabe no lugar onde a adenosina se encaixa.",
        ann: { hl: [1, 2, 3, 4, 5, 6, 7, 8, 9, 101, 102, 103, 104, 105, 106, 107, 108, 109] } },
      { f: [1, 2], t: "A adenosina encaixa e ativa",
        txt: "No bolso do receptor (desenho esquemático), a adenosina faz ligações de hidrogênio pelo NH₂ e pelas hidroxilas da ribose e muda a forma da proteína: o sinal de desacelerar é enviado.",
        ann: { hl: [10, 15, 17, 19], lab: [[[1, 2, 3, 4, 5, 6, 7, 8, 9], "adenosina (ativa)"]] } },
      { f: [2, 3], t: "A cafeína ocupa e bloqueia",
        txt: "A cafeína encaixa, mas não tem ribose nem NH₂ para disparar o sinal. Ela ocupa o lugar (é um antagonista) e a adenosina fica de fora: menos sensação de cansaço, mais alerta.",
        why: "Por isso a cafeína não dá energia: ela esconde o sinal de cansaço. Doses estudadas para desempenho: 3–6 mg por kg de peso, ~60 min antes. A EFSA considera seguras para adultos saudáveis até ~400 mg/dia.",
        ann: { hl: [101, 102, 103, 104, 105, 106, 107, 108, 109], lab: [[[101, 102, 103, 104, 105, 106, 107, 108, 109], "cafeína (bloqueia)"]] } }
    ]
  },

  carnosina: {
    title: "Beta-alanina vira carnosina",
    sub: "β-alanina + histidina → carnosina + água, dentro do músculo.",
    steps: [
      { f: [0], t: "Os dois aminoácidos",
        txt: "À esquerda, a beta-alanina: o grupo amino fica no segundo carbono (β), não no primeiro. À direita, a histidina, com seu anel imidazol.",
        why: "O músculo tem histidina de sobra. Quem limita a produção de carnosina é a beta-alanina, por isso suplementá-la aumenta a carnosina muscular (até ~60% em 4 semanas, com 4–6 g/dia).",
        ann: { dp: [[4, "δ+"]], lp: [7], lab: [[[1, 2, 3, 4, 5, 6], "β-alanina"], [[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], "histidina"]] } },
      { f: [0, 1], t: "Encontro",
        txt: "O grupo amino da histidina se aproxima do carbono do ácido da beta-alanina.",
        ann: { lp: [7], dp: [[4, "δ+"]] } },
      { f: [1, 2], t: "Ataque",
        txt: "O par livre do nitrogênio ataca o carbono; um par da C=O sobe para o oxigênio, que recebe um H.",
        ann: { ar: [[["lp", 7], ["at", 4]], [["bd", 4, 5], ["at", 5]]], lp: [7] } },
      { f: [2, 3], t: "Sai uma água",
        txt: "A C=O se refaz e um –OH sai levando um H: água. Fica a ligação amida entre os dois. É a carnosina (β-alanil-histidina).",
        ann: { ar: [[["lp", 5], ["at", 4]], [["bd", 4, 6], ["at", 6]]] } },
      { f: [3, 4], t: "Carnosina",
        txt: "Na célula, a enzima carnosina sintase gasta 1 ATP para ativar o grupo ácido antes do ataque. Aqui aparece só o balanço de átomos.",
        why: "O anel imidazol da histidina continua livre na carnosina. É ele que vai trabalhar como tampão (próxima reação).",
        ann: { hl: [13, 14, 15, 16, 17], lab: [[[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], "carnosina"], [[6], "água"]] } }
    ]
  },

  tampao: {
    title: "Carnosina segura o ácido",
    sub: "O anel imidazol captura H⁺ quando o músculo acidifica.",
    steps: [
      { f: [0], t: "Esforço intenso acidifica",
        txt: "Em esforços de ~30 s a 4 min, o músculo acumula íons H⁺ e o pH cai de ~7,1 para ~6,5. Isso atrapalha enzimas e a contração. À direita, um H⁺ na água (H₃O⁺).",
        why: "A carnosina está desenhada como no corpo: ponta + (NH₃⁺) e ponta − (COO⁻). O nitrogênio livre do anel imidazol tem um par de elétrons disponível.",
        ann: { lp: [14], lab: [[[1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], "carnosina"], [[20, 40], "H₃O⁺"]] } },
      { f: [0, 1], t: "O H⁺ se aproxima",
        txt: "O H₃O⁺ encosta no anel.",
        ann: { lp: [14] } },
      { f: [1, 2], t: "Captura",
        txt: "O nitrogênio do anel usa seu par de elétrons para pegar o H⁺. O H₃O⁺ vira água comum.",
        ann: { ar: [[["lp", 14], ["at", 40]], [["bd", 40, 20], ["at", 20]]], lp: [14] } },
      { f: [2, 3], t: "H⁺ neutralizado",
        txt: "O anel ficou com carga positiva e o H⁺ saiu de circulação.",
        why: "O pKa do anel da carnosina (~6,8) fica bem no meio da faixa de pH do músculo em fadiga. Ele captura H⁺ quando o pH cai e devolve quando sobe: um tampão sob medida. Por isso a beta-alanina ajuda mais em esforços de 1 a 4 minutos.",
        ann: { hl: [14, 40], lab: [[[20], "água"]] } }
    ]
  }
};
