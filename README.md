# QuizIA — JSON compacto v2

Site: https://eduardoapz.github.io/quizia/

O aplicativo aceita o formato original 1.0 e o compacto v2. O prompt agora pede v2 por padrão. A interface e a pontuação permanecem iguais.

## Exemplo estrutural

```json
{"v":2,"titulo":"Avaliação","questoes":[{"tipo":"s","pergunta":"Qual opção está correta?","opcoes":["Primeira","Segunda","Terceira"],"respostas":[2],"explicacao":"A segunda opção está correta porque...","pagina":3}]}
```

O exemplo tem apenas uma questão para ilustrar. A importação exige exatamente 25.

- tipo: s (única correta), m (múltiplas corretas), vf (verdadeiro/falso), i (identificar incorreta), l (lacuna).
- respostas: lista de posições **inteiras começando em 1**. Não use letras nem zero. Apenas m aceita mais de uma; sem repetição.
- opcoes: lista de pelo menos dois textos. vf exige exatamente Verdadeiro e Falso.
- pergunta e explicacao: obrigatórias e preenchidas.
- pagina: inteiro positivo ou null; pode ser omitida quando desconhecida.
- documento (na raiz), assunto e dificuldade (por questão) são opcionais. dificuldade aceita f, m ou d. A interface não atribui dificuldade quando omitida.
- Os IDs e a quantidade são calculados pelo aplicativo. Nenhum gabarito é corrigido silenciosamente.

Use demo-compacto.json para testar v2 e demo.json para testar o formato antigo.

A versão compacta reduz estrutura repetitiva; a leitura do PDF e a elaboração das perguntas ainda dependem do ChatGPT. No exemplo incluído, a serialização compacta diminuiu de 11.619 para 7.942 bytes (32%), sem alterar os textos pedagógicos. Isso não garante redução proporcional no tempo de geração.

## Publicação e funcionamento

HTML/CSS/JavaScript estáticos, sem API paga. O GitHub Pages publica a branch main, pasta raiz. Os arquivos JS ficam na raiz nesta distribuição, e o CSS está integrado ao HTML. As fontes modulares e testes também são entregues no pacote local.

O PDF fica no dispositivo; anexe-o manualmente no ChatGPT. A sessão e o cronômetro são salvos no navegador. Os gabaritos são ocultos na interface durante a prova, mas podem ser inspecionados nos dados locais.

