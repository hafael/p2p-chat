# 📄 Descrição Técnica — Projeto Chat P2P Seguro

## 1. Objetivo do Projeto

O **Chat P2P Seguro** é um protótipo de sistema de comunicação descentralizada, desenvolvido para demonstrar a viabilidade de um modelo de **mensageria segura sem servidor central**, baseado em conexões ponto a ponto (P2P) e **criptografia de canal**. O foco principal do projeto é garantir **confidencialidade**, **autonomia da rede** e **privacidade do usuário** desde o design inicial.

---

## 2. Arquitetura de Comunicação

### 2.1. Modelo de Rede com libp2p

A arquitetura é baseada no framework **`libp2p`**, que gerencia todo o ciclo de vida da comunicação P2P. O modelo inclui:

*   **Nós `libp2p`**: Cada cliente opera como um nó na rede `libp2p`, com uma identidade criptográfica única (`PeerId`).
*   **Bootstrapping**: Para entrar na rede, os nós se conectam a uma lista de **nós de bootstrap** públicos e estáveis. Esses nós servem como pontos de encontro para descobrir outros participantes.
*   **Descoberta de Pares (Peer Discovery)**: A descoberta de outros usuários do chat é feita através do **`pubsub-peer-discovery`**. Os nós se inscrevem em um tópico específico do PubSub; ao encontrar outros inscritos no mesmo tópico, eles se adicionam à lista de contatos online.
*   **Comunicação Direta e em Grupo**:
    *   **Chat 1-para-1**: A comunicação direta é estabelecida através de um *stream* seguro e criptografado usando o protocolo `/secure-p2p-chat/direct/1.0.0`.
    *   **Chat em Grupo**: As conversas em grupo utilizam o mecanismo de `gossipsub` (PubSub) do `libp2p`, onde as mensagens são publicadas em um tópico que representa o grupo.

### 2.2. Estabelecimento de Sessão

1.  **Inicialização**: O cliente cria uma instância do `libp2p`, que automaticamente gera uma `PeerId`.
2.  **Conexão à Rede**: O nó se conecta aos nós de bootstrap para obter uma lista inicial de pares.
3.  **Descoberta via PubSub**: O nó se inscreve nos tópicos de descoberta de pares e de presença para encontrar outros usuários online.
4.  **Início do Chat**:
    *   Para um chat direto, o cliente A usa o `libp2p` para abrir um *stream* direto com o `PeerId` do cliente B usando o protocolo de chat.
    *   Para um chat em grupo, o cliente publica mensagens no tópico do grupo.
5.  A comunicação flui através dos transportes configurados no `libp2p` (como WebRTC e WebSockets), com streams multiplexados e canais de comunicação criptografados.

---

## 3. Segurança e Criptografia

### 3.1. Bibliotecas e Padrões

