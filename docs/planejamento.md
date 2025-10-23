# 📜 Protótipo de Aplicativo de Chat Descentralizado com Segurança Avançada

## 📌 1. Visão Geral do Projeto

Este projeto visa desenvolver um **protótipo funcional de um aplicativo de chat seguro e descentralizado**, com:

*   Comunicação **direta entre dispositivos** (P2P) gerenciada por `libp2p`;
*   **Descoberta de usuários via PubSub**;
*   Uso de **nós de bootstrap públicos** para entrada na rede;
*   **Criptografia de canal** com `libp2p-noise`;
*   Interface moderna em **VueJS + Tailwind**;
*   Arquitetura extensível para suportar escalabilidade e upgrades de segurança.

A proposta de valor central é **“segurança forte e descentralização”**.

---

## 🧭 2. Arquitetura de Rede

### 📡 Modelo de rede com libp2p

*   Não há servidor central.
*   **Nós de Bootstrap**: A rede utiliza nós de bootstrap públicos para que novos pares possam se conectar e descobrir outros participantes.
*   **Descoberta de Pares**: Após o bootstrap, a descoberta contínua é feita com `pubsub-peer-discovery`, onde os nós encontram uns aos outros se inscrevendo em um tópico comum.

```
[ Usuário A ] ⇄ (conexão libp2p) ⇄ [ Nó de Bootstrap ] ⇄ (conexão libp2p) ⇄ [ Usuário B ]
[ Usuário A ] ⇄ (stream direto WebRTC + Noise) ⇄ [ Usuário B ]
```

---

## 🧠 3. Identidade e Descoberta de Usuários

### Identidade

*   Cada usuário é representado por uma **`PeerId`** do `libp2p`, gerada a partir de um par de chaves criptográficas na primeira inicialização.
*   A `PeerId` é a identidade única e verificável do usuário na rede.
*   Um nome de usuário (username) é associado a essa `PeerId` para facilitar a identificação.

### Descoberta

*   Os usuários anunciam sua presença (username e `PeerId`) em um tópico de `gossipsub` (PubSub).
*   Outros clientes, inscritos no mesmo tópico, recebem esses anúncios e populam a lista de contatos online.

---

## 🔐 4. Criptografia

### Tecnologia escolhida: **`libp2p-noise`**

