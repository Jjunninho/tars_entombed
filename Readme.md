# 🤖 TARS Entombed: Descida Infinita

**TARS Entombed** é um jogo de plataforma de descida infinita construído 100% em **Vanilla JavaScript** e **HTML5 Canvas**. Inspirado no lendário e misterioso algoritmo de geração de labirintos do clássico *Entombed* (Atari 2600), o jogo coloca você no controle de TARS em uma queda livre por biomas gerados proceduralmente, enfrentando inimigos mecânicos e chefões imprevisíveis.

## ✨ Características Principais

* 🧩 **Geração Procedural Determinística:** O mapa é gerado infinitamente através de *chunks* utilizando uma versão moderna do algoritmo do Atari 2600. O uso de *seeds* garante que mundos incríveis possam ser compartilhados e rejogados.
* 🔄 **Sistema de Transformação (Modos):** Alterne entre o modo **Caminhada** (maior controle, saltos precisos) e o modo **Asterisco** (rolamento rápido, focado em evasão) em tempo real para sobreviver.
* 🧬 **Chefões 100% Procedurais:** A cada 10 andares, enfrente um Boss único. A engine não gera apenas a anatomia e as cores aleatoriamente, mas também o **DNA de Combate** (voar, pular, rastejar nas paredes, atirar, esmagar), tornando cada luta uma experiência totalmente nova.
* 🎹 **Síntese de Áudio Retro (Web Audio API):** Zero arquivos `.mp3` ou `.wav`. Todos os efeitos sonoros (pulos, danos, power-ups, explosões) são sintetizados proceduralmente em tempo real no navegador.
* 🌍 **Biomas Dinâmicos:** Ruínas Tecnológicas, Floresta Cristalina, Abismo Gravitacional e mais. Cada bioma possui suas próprias paletas de cores, decorações animadas (como cachoeiras de pixels) e física adaptada.

## 🎮 Como Jogar

Sobreviva à descida o máximo que puder, desvie dos espinhos, colete gemas para restaurar sua bateria e enfrente os perigos do abismo.

### Controles (Teclado)
* ⬅️ / ➡️ **Setas Direcionais:** Mover o TARS.
* ⬆️ **Seta para Cima:** Pular (Pressione novamente no ar para **Pulo Duplo**).
* ␣ **Espaço:** Alternar modo (Caminhada ↔ Asterisco).
* `L` **Limpar Bloco:** Destrói o bloco imediatamente abaixo dos seus pés (Custa 1 ponto de Score, requer tempo de recarga).
* `R` **Reset:** Reinicia a run atual.

> 📱 **Suporte Mobile:** O jogo conta com um Joystick Virtual embutido na tela para dispositivos móveis com suporte a toques múltiplos.

## 👾 Sistema de Entidades

O jogo roda um sistema de entidades modular customizado:
* **Gemas:** Restauração de bateria e aumento de score (Normal, Especial, Rara).
* **Power-Ups:** Escudo 🛡️, Magnetismo 🧲, Super Pulo 🚀 e Velocidade ⚡.
* **Inimigos:** Drones patrulheiros, Flamebots, Nanites perseguidores e Sawbots serradores.
* **Hazards:** Espinhos gerados proceduralmente para dificultar as rotas mais fáceis.

## 🛠️ Tecnologias Utilizadas

Este projeto foi desenvolvido focado em performance e ausência de dependências externas:
* **HTML5 Canvas API:** Para renderização de todos os gráficos e partículas a 60 FPS.
* **Vanilla JavaScript (ES6+):** Arquitetura orientada a módulos sem uso de engines de terceiros (Phaser, Unity, etc).
* **Web Audio API:** Sintetizador sonoro integrado.

## 🚀 Como rodar localmente

Como o jogo não utiliza bibliotecas externas pesadas ou assets estáticos além dos scripts, rodá-lo é extremamente simples:

1. Clone o repositório:
   ```bash
   git clone [https://github.com/Jjunninho/tars_entombed](https://github.com/Jjunninho/tars_entombed)