*   **`libp2p`**: Framework modular que compõe a stack de rede.
*   **`@chainsafe/libp2p-noise`**: Implementação do protocolo de handshake de criptografia de canal [Noise](https://noiseprotocol.org/). Garante que todas as conexões entre pares sejam criptografadas, autenticadas e resistentes a tampering.
*   **`@chainsafe/libp2p-yamux`**: Multiplexador de *streams* que permite que múltiplos fluxos de comunicação independentes ocorram sobre uma única conexão TCP ou WebRTC.

### 3.2. Propriedades de Segurança

*   **Criptografia de Canal**: Todas as conexões são criptografadas de ponta a ponta entre os nós usando `libp2p-noise`. Isso impede que intermediários (incluindo nós de relay) leiam o conteúdo do tráfego.
*   **Autenticação de Pares**: A identidade de cada par é verificada através de sua `PeerId` durante o handshake do Noise.
*   **Resiliência a Falhas**: A natureza descentralizada do `libp2p` significa que a rede pode continuar a operar mesmo que alguns nós (exceto os de bootstrap, que são múltiplos) fiquem offline.
*   **Zero Retenção de Dados**: Nenhuma mensagem é armazenada em servidores. A comunicação é efêmera e reside apenas nos dispositivos dos participantes.

---

## 4. Stack Tecnológica

| Camada | Tecnologia | Função |
| :--- | :--- | :--- |
| **Frontend UI** | VueJS 3 + Vite | SPA responsiva, componentes modulares. |
| **Estilo** | Tailwind CSS | Design e estilização ágil. |
| **Comunicação P2P** | `libp2p` | Orquestra descoberta, transporte, criptografia e multiplexação. |
| **Transportes P2P** | WebRTC, WebSockets | Camadas de transporte para comunicação no navegador. |
| **Criptografia** | `libp2p-noise` | Handshake e criptografia de canal. |
| **Descoberta** | Bootstrap, PubSub | Descoberta de outros pares na rede. |
| **Armazenamento Local**| IndexedDB + localForage | Persistência de identidade e configurações. |

---

## 5. Estrutura de Componentes

```
src/
├─ components/
│  ├─ ChatWindow.vue
│  ├─ ContactList.vue
│  └─ UsernameRegister.vue
│
├─ services/
│  ├─ crypto.js
│  ├─ networkService.js  // Lógica principal do libp2p
│  └─ storage.js
│
├─ stores/
│  └─ network.js         // Estado da rede (Pinia)
│
├─ views/
│  ├─ LoginView.vue
│  └─ ChatView.vue
│
├─ App.vue
└─ main.js
```

---

## 6. Fluxo Operacional

1.  **Inicialização**: O usuário define um nome de usuário. O `networkService.js` inicializa um nó `libp2p`.
2.  **Bootstrapping**: O nó se conecta aos `BOOTSTRAP_NODES` para descobrir a rede.
3.  **Descoberta de Pares**: O nó se inscreve no tópico `PUBSUB_PEER_DISCOVERY_TOPIC` e começa a descobrir outros usuários.
4.  **Anúncio de Presença**: O nó publica periodicamente uma mensagem de "online" no tópico de presença (`PRESENCE_TOPIC`), informando seu nome de usuário.
5.  **Troca de Mensagens**:
    *   **Direta**: Um *stream* é aberto para o `PeerId` do destinatário usando o `DIRECT_CHAT_PROTOCOL`. As mensagens são enviadas por este *stream* criptografado.
    *   **Em Grupo**: As mensagens são publicadas no tópico do `gossipsub` correspondente ao grupo.
6.  **Encerramento**: Ao fechar a aplicação, o nó `libp2p` é desligado, e uma mensagem "offline" pode ser enviada.

---

## 7. Considerações de Segurança

*   O tráfego entre os nós é totalmente criptografado. Nós de relay ou bootstrap não podem inspecionar o conteúdo.
*   A identidade é baseada na `PeerId` criptográfica, que é mais segura que usernames simples.
*   A comunicação em grupo via `pubsub` não é criptografada de ponta a ponta por padrão no `gossipsub`. Embora o *transporte* seja criptografado, qualquer um inscrito no tópico pode ler as mensagens. Uma camada adicional de criptografia seria necessária para grupos seguros.
*   A comunicação é vulnerável apenas se um dos endpoints estiver comprometido (risco local, não estrutural).

---

## 8. Roadmap Técnico (Versão Inicial)

| Fase | Entrega Técnica | Status |
| :--- | :--- | :--- |
| 1 | Identidade e registro de usuário | ✅ Concluído |
| 2 | Nó `libp2p` funcional com bootstrap | ✅ Concluído |
| 3 | Descoberta de pares via PubSub | ✅ Concluído |
| 4 | Interface de chat segura (direto e grupo) | ✅ Concluído |
| 5 | Melhorias de UX e estabilidade | 🚧 Em andamento |

---

## 9. Extensões Futuras

*   Implementação de criptografia E2EE para mensagens em grupo.
*   Uso de DHT (Distributed Hash Table) para uma descoberta de pares mais robusta.
*   Mobile e desktop com sincronização segura de identidade.
*   Mecanismos de reputação e autenticação descentralizada (Web of Trust).

---

## 10. Resumo Técnico

*   **Modelo descentralizado** com `libp2p`.
*   **Criptografia de canal nativa** com `libp2p-noise`.
*   **Zero armazenamento de mensagens** em servidores.
*   **Identidade baseada em `PeerId`** e descoberta via PubSub.
*   Arquitetura modular, expansível e de fácil manutenção.

---

📅 **Data:** 23/10/2025
👨‍💻 **Responsável:** Equipe de Arquitetura e Desenvolvimento
📜 **Versão:** 2.0 — Documento Técnico de Descrição (Pós-libp2p)