*   **Motivo**: `libp2p-noise` é uma implementação do [Noise Protocol Framework](https://noiseprotocol.org/), que estabelece canais de comunicação seguros, criptografados e autenticados entre os pares. Ele é o padrão de fato para criptografia de canal no `libp2p`.
*   Garante que toda a comunicação entre dois nós seja ininteligível para qualquer intermediário (como um nó de relay).

### Handshake de sessão

1.  Quando o nó A se conecta ao nó B, eles executam um handshake `Noise`.
2.  Durante o handshake, eles trocam e verificam suas `PeerId`s e estabelecem chaves de sessão simétricas.
3.  A conexão é estabelecida, e todos os dados trocados através dela são criptografados com as chaves de sessão.

---

## 🛰️ 5. Comunicação P2P

### Transportes

*   A comunicação P2P utiliza múltiplos transportes do `libp2p`:
    *   **WebRTC**: Para comunicação direta entre navegadores.
    *   **WebSockets**: Para se conectar aos nós de bootstrap e relays.
    *   **Circuit Relay v2**: Permite que nós atrás de NATs restritivas se comuniquem através de um terceiro nó (relay).

### Canal de dados

*   **Streams Muxados**: `libp2p` usa multiplexadores como `yamux` para permitir múltiplos *streams* (canais de dados) sobre uma única conexão. Isso permite, por exemplo, ter um chat direto, uma transferência de arquivo e um ping ocorrendo simultaneamente entre os mesmos dois nós.
*   **Protocolos Customizados**: O chat direto é implementado sobre um protocolo customizado (`/secure-p2p-chat/direct/1.0.0`), enquanto o chat em grupo usa o protocolo `gossipsub`.

---

## 🧰 6. Stack Tecnológica

| Camada | Tecnologia / Biblioteca | Função principal |
| :--- | :--- | :--- |
| **UI/Frontend** | Vue 3 + Vite | SPA responsiva e modular. |
| **Estilo** | Tailwind CSS | Layout e design ágil. |
| **Comunicação P2P** | `libp2p` | Orquestra toda a stack de rede. |
| **Criptografia** | `libp2p-noise` | Criptografia de canal. |
| **Descoberta** | Bootstrap, PubSub | Descoberta de pares. |
| **Armazenamento local**| IndexedDB / localForage | Persistência de identidade. |

---

## 🧭 7. Estrutura Lógica de Módulos

```
src/
├─ components/         // Componentes da UI
├─ services/
│  ├─ networkService.js // Lógica central do libp2p
│  └─ storage.js        // Persistência local
├─ stores/
│  └─ network.js        // Estado da rede com Pinia
├─ views/              // Telas da aplicação
├─ App.vue
└─ main.js
```

---

## ⚙️ 8. Fluxo de Operação

1.  **Identidade**: Usuário abre o app, `networkService.js` gera ou carrega uma `PeerId`.
2.  **Conexão**: O nó `libp2p` se conecta aos nós de bootstrap.
3.  **Descoberta**: O nó se inscreve nos tópicos de descoberta e presença via `gossipsub`.
4.  **Chat**: Usuários online aparecem na lista. Clicar em um usuário abre um *stream* direto e criptografado para chat 1-para-1.
5.  **Grupos**: Criar um grupo significa criar um novo tópico no `gossipsub`. Mensagens são publicadas nesse tópico.

---

## 🔐 9. Segurança — Pilares

| Requisito | Implementação |
| :--- | :--- |
| **Criptografia de Canal** | `libp2p-noise` |
| **Autenticação** | `PeerId` (par de chaves criptográficas) |
| **Descoberta Segura** | A descoberta não expõe dados, apenas `PeerId`s. |
| **Armazenamento Local Seguro** | A chave privada da `PeerId` nunca sai do dispositivo. |
| **Zero Armazenamento de Mensagens** | Tudo trafega e vive somente nos dispositivos. |

---

## 🧭 10. Roadmap de Desenvolvimento (Sprints)

| Sprint | Entregável principal | Status |
| :--- | :--- | :--- |
| 1 | **Identidade e UI Inicial** | ✅ Concluído |
| 2 | **Nó `libp2p` com Bootstrap** | ✅ Concluído |
| 3 | **Descoberta de Pares e Presença com PubSub** | ✅ Concluído |
| 4 | **Chat Funcional (Direto e Grupo)** | ✅ Concluído |
| 5 | **Melhorias e Refatoração** | 🚧 Em andamento |

---

## 🧩 11. Possibilidades futuras de evolução

*   🚀 Implementar **criptografia E2EE para mensagens em grupo**, já que o `gossipsub` por si só não garante isso.
*   🌐 Implementar descoberta por **DHT (Kademlia)** para maior descentralização, reduzindo a dependência dos nós de bootstrap.
*   📱 Aplicativo mobile com mesmo modelo de segurança (usando `libp2p` em Go ou Rust com bindings).
*   🧪 Mecanismos de reputação e autenticação descentralizada (Web of Trust).

---

## ⚠️ 12. Considerações e limitações conhecidas

*   A comunicação depende da disponibilidade dos nós de bootstrap para a entrada na rede.
*   NAT traversal pode falhar em cenários de NAT simétrico duplo, embora o `dcutr` e o `circuit-relay` do `libp2p` mitiguem isso na maioria dos casos.
*   Mensagens de grupo no `gossipsub` são visíveis para qualquer um que conheça o tópico do grupo.

---

## ✅ 13. Resumo Final — Decisões-Chave

*   ✅ Arquitetura totalmente descentralizada com **`libp2p`**.
*   ✅ **`libp2p-noise`** como base da criptografia de canal.
*   ✅ Comunicação via múltiplos transportes (`WebRTC`, `WebSockets`).
*   ✅ **VueJS + Tailwind** para a interface.
*   ✅ Descoberta de pares e presença via **PubSub (`gossipsub`)**.
*   ✅ Foco em **segurança e descentralização como diferencial competitivo**.

---

📄 **Versão:** 2.0
📅 **Data:** 23/10/2025
👤 **Responsável:** Equipe de desenvolvimento / arquitetura do projeto P2P Chat Seguro
