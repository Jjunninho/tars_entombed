// ============================================================
// 🧠 AI BRAIN — Rede Neural + Treinamento
// Arquivo: js/ai/ai-brain.js
//
// Arquitetura: 12 → 16 → 16 → 4
// Fase 1 (Imitação): aprende a imitar o jogador humano
// Fase 2 (RL/DQN):  refina jogando sozinho via Q-Learning
// ============================================================

window.AIBrain = (function () {
    'use strict';

    // ── Hiperparâmetros ───────────────────────────────────────────
    const LAYERS        = [12, 16, 16, 4]; // arquitetura da rede

    const LR_IMITATION  = 0.002;   // taxa de aprendizado - imitação
    const LR_RL         = 0.001;   // taxa de aprendizado - RL
    const MOMENTUM      = 0.9;     // momentum SGD

    const GAMMA         = 0.95;    // fator de desconto futuro
    const BATCH_SIZE    = 32;      // mini-batch
    const BUFFER_CAP    = 15000;   // capacidade do replay buffer
    const TARGET_UPDATE = 400;     // steps entre cópias da target network

    const EPS_START     = 1.0;     // exploração inicial (100%)
    const EPS_END       = 0.05;    // exploração mínima (5%)
    const EPS_DECAY     = 0.9998;  // decaimento por step

    // ── Álgebra Linear (JS puro, sem libs) ───────────────────────

    // Produto matriz × vetor: W[rows×cols] * v[cols] → out[rows]
    function matVec(W, v) {
        const out = new Float32Array(W.length);
        for (let i = 0; i < W.length; i++) {
            let s = 0;
            for (let j = 0; j < v.length; j++) s += W[i][j] * v[j];
            out[i] = s;
        }
        return out;
    }

    function vecAdd(a, b) {
        const out = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
        return out;
    }

    function relu(v)     { return v.map(x => x > 0 ? x : 0); }
    function reluD(v)    { return v.map(x => x > 0 ? 1 : 0); }   // derivada
    function sigmoid(v)  { return v.map(x => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))))); }

    // Inicialização Xavier: std = sqrt(2/(fan_in + fan_out))
    function xavierMatrix(rows, cols) {
        const std = Math.sqrt(2.0 / (rows + cols));
        return Array.from({ length: rows }, () =>
            Float32Array.from({ length: cols }, () => (Math.random() * 2 - 1) * std)
        );
    }

    // ── Criação de Rede ───────────────────────────────────────────
    function createNet() {
        const net = { W: [], b: [], vW: [], vB: [] }; // W=pesos, b=bias, v=velocidades (momentum)
        for (let l = 0; l < LAYERS.length - 1; l++) {
            const rows = LAYERS[l + 1];
            const cols = LAYERS[l];
            net.W.push(xavierMatrix(rows, cols));
            net.b.push(new Float32Array(rows));
            net.vW.push(Array.from({ length: rows }, () => new Float32Array(cols)));
            net.vB.push(new Float32Array(rows));
        }
        return net;
    }

    function cloneNet(src) {
        const dst = createNet();
        for (let l = 0; l < src.W.length; l++) {
            dst.W[l] = src.W[l].map(r => Float32Array.from(r));
            dst.b[l] = Float32Array.from(src.b[l]);
        }
        return dst;
    }

    // ── Forward Pass ──────────────────────────────────────────────
    // Retorna todas as ativações (para backprop) + pré-ativações
    function forward(net, input, outputFn = 'sigmoid') {
        const acts  = [Float32Array.from(input)]; // ativações por camada
        const pres  = [];                          // pré-ativações por camada

        for (let l = 0; l < net.W.length; l++) {
            const pre = vecAdd(matVec(net.W[l], acts[l]), net.b[l]);
            pres.push(pre);

            const isLast = l === net.W.length - 1;
            if (isLast) {
                acts.push(outputFn === 'sigmoid' ? sigmoid(pre) : pre); // linear p/ Q-values
            } else {
                acts.push(relu(pre));
            }
        }

        return { acts, pres };
    }

    // ── Backward Pass (SGD com Momentum) ─────────────────────────
    function backward(net, acts, pres, target, outputFn, lr) {
        const nL = net.W.length;

        // Gradiente na camada de saída
        let delta;
        if (outputFn === 'sigmoid') {
            // BCE / MSE combinado: dL/dout = (out - target)
            const out = acts[nL];
            delta = out.map((o, i) => o - target[i]);
        } else {
            // MSE linear: dL/dout = (out - target)
            const out = acts[nL];
            delta = out.map((o, i) => o - target[i]);
        }

        for (let l = nL - 1; l >= 0; l--) {
            const prevAct = acts[l];

            // Atualiza W[l] e b[l]
            for (let i = 0; i < net.W[l].length; i++) {
                for (let j = 0; j < net.W[l][i].length; j++) {
                    const g = delta[i] * prevAct[j];
                    net.vW[l][i][j] = MOMENTUM * net.vW[l][i][j] - lr * g;
                    net.W[l][i][j] += net.vW[l][i][j];
                }
                net.vB[l][i] = MOMENTUM * net.vB[l][i] - lr * delta[i];
                net.b[l][i] += net.vB[l][i];
            }

            // Propaga delta para camada anterior (exceto input)
            if (l > 0) {
                const newDelta = new Float32Array(LAYERS[l]);
                const rd = reluD(pres[l - 1]);
                for (let j = 0; j < LAYERS[l]; j++) {
                    let s = 0;
                    for (let i = 0; i < delta.length; i++) s += net.W[l][i][j] * delta[i];
                    newDelta[j] = s * rd[j];
                }
                delta = newDelta;
            }
        }
    }

    // ── Replay Buffer (FIFO circular) ─────────────────────────────
    const replayBuffer = {
        buf: [],
        push(exp) {
            if (this.buf.length >= BUFFER_CAP) this.buf.shift();
            this.buf.push(exp);
        },
        sample(n) {
            const shuffled = this.buf.slice().sort(() => Math.random() - 0.5);
            return shuffled.slice(0, Math.min(n, this.buf.length));
        },
        get size() { return this.buf.length; }
    };

    // ── Estado Interno ────────────────────────────────────────────
    let mainNet   = createNet();
    let targetNet = cloneNet(mainNet);
    let epsilon   = EPS_START;
    let stepCount = 0;
    let phase     = 'imitation'; // 'imitation' | 'rl'

    // ── API Pública ───────────────────────────────────────────────
    return {

        get phase()     { return phase; },
        get epsilon()   { return epsilon; },
        get stepCount() { return stepCount; },
        get bufSize()   { return replayBuffer.size; },

        // ── Predição bruta ────────────────────────────────────
        predict(state) {
            const fn = phase === 'rl' ? 'linear' : 'sigmoid';
            const { acts } = forward(mainNet, state, fn);
            return acts[acts.length - 1];
        },

        // ── Ação para modo imitação (limiar 0.5) ──────────────
        // Retorna array binário de 4 ações
        actImitation(state) {
            const out = this.predict(state);
            return out.map(p => p > 0.5 ? 1 : 0);
        },

        // ── Ação epsilon-greedy para RL ───────────────────────
        // Retorna índice da ação dominante (simplificado p/ DQN)
        actRL(state) {
            if (Math.random() < epsilon) {
                // Exploração: vetor aleatório binário
                return new Uint8Array([
                    Math.random() > 0.5 ? 1 : 0,  // left
                    Math.random() > 0.5 ? 1 : 0,  // right
                    Math.random() > 0.3 ? 1 : 0,  // jump (mais frequente)
                    0                               // switchMode (raro, gerenciado à parte)
                ]);
            }
            // Exploração guiada: Q-values lineares
            const q = this.predict(state);
            // Move direita ou esquerda baseado no Q mais alto
            const goRight = q[1] > q[0];
            const doJump  = q[2] > 0;
            return new Uint8Array([
                goRight ? 0 : 1,
                goRight ? 1 : 0,
                doJump  ? 1 : 0,
                0
            ]);
        },

        // ── Fase 1: Treinamento por Imitação ─────────────────
        trainImitation(dataset, epochs = 20, onEpoch = null) {
            if (!dataset || dataset.length === 0) {
                console.warn('⚠️ Dataset vazio!');
                return;
            }
            phase = 'imitation';
            console.log(`📚 Treinando por imitação: ${dataset.length} frames, ${epochs} épocas`);
            const lossHistory = [];

            for (let ep = 0; ep < epochs; ep++) {
                const shuffled = dataset.slice().sort(() => Math.random() - 0.5);
                let totalLoss = 0;
                let batches   = 0;

                for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
                    const batch = shuffled.slice(i, i + BATCH_SIZE);
                    let batchLoss = 0;

                    for (const sample of batch) {
                        const tgt = Float32Array.from(sample.action);
                        const { acts, pres } = forward(mainNet, sample.state, 'sigmoid');
                        const out = acts[acts.length - 1];

                        // MSE loss por ação
                        batchLoss += out.reduce((s, o, j) => s + (o - tgt[j]) ** 2, 0) / 4;
                        backward(mainNet, acts, pres, tgt, 'sigmoid', LR_IMITATION);
                    }

                    totalLoss += batchLoss / batch.length;
                    batches++;
                }

                const avgLoss = totalLoss / Math.max(1, batches);
                lossHistory.push(avgLoss);

                if (ep % 5 === 0 || ep === epochs - 1) {
                    console.log(`  Época ${ep + 1}/${epochs} — Loss: ${avgLoss.toFixed(4)}`);
                }
                if (onEpoch) onEpoch(ep + 1, avgLoss);
            }

            // Sincroniza target net com a net treinada
            targetNet = cloneNet(mainNet);
            console.log('✅ Imitação concluída!');
            return lossHistory;
        },

        // ── Fase 2: Armazenar experiência no buffer ────────────
        remember(state, action, reward, nextState, done) {
            replayBuffer.push({
                state:     Float32Array.from(state),
                action:    Uint8Array.from(action),
                reward,
                nextState: Float32Array.from(nextState),
                done
            });
        },

        // ── Fase 2: Um step de treinamento RL (DQN) ───────────
        // Retorna a loss média do batch, ou null se buffer insuficiente
        trainRLStep() {
            if (replayBuffer.size < BATCH_SIZE) return null;
            phase = 'rl';

            const batch = replayBuffer.sample(BATCH_SIZE);
            let totalLoss = 0;

            for (const exp of batch) {
                // Q-values atuais
                const { acts, pres } = forward(mainNet, exp.state, 'linear');
                const qCurrent = Float32Array.from(acts[acts.length - 1]);

                // Q-values do próximo estado via target network (Bellman)
                const { acts: nextActs } = forward(targetNet, exp.nextState, 'linear');
                const qNext    = nextActs[nextActs.length - 1];
                const maxQNext = Math.max(...qNext);

                // Target: Q(s,a) = r + γ * max_a' Q(s',a')
                const target = Float32Array.from(qCurrent);
                for (let a = 0; a < 4; a++) {
                    if (exp.action[a]) {
                        target[a] = exp.reward + (exp.done ? 0 : GAMMA * maxQNext);
                    }
                }

                totalLoss += target.reduce((s, t, i) => s + (qCurrent[i] - t) ** 2, 0);
                backward(mainNet, acts, pres, target, 'linear', LR_RL);
            }

            // Decaimento epsilon
            epsilon = Math.max(EPS_END, epsilon * EPS_DECAY);
            stepCount++;

            // Atualiza target network periodicamente
            if (stepCount % TARGET_UPDATE === 0) {
                targetNet = cloneNet(mainNet);
                console.log(`🎯 Target net atualizada — step ${stepCount}, ε=${epsilon.toFixed(3)}`);
            }

            return totalLoss / BATCH_SIZE;
        },

        // ── Serialização ──────────────────────────────────────
        save() {
            const payload = {
                W: mainNet.W.map(l => l.map(r => Array.from(r))),
                b: mainNet.b.map(l => Array.from(l)),
                epsilon, stepCount, phase
            };
            localStorage.setItem('tars_ai_brain', JSON.stringify(payload));
            console.log(`💾 Cérebro salvo — step: ${stepCount}, ε: ${epsilon.toFixed(3)}, fase: ${phase}`);
        },

        load() {
            try {
                const raw = localStorage.getItem('tars_ai_brain');
                if (!raw) return false;
                const d = JSON.parse(raw);
                mainNet.W = d.W.map(l => l.map(r => Float32Array.from(r)));
                mainNet.b = d.b.map(l => Float32Array.from(l));
                targetNet  = cloneNet(mainNet);
                epsilon    = d.epsilon    ?? EPS_START;
                stepCount  = d.stepCount  ?? 0;
                phase      = d.phase      ?? 'imitation';
                console.log(`📂 Cérebro carregado — step: ${stepCount}, ε: ${epsilon.toFixed(3)}, fase: ${phase}`);
                return true;
            } catch (e) {
                console.warn('⚠️ Erro ao carregar cérebro:', e);
                return false;
            }
        },

        reset() {
            mainNet   = createNet();
            targetNet = cloneNet(mainNet);
            replayBuffer.buf = [];
            epsilon   = EPS_START;
            stepCount = 0;
            phase     = 'imitation';
            console.log('🔄 Cérebro resetado');
        },

        getStats() {
            return {
                phase, epsilon: epsilon.toFixed(3),
                stepCount, bufferSize: replayBuffer.size,
                layerSizes: LAYERS
            };
        }
    };
})();
