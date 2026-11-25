# Simulador físico Lotofácil

Simulação 3D de um sorteio no estilo Lotofácil: 25 bolas dentro de um globo fixo com rotor de pás, 15 retiradas. Gera jogos a partir dos sorteios simulados e exporta em imagem (PNG), texto ou impressão.

**Aviso:** é uma simulação. O movimento das bolas é caótico, então o app não prevê o sorteio oficial nem aumenta a chance de acerto. Toda combinação de 15 dezenas tem a mesma probabilidade.

## Como usar no PC

Baixe `lotofacil-simulador.html` e abra com duplo clique (Chrome, Edge ou Firefox). Não precisa instalar nada nem de internet.

- **Sorteio ao vivo:** "Iniciar sorteio" e acompanhe em 3D (arraste para girar a câmera, role para aproximar).
- **Jogos:** "Simular e gerar" roda vários sorteios completos sem animação; cada um vira um jogo.
- **Semente:** o mesmo número de semente com os mesmos parâmetros repete o sorteio bola por bola.

## O que é real e o que é estimativa

| Item | Valor | Origem |
|---|---|---|
| Diâmetro da bola | 50 mm | divulgado pela Caixa |
| Massa da bola | 66 g | divulgado pela Caixa |
| Material | borracha maciça | divulgado pela Caixa |
| Globo | tambor fixo com ~57 cm de diâmetro interno e ~39 cm de profundidade: frente plana com aro, fundo abaulado | medido em fotos do equipamento, com as bolas (50 mm) como régua; ± 5% no diâmetro, ± 15% na profundidade |
| Rotor | 3 pás de acrílico radiais (da borda do disco central de ~22 cm até a parede) e 3 hastes metálicas a 120°; centro livre | lido em fotos e quadros de vídeo; a profundidade das pás (35% do globo) foi calibrada: com pás na profundidade toda as bolas ficam coladas na parede e a mistura deixa de ser uniforme, o que não bate com o vídeo |
| Rotação do rotor | 80 rpm | faixa de 70–140 rpm estimada pelo borrão de movimento no vídeo |
| Carga das bolas | ficam paradas nos 10 tubos (01–10 embaixo, 11–20 no meio, 21–25 em cima); as comportas abrem juntas e as colunas caem pelos tubos com o rotor já girando | visto no vídeo |
| Cores das bolas | uma cor por dígito final | confirmado no vídeo (tubo vermelho: 01, 11, 21) |
| Forma de captação, elasticidade, atrito | ajustáveis | estimativas |
| Elasticidade, atrito | ajustáveis | valores típicos de borracha |

A física inclui gravidade, colisões bola-bola e bola-parede com elasticidade, atrito com giro das bolas, rotor de pás girando dentro do tambor fixo, arrasto do ar simplificado e pequenas variações de fabricação por bola.

## Desenvolvimento

```
npm install
npm run build   # gera lotofacil-simulador.html
npm test        # roda 500 sorteios e confere a uniformidade das dezenas
node test/diag.mjs 100 '{"rpm":120}'   # compara a mistura com outros parâmetros
```
