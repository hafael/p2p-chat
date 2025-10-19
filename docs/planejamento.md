# 📜 Protótipo de Aplicativo de Chat Descentralizado com Segurança Avançada

## 📌 1. Visão Geral do Projeto

Este projeto visa desenvolver um **protótipo funcional de um aplicativo de chat seguro e descentralizado**, com:

* Comunicação **direta entre dispositivos** (P2P);
* **Descoberta de usuários via usernames**;
* Uso de **supernós voluntários** para sinalização temporária;
* **Criptografia ponta a ponta avançada** (libsodium);
* Interface moderna em **VueJS + Tailwind**;
* Arquitetura extensível para suportar escalabilidade e upgrades de segurança.

A proposta comercial é **“segurança forte e descentralização”** como argumento de valor central.

---

## 🧭 2. Arquitetura de Rede

### 📡 Modelo híbrido com supernós

* Não há servidor central fixo.
* **Supernós** são nós voluntários (usuários ou instâncias temporárias) que:

  * Mantêm uma **tabela efêmera** com `username → chave pública + sinalização`.
  * Não armazenam mensagens ou dados sensíveis.
  * Expiram registros após um tempo configurado.
* Usuários podem alternar entre supernós para descoberta.

```
[ Usuário A ] ⇄ (signaling) ⇄ [ Supernó ] ⇄ (signaling) ⇄ [ Usuário B ]
[ Usuário A ] ⇄ (P2P WebRTC + E2EE) ⇄ [ Usuário B ]
```

---

## 🧠 3. Identidade e Descoberta de Usuários

### Identidade

* Cada usuário gera um **par de chaves X25519** no primeiro acesso.
* A chave pública é vinculada ao `username` escolhido.
* Fingerprint da chave pública serve para validação mútua.

### Descoberta

* Usuários registram `username + chave pública + dados de sinalização` em um supernó.
* Para iniciar uma conversa, um cliente consulta um supernó para resolver `username → chave pública`.
* A comunicação efetiva é estabelecida **diretamente** entre os peers.

---

## 🔐 4. Criptografia

### Tecnologia escolhida: **libsodium.js**

* **Motivo:** alto nível de segurança, maturidade, integração simples e suporte a forward secrecy parcial.
* Usa **X25519** para derivação de chaves de sessão.
* Usa **crypto_secretbox_easy** (ChaCha20 ou AES-GCM) para criptografar mensagens.

### Handshake de sessão

1. Cada peer gera (ou usa) sua chave X25519.
2. Após descoberta de chave pública, ambos executam handshake libsodium.
3. Derivam chaves de sessão simétricas (`sharedTx` / `sharedRx`).
4. A conexão P2P via WebRTC é estabelecida.
5. Toda mensagem trafega criptografada.

### Rekeying

* Periodicamente ou a cada reconexão, pares de chaves efêmeras são gerados.
* Reduz impacto em caso de comprometimento.

---

## 🛰️ 5. Comunicação P2P

### Sinalização

* A sinalização para iniciar conexão WebRTC usa:

  * Supernós voluntários.
  * Dados de oferta e resposta WebRTC (SDP/ICE).
* Após handshake, supernó não participa mais da comunicação.

### Canal de dados

* WebRTC DataChannel.
* Apenas mensagens criptografadas trafegam.
* Suporte inicial a chat 1:1.

---

## 🧰 6. Stack Tecnológica

| Camada              | Tecnologia / Biblioteca      | Função principal                |
| ------------------- | ---------------------------- | ------------------------------- |
| UI/Frontend         | Vue 3 + Vite                 | SPA responsiva e modular        |
| Estilo              | Tailwind CSS                 | Layout e design ágil            |
| Comunicação P2P     | WebRTC + simple-peer         | Canal direto entre clientes     |
| Criptografia        | libsodium.js                 | E2EE, handshake, rekeying       |
| Sinalização         | WebSocket / Fetch (Supernós) | Descoberta e troca de metadados |
| Armazenamento local | IndexedDB / localForage      | Chaves, sessões e contatos      |

---

## 🧭 7. Estrutura Lógica de Módulos

