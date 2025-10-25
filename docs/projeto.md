# 🛡️ Projeto Chat P2P Seguro — Descrição

O **Chat P2P Seguro** é um projeto inovador que propõe uma nova forma de comunicação digital: **conversas criptografadas, sem a dependência de um servidor central**. A aplicação utiliza o framework **`libp2p`** para construir uma rede totalmente descentralizada, combinando conexões diretas entre dispositivos com mecanismos automáticos de descoberta de pares, garantindo privacidade, segurança e resiliência.

O sistema foi projetado para funcionar de forma simples para o usuário final e, ao mesmo tempo, robusta do ponto de vista técnico. Cada usuário é identificado por uma `PeerId` criptográfica, gerada localmente. A comunicação acontece diretamente entre navegadores, utilizando **WebRTC** como camada de transporte e **`libp2p-noise`** para criptografia de canal, assegurando que nenhuma mensagem em trânsito possa ser lida por intermediários.

A descoberta de contatos é feita de forma automática. Ao se conectar à rede através de **nós de bootstrap** públicos, o aplicativo utiliza o protocolo **PubSub (`gossipsub`)** para encontrar outros usuários online. Isso elimina a necessidade de servidores centrais ou de coordenação manual.

A interface do sistema é desenvolvida com **VueJS** e **Tailwind CSS**, priorizando leveza, responsividade e facilidade de uso. A arquitetura modular do `libp2p` facilita a expansão futura para recursos avançados, como grupos com criptografia E2EE, descoberta via DHT e integração com outras redes P2P.

## ✨ Características principais

*   🔐 **Criptografia de Canal** com `libp2p-noise`.
*   🌐 **Rede Descentralizada** com `libp2p`, usando nós de bootstrap públicos.
*   👤 **Identidade portátil com chaves criptográficas e gestão de perfil**.
*   🖼️ **Perfil de usuário com nome e avatar**.
*   🕵️ **Descoberta de usuários por busca e solicitação de contato**.
*   💬 Comunicação direta P2P com **WebRTC**.
*   🧭 Interface moderna e responsiva em VueJS + Tailwind.
*   🕒 Nenhuma mensagem é armazenada — comunicação efêmera.
*   🔁 Estrutura preparada para evolução futura com protocolos avançados.

## 🧠 Proposta de valor

Em um cenário global de crescente preocupação com vigilância, coleta de dados e concentração de informações em servidores centrais, o Chat P2P Seguro oferece uma alternativa independente, privada e transparente.

A segurança não é um recurso adicional: **é o núcleo da aplicação**.
