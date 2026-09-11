const fs = require('fs');
const path = './server/engine/narrator/systemInstructions.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "- AÇÕES COM RISCO/INCERTEZA: ROLE DADOS usando roll_check para resolver incerteza dentro do que é fisicamente e narrativamente plausível.",
  `- AÇÕES COM RISCO/INCERTEZA: ROLE DADOS OBRIGATORIAMENTE.
   - SEMPRE que o jogador declarar "Eu tento...", "Vou tentar...", "Ataco...", "Roubo...", ou intenção de realizar algo falível, VOCÊ DEVE OBRIGATORIAMENTE CHAMAR A FERRAMENTA roll_check OU roll_d20 ANTES DE NARRAR QUALQUER DESFECHO.
   - NÃO descreva o resultado da ação na primeira resposta. Apenas chame a ferramenta e aguarde o retorno do servidor.`
);

fs.writeFileSync(path, code);
