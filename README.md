# QuizIA — geração local por regras

Aplicação estática em português: 25 questões, 45 minutos e correção explicada. Sem login, API paga ou backend.

## Usar

Abra https://eduardoapz.github.io/quizia/?v=3 em um navegador atualizado. Selecione um PDF com texto, escolha o foco e o intervalo de páginas, e clique em **Gerar 25 questões**. Também há um PDF fictício de demonstração.

A geração ocorre no dispositivo. O PDF não é enviado ao servidor. O leitor PDF.js é hospedado junto com o site; a primeira leitura precisa carregar esses arquivos. A avaliação é guardada em sessionStorage nesta aba; o PDF precisa ser selecionado novamente depois de recarregar a página.

Na revisão, abra cada pergunta para ver gabarito e trecho original, edite ou troque questões e baixe o questionário JSON. Abrir o gabarito revela a resposta antes da prova. A avaliação inicia somente ao clicar em Iniciar avaliação. Após finalizar, repita a prova ou gere uma nova rodada excluindo os trechos da prova anterior.

## O que as regras fazem

Extraem definições, valores com unidades e orientações explícitas em português. Produzem perguntas de conceito, completar trecho e verdadeiro/falso, preservando evidência e número físico da página do PDF. Selecionam questões distribuídas por páginas e evitam trechos repetidos. Alternativas numéricas falsas são alterações intencionais para o exercício; o gabarito permanece vinculado ao trecho original.

Este gerador não é uma IA e não equivale ao GPT: não compreende profundamente o assunto nem garante a ausência de ambiguidade entre conceitos. Revise antes de usar em uma avaliação formal. Se o material não oferecer 25 fatos utilizáveis, a plataforma explica a insuficiência, sem preencher com conteúdo inventado.

Limites: 50 MB, 200 páginas, 1,5 milhão de caracteres e até 800 fatos candidatos distribuídos pelas páginas. Imagens não são interpretadas. PDFs escaneados precisam de OCR prévio. PDFs com senha devem ser desbloqueados no leitor do usuário. Tabelas, fórmulas, fontes incomuns e documentos em colunas podem prejudicar a extração. A página referenciada é a posição no arquivo, não necessariamente a numeração impressa.

## Importação e ChatGPT opcionais

A aba **Importar JSON** aceita o formato original v1 e o compacto v2, incluindo os cinco tipos de questões. A opção do ChatGPT fica recolhida abaixo do PDF: copie o prompt, anexe manualmente o arquivo no ChatGPT e importe a resposta. Nenhuma chave de API é usada.

## Desenvolvimento local

Na distribuição modular execute `node serve.cjs` e abra http://127.0.0.1:4173. A leitura de PDF exige HTTP local ou HTTPS, pois usa módulos e Web Worker. Abrir index.html por duplo clique permite apenas a importação JSON. Para publicar, sirva todos os arquivos do pacote; não somente index.html.

Fontes: js/rules.js (geração), js/pdf-reader.js (extração), js/local-ui.js (revisão), demais módulos (avaliação e JSON). A publicação no GitHub usa arquivos achatados na raiz e CSS incorporado ao HTML.

## Verificação

`node tests/run.cjs`, `node tests/v2.cjs`, `node tests/rules.cjs`. Testes de navegador em `/tests/rules-browser.html`: PDF real, revisão/edição/troca, prova, nova rodada, intervalo insuficiente, OCR, senha, cancelamento, JSON e largura de 390px. Os PDFs em tests são fixtures sintéticas. O teste em largura de celular não substitui testes físicos em todos os aparelhos.

## Dependência

PDF.js / pdfjs-dist 6.4.299, Mozilla, distribuído sob Apache-2.0. Builds legacy locais em vendor/, licença em vendor/PDFJS-LICENSE.txt (na publicação achatada, ficam na raiz). Documentação: https://mozilla.github.io/pdf.js/
