# 📄 Descrição Técnica — Projeto Chat P2P Seguro

## 1. Objetivo do Projeto

O **Chat P2P Seguro** é um protótipo de sistema de comunicação descentralizada, desenvolvido para demonstrar a viabilidade de um modelo de **mensageria segura sem servidor central**, baseado em conexões ponto a ponto (P2P) e **criptografia ponta a ponta**.
O foco principal do projeto é garantir **confidencialidade**, **autonomia da rede** e **privacidade do usuário** desde o design inicial.

---

## 2. Arquitetura de Comunicação

### 2.1. Modelo de Rede Híbrida

A arquitetura adota um modelo híbrido, combinando:

* **P2P direto** entre clientes para troca de mensagens;
* **Supernós voluntários** para sinalização e descoberta de usuários;
* Ausência de servidor central fixo.

Os supernós atuam apenas como **intermediários efêmeros de descoberta** (username → chave pública + sinalização), sem armazenar mensagens, histórico ou dados persistentes.
Após o handshake inicial, toda a comunicação ocorre exclusivamente entre os dispositivos dos usuários.

### 2.2. Estabelecimento de Sessão

1. O usuário A resolve o `username` de B via supernó.
2. Obtém a **chave pública** de B e os dados de sinalização.
3. Inicia o handshake criptográfico para derivar uma chave de sessão compartilhada.
4. A conexão P2P é estabelecida via **WebRTC DataChannel**.
5. Toda mensagem trafega cifrada.

---

## 3. Segurança e Criptografia

### 3.1. Bibliotecas e Padrões

* **libsodium.js** — biblioteca de criptografia de alto nível para:

  * Geração de pares de chave X25519.
  * Derivação de chave de sessão segura (Diffie-Hellman).
  * Criptografia simétrica com `crypto_secretbox_easy` (ChaCha20-Poly1305 ou AES-GCM).
* **Web Crypto API** — suporte nativo complementar no navegador.

### 3.2. Protocolo de Handshake

* Cada cliente possui um par de chaves assimétricas persistido localmente.
* Durante a conexão, pares efêmeros podem ser gerados para aumentar o sigilo (forward secrecy parcial).
* O handshake ocorre diretamente entre os peers após a sinalização, derivando uma chave de sessão simétrica usada para cifrar todas as mensagens.

### 3.3. Propriedades de Segurança

* **End-to-End Encryption (E2EE)**: nenhum supernó tem acesso ao conteúdo.
* **Autenticação mútua** via fingerprint da chave pública.
* **Rekeying opcional** para renovação periódica de chaves de sessão.
* **Zero retenção de dados**: nenhuma mensagem é armazenada em servidores.

---

## 4. Stack Tecnológica

| Camada              | Tecnologia                  | Função                                |
| ------------------- | --------------------------- | ------------------------------------- |
| Frontend UI         | VueJS 3 + Vite              | SPA responsiva, componentes modulares |
| Estilo              | Tailwind CSS                | Design e estilização ágil             |
| Comunicação P2P     | WebRTC + simple-peer        | Canal de transporte direto            |
| Criptografia        | libsodium.js                | Handshake e E2EE                      |
| Sinalização         | WebSocket / HTTP (supernós) | Descoberta e conexão inicial          |
| Armazenamento local | IndexedDB + localForage     | Chaves, contatos, preferências        |

---

## 5. Estrutura de Componentes

```
src/
├─ components/
│  ├─ ChatWindow.vue          // Interface de chat
│  ├─ ContactList.vue         // Lista de usernames
│  ├─ UsernameRegister.vue    // Registro e fingerprint
│  └─ SupernodeControl.vue    // Interface de controle de supernó
│
├─ services/
│  ├─ crypto.js               // Operações libsodium
│  ├─ signaling.js            // Comunicação com supernós
│  ├─ p2p.js                  // Sessão WebRTC
│  └─ storage.js              // Persistência local
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

1. **Inicialização** — Geração de par de chaves local (X25519).
2. **Registro de identidade** — Username + chave pública enviados ao supernó.
3. **Descoberta** — Resolução de username → chave pública do destinatário.
4. **Handshake** — Derivação de chave de sessão via libsodium.
5. **Estabelecimento de canal P2P** — WebRTC DataChannel.
6. **Troca de mensagens** — E2EE com chaves derivadas.
7. **Encerramento** — Sessão termina sem deixar dados persistidos no servidor.

---

## 7. Considerações de Segurança

* O supernó não tem acesso às mensagens ou às chaves de sessão.
* O tráfego permanece cifrado em toda a rota de comunicação.
* Os pares de chaves privados **nunca deixam o dispositivo** do usuário.
* A comunicação é vulnerável apenas se um dos endpoints estiver comprometido (risco local, não estrutural).
* A autenticação de usuários pode ser fortalecida com fingerprint ou QR code.

---

## 8. Roadmap Técnico (Versão Inicial)

| Fase | Entrega Técnica                         | Componentes                        |
| ---- | --------------------------------------- | ---------------------------------- |
| 1    | Identidade e registro de usuário        | crypto.js, UsernameRegister.vue    |
| 2    | Supernó funcional                       | signaling.js, SupernodeControl.vue |
| 3    | Handshake criptográfico + WebRTC        | crypto.js, p2p.js                  |
| 4    | Interface de chat segura                | ChatWindow.vue, ContactList.vue    |
| 5    | Rekeying e melhorias de UX de segurança | crypto.js, ajustes de UI           |

---

## 9. Extensões Futuras

* Implementação do **Signal Protocol** completo (Double Ratchet).
* Grupos com distribuição de chave compartilhada.
* Uso de DHT (Distributed Hash Table) para eliminar supernós.
* Mobile e desktop com sincronização segura.
* Assinaturas verificáveis e reputação descentralizada.

---

## 10. Resumo Técnico

* **Modelo descentralizado** com supernós efêmeros.
* **Criptografia ponta a ponta nativa** (libsodium + WebRTC).
* **Zero armazenamento de mensagens** ou metadados persistentes.
* **Identidade baseada em chaves públicas** e usernames resolvidos dinamicamente.
* Arquitetura modular, expansível e de fácil manutenção.

---

📅 **Data:** 18/10/2025
👨‍💻 **Responsável:** Equipe de Arquitetura e Desenvolvimento
📜 **Versão:** 1.0 — Documento Técnico de Descrição