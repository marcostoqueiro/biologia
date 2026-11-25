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
| Rotor | cubo central de ~14 cm, 3 pás de acrílico radiais e 3 hastes metálicas a 120° | lido nas mesmas fotos; a extensão das pás em profundidade é suposição |
| Cores das bolas | uma cor por dígito final | deduzido dos tubos de carga (5 tubos com 3 bolas, 5 com 2) |
| Rotação, forma de captação | ajustáveis | estimativas (não dá para medir em foto) |
| Elasticidade, atrito | ajustáveis | valores típicos de borracha |

A física inclui gravidade, colisões bola-bola e bola-parede com elasticidade, atrito com giro das bolas, rotor de pás girando dentro do tambor fixo, arrasto do ar simplificado e pequenas variações de fabricação por bola.

## Desenvolvimento

```
npm install
npm run build   # gera lotofacil-simulador.html
npm test        # roda 500 sorteios e confere a uniformidade das dezenas
```
