# 📜 Protótipo de Aplicativo de Chat Descentralizado com Segurança Avançada

## 📌 1. Visão Geral do Projeto

Este projeto visa desenvolver um **protótipo funcional de um aplicativo de chat seguro e descentralizado**, com:

*   Comunicação **direta entre dispositivos** (P2P) gerenciada por `libp2p`;
*   **Descoberta de usuários por busca e solicitação de contato**;
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

*   **Escolha de Username**: Ao iniciar, o usuário escolhe um nome de usuário (username).
*   **Criação ou Autenticação**:
    *   **Nova Conta**: Se o username estiver disponível, o usuário pode criar uma nova identidade, gerando um novo par de chaves criptográficas (`PeerId`).
    *   **Autenticação**: Se o usuário já possui uma identidade, ele pode se autenticar fornecendo sua chave privada.
*   **Chave de Usuário**: Após a autenticação, o usuário pode baixar sua chave privada, que o identifica de forma única na rede P2P. Essa chave permite a portabilidade da identidade entre dispositivos.
*   **Perfil de Usuário**: Além do username, o usuário pode associar à sua identidade um **nome de exibição** e uma **imagem de avatar**.

### Descoberta

*   **Busca por Username**: Um usuário "A" pode buscar por um usuário "B" diretamente em sua interface, utilizando o username de "B".
*   **Solicitação de Contato**: Ao encontrar "B", "A" envia uma solicitação de contato. Essa solicitação é enviada por um canal seguro.
*   **Aceitação de Contato**: O usuário "B" recebe a solicitação e pode aceitá-la ou recusá-la. Ao aceitar, "A" é adicionado à lista de contatos de "B" e vice-versa.
*   **Comunicação Restrita a Contatos**: Um usuário só pode ver e se comunicar com os usuários que estão em sua lista de contatos. Qualquer tentativa de comunicação de um usuário não autorizado é bloqueada.
*   **Descoberta em Grupo**: Dentro de um tópico de grupo, os usuários podem visualizar a lista de membros. A partir dessa lista, um usuário pode iniciar uma solicitação de contato direto com outro membro do grupo.

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

1.  **Identidade e Autenticação**: 
    *   O usuário abre o app e escolhe um **username**.
    *   O sistema verifica a disponibilidade do username.
    *   O usuário pode **criar uma nova identidade** (gerando uma `PeerId`) ou **autenticar-se com uma chave existente**.
    *   Opcionalmente, o usuário define seu **nome de exibição** e **avatar**.
    *   O `networkService.js` carrega ou gera a `PeerId`.
2.  **Conexão**: O nó `libp2p` se conecta aos nós de bootstrap.
3.  **Busca e Adição de Contatos**:
    *   **Busca Direta**: O usuário A busca pelo username do usuário B.
    *   **Solicitação**: O usuário A envia uma solicitação de contato para B.
    *   **Aceitação**: O usuário B aceita a solicitação. Agora A e B são contatos.
4.  **Início do Chat**: Apenas com o contato estabelecido, um *stream* direto e criptografado pode ser aberto para a conversa. A interface exibe apenas os contatos que foram mutuamente aceitos.
5.  **Grupos e Descoberta em Grupo**:
    *   Um usuário pode entrar em um grupo (tópico `gossipsub`).
    *   Dentro do grupo, ele pode ver a lista de membros e iniciar solicitações de contato direto.

---

## 🔐 9. Segurança — Pilares

| Requisito | Implementação |
| :--- | :--- |
| **Criptografia de Canal** | `libp2p-noise` |
| **Autenticação** | `PeerId` (par de chaves criptográficas) |
| **Identidade Portátil com Chave** | Download da chave privada do usuário. |
| **Descoberta Segura** | A descoberta não expõe dados, apenas `PeerId`s. |
| **Comunicação Restrita a Contatos** | Validação de conexões recebidas contra a lista de contatos (firewall de aplicação). |
| **Armazenamento Local Seguro** | A chave privada da `PeerId` nunca sai do dispositivo. |
| **Zero Armazenamento de Mensagens** | Tudo trafega e vive somente nos dispositivos. |

---

## 🧭 10. Roadmap de Desenvolvimento (Sprints)

| Sprint | Entregável principal | Status |
| :--- | :--- | :--- |
| 1 | **Identidade e UI Inicial** | ✅ Concluído |
| 2 | **Nó `libp2p` com Bootstrap** | ✅ Concluído |
| 3 | **Descoberta de Pares por Anúncio de Presença (PubSub)** | ✅ Concluído |
| 4 | **Chat Funcional (Direto e Grupo)** | ✅ Concluído |
| 5 | **Gerenciamento de Identidade e Perfil** | 🚧 Em andamento |
| 6 | **Descoberta de Pares por Busca e Solicitação** | 🚧 Em andamento |
| 7 | **Melhorias de UX e Estabilidade** | 🚧 Em andamento |

---

## 🧩 11. Possibilidades futuras de evolução

*   🚀 Implementar **criptografia E2EE para mensagens em grupo**, já que o `gossipsub` por si só não garante isso.
*   🌐 Implementar descoberta por **DHT (Kademlia)** para maior descentralização, reduzindo a dependência dos nós de bootstrap.
*   🖼️ **Perfis de Usuário Editáveis e Descentralizados**: Permitir que os usuários atualizem suas informações de perfil (nome, avatar), que seriam propagadas pela rede de forma segura.
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
*   ✅ Descoberta de pares por **busca e solicitação de contato**.
*   ✅ Foco em **segurança e descentralização como diferencial competitivo**.

---

📄 **Versão:** 2.0
📅 **Data:** 23/10/2025
👤 **Responsável:** Equipe de desenvolvimento / arquitetura do projeto P2P Chat Seguro
