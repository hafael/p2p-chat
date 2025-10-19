# 🛡️ Projeto Chat P2P Seguro — Descrição

O **Chat P2P Seguro** é um projeto inovador que propõe uma nova forma de comunicação digital: **conversas criptografadas ponta a ponta, sem a dependência de um servidor central**. A aplicação utiliza um modelo de rede híbrida, combinando conexões diretas entre dispositivos com supernós voluntários para a descoberta temporária de usuários, garantindo privacidade, segurança e descentralização.

O sistema foi projetado para funcionar de forma simples para o usuário final e, ao mesmo tempo, robusta do ponto de vista técnico. Cada usuário gera localmente um par de chaves criptográficas, utilizado para autenticação e estabelecimento de conexões seguras. A comunicação acontece diretamente entre navegadores, utilizando **WebRTC** como camada de transporte e **libsodium** para criptografia avançada ponta a ponta, assegurando que nenhuma mensagem seja armazenada ou interceptada por intermediários.

A descoberta de contatos é feita por meio de **usernames públicos**, resolvidos de forma efêmera por supernós — instâncias voluntárias que não armazenam dados sensíveis e expiram registros automaticamente. Assim, o supernó atua apenas como ponte de sinalização inicial, desaparecendo completamente da rota após o handshake seguro.

A interface do sistema é desenvolvida com **VueJS** e **Tailwind CSS**, priorizando leveza, responsividade e facilidade de uso. A arquitetura modular facilita a expansão futura para recursos avançados, como grupos com criptografia compartilhada, autenticação descentralizada e integração com redes federadas.

## ✨ Características principais

* 🔐 **Criptografia ponta a ponta real** com libsodium.
* 🌐 **Rede descentralizada** com supernós voluntários.
* 👤 Descoberta de usuários via username.
* 💬 Comunicação direta P2P com WebRTC.
* 🧭 Interface moderna e responsiva em VueJS + Tailwind.
* 🕒 Nenhuma mensagem é armazenada — comunicação efêmera.
* 🔁 Estrutura preparada para evolução futura com protocolos avançados.

## 🧠 Proposta de valor

Em um cenário global de crescente preocupação com vigilância, coleta de dados e concentração de informações em servidores centrais, o Chat P2P Seguro oferece uma alternativa independente, privada e transparente.
A segurança não é um recurso adicional: **é o núcleo da aplicação**.