```
src/
├─ components/
│  ├─ ChatWindow.vue          // Interface de mensagens
│  ├─ ContactList.vue         // Lista de contatos e usernames
│  ├─ UsernameRegister.vue    // Registro de identidade
│  └─ SupernodeControl.vue    // Controles para supernó
│
├─ services/
│  ├─ crypto.js               // libsodium: geração e handshake de chaves
│  ├─ signaling.js            // Comunicação com supernó
│  ├─ p2p.js                  // Conexões WebRTC
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

## ⚙️ 8. Fluxo de Operação

1. **Identidade:** usuário abre o app → chave X25519 é gerada → username escolhido.
2. **Registro:** app envia `username + publicKey + signaling info` ao supernó.
3. **Descoberta:** outro usuário consulta supernó → recebe publicKey do destino.
4. **Handshake:** os dois lados derivam chave de sessão via libsodium.
5. **Conexão WebRTC:** canal de dados P2P é estabelecido.
6. **Mensagens:** trafegam apenas criptografadas com `sharedTx` / `sharedRx`.
7. **Rekeying:** a chave de sessão pode ser renovada periodicamente.

---

## 🔐 9. Segurança — Pilares

| Requisito                       | Implementação                                |
| ------------------------------- | -------------------------------------------- |
| E2EE                            | libsodium (X25519 + Secretbox)               |
| Autenticação                    | Fingerprint da chave pública                 |
| Descoberta segura               | Supernós só armazenam chave pública e oferta |
| Forward Secrecy parcial         | Rekeying periódico                           |
| Armazenamento local seguro      | IndexedDB + chave privada local              |
| Zero armazenamento de mensagens | Tudo trafega e vive somente nos dispositivos |

---

## 🧭 10. Roadmap de Desenvolvimento (Sprints)

| Sprint | Entregável principal                                                       | Detalhes técnicos                                  |
| ------ | -------------------------------------------------------------------------- | -------------------------------------------------- |
| 1      | **Identidade segura**                                                      | Geração de chave, registro de username, UI inicial |
| 2      | **Supernó funcional**                                                      | Tabela efêmera, API de resolução de usernames      |
| 3      | **Conexão P2P + Handshake libsodium**                                      | Sessão segura entre dois navegadores               |
| 4      | **Chat funcional com E2EE**                                                | Interface Vue + mensagens criptografadas           |
| 5      | **Melhorias**: rekeying automático, fingerprint UX, fallback TURN opcional | Robustez e experiência do usuário                  |

---

## 🧩 11. Possibilidades futuras de evolução

* 🚀 Adotar **Signal Protocol** completo para Double Ratchet.
* 🔁 Comunicação em grupos com esquema de chaves compartilhadas.
* 🌐 Implementar descoberta por DHT para eliminar supernós.
* 📱 Aplicativo mobile com mesmo modelo de segurança.
* 🧪 Mecanismos de reputação e autenticação descentralizada (Web of Trust).
* 📡 Bridge com redes externas (Matrix / XMPP) mantendo E2EE.

---

## ⚠️ 12. Considerações e limitações conhecidas

* NAT traversal pode falhar em alguns cenários → TURN opcional.
* Supernós ainda são **pontos de indexação**, embora efêmeros (mitigação: rotacionar e permitir múltiplos).
* Username não tem unicidade global garantida (a resolver em versões futuras).
* Rekeying é manual no protótipo, mas automatizável.

---

## ✅ 13. Resumo Final — Decisões-Chave

* ✅ Arquitetura híbrida com **supernós voluntários** (sem servidor central fixo).
* ✅ **libsodium.js** como base de E2EE (mais seguro e simples que Signal Protocol para o protótipo).
* ✅ Comunicação via **WebRTC P2P** com handshake seguro.
* ✅ **VueJS + Tailwind** para a interface.
* ✅ Protocolo de descoberta por username via supernó.
* ✅ Foco em **segurança como diferencial competitivo**.

---

📄 **Versão:** 1.0
📅 **Data:** 18/10/2025
👤 **Responsável:** Equipe de desenvolvimento / arquitetura do projeto P2P Chat Seguro