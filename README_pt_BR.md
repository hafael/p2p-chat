# 🛡️ Chat P2P Seguro

O **Chat P2P Seguro** é um protótipo inovador de um sistema de comunicação digital que opera **sem a dependência de um servidor central**. Todas as conversas são diretas entre os dispositivos dos usuários (P2P), protegidas com **criptografia ponta a ponta (E2EE)** desde o design inicial.

O projeto foca em garantir confidencialidade, autonomia da rede e privacidade do usuário, oferecendo uma alternativa independente e transparente em um cenário de crescente preocupação com vigilância e coleta de dados.

## ✨ Características Principais

  * 🔐 **Criptografia Ponta a Ponta Real**: Utiliza a biblioteca `libsodium.js` para criptografia forte baseada em ChaCha20-Poly1305 ou AES-GCM. O handshake de chaves usa o algoritmo X25519.
  * 🌐 **Rede Descentralizada**: A comunicação ocorre diretamente entre os peers (P2P) via WebRTC DataChannel, eliminando a necessidade de um servidor central para a troca de mensagens.
  * 🤝 **Supernós Voluntários**: A descoberta de usuários é facilitada por supernós voluntários. Qualquer usuário pode atuar como um supernó para ajudar outros a se conectarem, mantendo a rede resiliente e descentralizada.
  * 👤 **Identidade Segura**: Cada usuário possui um par de chaves assimétricas gerado localmente. A chave privada nunca deixa o dispositivo do usuário.
  * 🔍 **Autenticação Forte**: A identidade dos contatos pode ser verificada através de um *fingerprint* (impressão digital) da chave pública, protegendo contra ataques de intermediário (*man-in-the-middle*).
  * 🕒 **Nenhuma Mensagem Armazenada**: Nenhuma mensagem ou metadado é armazenado em servidores. A comunicação é efêmera e vive apenas nos dispositivos dos participantes.
  * 🎨 **Interface Moderna**: Desenvolvido com VueJS 3, Vite e Tailwind CSS, priorizando uma experiência de usuário leve, responsiva e moderna.

## 🧠 Como Funciona: Arquitetura Híbrida

O projeto utiliza um modelo de rede híbrida:

1.  **P2P Direto**: Para a troca de mensagens, a comunicação é estabelecida diretamente entre os dispositivos dos usuários usando **WebRTC**.
2.  **Supernós Voluntários**: Para a descoberta de contatos, a rede utiliza supernós. Um supernó é simplesmente outro usuário da rede que opta por ajudar a conectar outros peers. Ele atua como um intermediário efêmero para a sinalização WebRTC, retransmitindo as "ofertas" e "respostas" necessárias para estabelecer a conexão P2P.
3.  **Bootstrapping Manual**: A conexão inicial a um supernó é feita através de um "código de convite" (sinalização manual), garantindo que não haja um ponto de entrada central fixo na rede.

Uma vez que a conexão P2P entre dois usuários de chat é estabelecida (com a ajuda do supernó), o supernó sai completamente da rota de comunicação.

## 🧰 Stack Tecnológica

| Camada | Tecnologia | Função |
| :--- | :--- | :--- |
| **UI/Frontend** | VueJS 3 + Vite | Single Page Application reativa e modular. |
| **Estilo** | Tailwind CSS + Headless UI | Design ágil, responsivo e componentes acessíveis. |
| **Comunicação P2P** | WebRTC + `simple-peer` | Canal de transporte direto entre clientes. |
| **Criptografia** | `libsodium.js` | Geração de chaves (X25519), derivação de chave de sessão e E2EE. |
| **Estado Global** | Pinia | Gerenciamento de estado centralizado para a aplicação Vue. |

## 🚀 Como Executar o Protótipo

### Pré-requisitos

  * Node.js (versão 18 ou superior)
  * NPM ou Yarn

### Passos

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/seu-usuario/chat-p2p-seguro.git
    cd chat-p2p-seguro
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Execute o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

4.  Abra seu navegador e acesse `http://localhost:5173`.

## 🧪 Testando a Conexão P2P (Modelo Híbrido)

Para testar a comunicação, você precisará de no mínimo **três** abas/navegadores: um **Supernó** e dois **Clientes**.

### 1\. Iniciar o Supernó

  * **Navegador A**: Crie sua identidade (ex: `supernode-host`).
  * Navegue até **Configurações**.
  * Na seção "Seja um Supernó Voluntário", ative o *switch*.
  * Copie o **código de convite** gerado.

### 2\. Conectar os Clientes ao Supernó

  * **Navegador B**: Crie sua identidade (ex: `cliente-alfa`).

  * Vá para **Configurações**.

  * Cole o código do **Navegador A** na seção "Conectar a um Supernó" e clique em **Conectar**.

  * Um **código de resposta** será gerado. Copie-o.

  * **De volta ao Navegador A**: Na seção "Seja um Supernó Voluntário", cole o código de resposta do **Navegador B** e clique em **Aceitar Cliente**. A conexão será estabelecida.

  * **Navegador C**: Crie sua identidade (ex: `cliente-beta`).

  * Repita o processo acima para conectar o **Navegador C** ao **Navegador A**.

### 3\. Iniciar o Chat

Uma vez que os clientes estejam conectados ao supernó, eles aparecerão na lista de "Contatos Online" um do outro. Agora, um cliente pode clicar no nome do outro para iniciar uma sessão de chat P2P criptografada.

## 🗺️ Roadmap Futuro

A arquitetura modular permite a expansão para recursos mais avançados:

  * [ ] Implementação do **Signal Protocol** completo (Double Ratchet).
  * [ ] Chat em grupo com distribuição de chave compartilhada.
  * [ ] Descoberta de supernós via DHT (Distributed Hash Table) para eliminar a necessidade de códigos de convite.
  * [ ] Versões para Mobile e Desktop com sincronização segura de chaves.
  * [ ] Mecanismos de reputação descentralizada (Web of Trust).

-----