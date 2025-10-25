# 📄 Descrição Técnica — Projeto Chat P2P Seguro

## 1. Objetivo do Projeto

O **Chat P2P Seguro** é um protótipo de sistema de comunicação descentralizada, desenvolvido para demonstrar a viabilidade de um modelo de **mensageria segura sem servidor central**, baseado em conexões ponto a ponto (P2P) e **criptografia de canal**. O foco principal do projeto é garantir **confidencialidade**, **autonomia da rede** e **privacidade do usuário** desde o design inicial.

---

## 2. Arquitetura de Comunicação

### 2.1. Modelo de Rede com libp2p

A arquitetura é baseada no framework **`libp2p`**, que gerencia todo o ciclo de vida da comunicação P2P. O modelo inclui:

*   **Nós `libp2p`**: Cada cliente opera como um nó na rede `libp2p`, com uma identidade criptográfica única (`PeerId`).
*   **Bootstrapping**: Para entrar na rede, os nós se conectam a uma lista de **nós de bootstrap** públicos e estáveis. Esses nós servem como pontos de encontro para descobrir outros participantes.
*   **Descoberta de Pares por Solicitação Direta**: A descoberta de outros usuários é um processo manual e seguro, baseado em solicitação e aceitação.
    *   **Busca por Username**: Um usuário pode procurar outro diretamente pelo seu `username`.
    *   **Solicitação de Contato**: Um protocolo customizado (`/secure-p2p-chat/contact-request/1.0.0`) é usado para enviar uma solicitação de contato, que fica pendente até ser aceita.
    *   **Descoberta em Grupo**: Em um chat em grupo, os membros podem listar outros participantes e iniciar uma solicitação de contato a partir dali.
*   **Comunicação Direta e em Grupo**:
    *   **Chat 1-para-1**: A comunicação direta é estabelecida através de um *stream* seguro e criptografado, mas **somente é permitida com usuários da lista de contatos**. O sistema atua como um *firewall*, bloqueando tentativas de conexão de `PeerId`s não autorizadas.
    *   **Chat em Grupo**: As conversas em grupo utilizam o mecanismo de `gossipsub` (PubSub) do `libp2p`, onde as mensagens são publicadas em um tópico que representa o grupo.

### 2.2. Estabelecimento de Sessão

1.  **Inicialização e Autenticação**: 
    *   O cliente inicia e solicita ao usuário um **username**.
    *   O sistema verifica se já existe uma identidade local associada a esse username.
    *   **Novo Usuário**: Se não houver identidade, uma nova `PeerId` é gerada.
    *   **Usuário Existente**: Se houver uma identidade, o usuário pode se autenticar com ela ou importar uma chave existente.
    *   O usuário pode opcionalmente definir um **nome de exibição** e um **avatar**.
2.  **Conexão à Rede**: O nó se conecta aos nós de bootstrap para obter uma lista inicial de pares.
3.  **Início do Chat**: Após adicionar um contato através do fluxo de solicitação e aceitação, um cliente A pode usar o `libp2p` para abrir um *stream* direto com o `PeerId` do cliente B.
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
*   **Firewall de Aplicação por Lista de Contatos**: O sistema valida todas as conexões recebidas. Se a `PeerId` do solicitante não estiver na lista de contatos do usuário, a conexão é recusada, impedindo comunicação não autorizada.
*   **Modo Offline**: O usuário pode optar por aparecer como offline. Neste modo, o nó não responderá a novas solicitações de contato ou buscas de descoberta, mas ainda poderá receber mensagens de contatos existentes.
*   **Identidade Portátil**: O usuário pode exportar sua chave privada, permitindo a reutilização de sua identidade em diferentes dispositivos, de forma segura.
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
│  ├─ ChatView.vue
│  └─ SettingsView.vue
│
├─ App.vue
└─ main.js
```

---

## 6. Fluxo Operacional

1.  **Inicialização e Autenticação**: O usuário define um nome de usuário, cria uma nova identidade (`PeerId`) ou se autentica com uma chave existente. Opcionalmente, associa um nome e avatar ao perfil.
2.  **Bootstrapping**: O nó se conecta aos `BOOTSTRAP_NODES` para se conectar à rede.
3.  **Busca e Adição de Contatos**:
    *   O usuário A busca pelo username do usuário B.
    *   Ao encontrar, A envia uma solicitação de contato para B usando um protocolo específico.
    *   B recebe a notificação e aceita o contato. A partir deste momento, ambos podem iniciar conversas diretas.
4.  **Troca de Mensagens**:
    *   **Direta**: Um *stream* é aberto para o `PeerId` do destinatário, **desde que ele esteja na lista de contatos**. Tentativas de conexão de usuários não autorizados são bloqueadas. As mensagens são enviadas por este *stream* criptografado.
    *   **Em Grupo**: As mensagens são publicadas no tópico do `gossipsub` correspondente ao grupo. A descoberta de usuários para conversas diretas também pode ser feita a partir da lista de membros do grupo.
5.  **Configurações do Usuário**:
    *   O usuário pode navegar para a página de configurações.
    *   **Download da Chave**: É possível baixar a chave privada da conta para backup e portabilidade.
    *   **Modo Offline**: O usuário pode escolher aparecer como offline para a rede, bloqueando novas conexões e descobertas, enquanto mantém a capacidade de ler mensagens de contatos existentes.

6.  **Encerramento**: Ao fechar a aplicação, o nó `libp2p` é desligado.

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
| 1 | Identidade e registro de usuário | 🚧 Em andamento |
| 2 | Nó `libp2p` funcional com bootstrap | ✅ Concluído |
| 3 | Descoberta de pares por anúncio de presença (PubSub) | ✅ Concluído |
| 4 | Interface de chat segura (direto e grupo) | ✅ Concluído |
| 5 | Gerenciamento de Chaves e Perfil | 🚧 Em andamento |
| 6 | Descoberta de pares por busca e solicitação | 🚧 Em andamento |
| 7 | Melhorias de UX e estabilidade | 🚧 Em andamento |

---

## 9. Extensões Futuras

*   Implementação de criptografia E2EE para mensagens em grupo.
*   Uso de DHT (Distributed Hash Table) para uma descoberta de pares mais robusta.
*   **Perfis de Usuário Descentralizados**: Permitir a edição e propagação segura de informações de perfil (nome, avatar) pela rede.
*   Mobile e desktop com sincronização segura de identidade.
*   Mecanismos de reputação e autenticação descentralizada (Web of Trust).

---

## 10. Resumo Técnico

*   **Modelo descentralizado** com `libp2p`.
*   **Criptografia de canal nativa** com `libp2p-noise`.
*   **Zero armazenamento de mensagens** em servidores.
*   **Identidade baseada em `PeerId`** e descoberta por **busca e solicitação de contato**.
*   Arquitetura modular, expansível e de fácil manutenção.

---

📅 **Data:** 23/10/2025
👨‍💻 **Responsável:** Equipe de Arquitetura e Desenvolvimento
📜 **Versão:** 2.0 — Documento Técnico de Descrição (Pós-libp2p)
