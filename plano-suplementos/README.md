# Plano de estudo: Suplementos Alimentares

Plano em etapas para entender os suplementos mais populares (whey, creatina, pré-treino e outros) do ponto de vista da biologia, da bioquímica e da tecnologia de alimentos.

## Etapas

| # | Etapa | Status | Arquivo |
|---|---|---|---|
| 1 | **Obtenção e processamento**: de onde vem cada suplemento e como é fabricado | ✅ Concluída | [etapa-01-obtencao-e-processamento.md](etapa-01-obtencao-e-processamento.md) |
| 1 (visual) | **Por Dentro do Pote**: a Etapa 1 interativa, com máquinas simuladas e reações em 3D | ✅ Concluída | [visual/por-dentro-do-pote.html](visual/por-dentro-do-pote.html) |
| 2+ | *A definir* | ⏳ Aguardando definição | — |

## Versão visual (Por Dentro do Pote)

Uma página única (abre no navegador) com três áreas de fábrica: whey (8 equipamentos), creatina (7) e pré-treino (3). Cada equipamento é uma simulação com controles: pH, temperatura, pressão, rotação etc. Cada reação química roda em 3D, passo a passo, mostrando para onde vão os elétrons e por que a reação acontece.

- **Whey:** coagulação com quimosina, centrífuga (lei de Stokes), pasteurização, ultrafiltração/diafiltração, troca iônica, hidrólise, evaporação a vácuo e spray dryer.
- **Creatina:** forno de cianamida cálcica, reator com simulador de lote, cristalizador, centrífuga de cesto, secador, moinho e um laudo de HPLC que usa o lote que você produziu.
- **Pré-treino:** extração com CO₂ supercrítico, premix e misturador em V (uniformidade de dose) e empedramento por umidade.
- **Reações 3D:** formação da creatina, diciandiamida, creatinina, hidrólise do peptídeo, cafeína × adenosina, beta-alanina → carnosina e carnosina como tampão.

Os modelos são didáticos: calibrados para mostrar tendências, não para projetar uma planta.

**Como editar:** o código-fonte fica em `visual/src/`. Depois de mudar algo, rode `python3 plano-suplementos/visual/ferramentas/montar.py` para gerar o HTML de novo. As geometrias 3D vêm de `visual/ferramentas/gerar_reacoes.py`, que precisa de RDKit e NumPy.

## O que a Etapa 1 cobre

- **As 4 rotas de obtenção:** extração de matriz natural, síntese química, fermentação e conversão enzimática.
- **Whey protein:** do soro do queijo ao pó (ultrafiltração, diafiltração, microfiltração, troca iônica, hidrólise, spray drying); diferenças entre concentrado, isolado, hidrolisado e nativo.
- **Creatina:** biossíntese no corpo (AGAT → GAMT), fontes naturais e a síntese industrial (cianamida + sarcosinato), impurezas e formas de mercado.
- **Pré-treino:** ingrediente por ingrediente (cafeína, beta-alanina, citrulina, taurina, betaína, nitrato…) e como a mistura é fabricada.
- **Outros:** BCAA/glutamina, colágeno, albumina, proteínas vegetais, carboidratos, ômega-3 e vitaminas.
- **Transversais:** fabricação do produto final, controle de qualidade, fraudes comuns e regulação no Brasil.

> ⚠️ Material educativo. Não substitui orientação de nutricionista ou médico.
