# 🛡️ Secure P2P Chat

**Secure P2P Chat** is an innovative prototype of a digital communication system that operates **without dependency on a central server**. All conversations are direct between user devices (P2P), protected with **end-to-end encryption (E2EE)** from the initial design.

The project focuses on ensuring confidentiality, network autonomy, and user privacy, offering an independent and transparent alternative in a landscape of growing concern over surveillance and data collection.

## ✨ Key Features

  * 🔐 **End-to-End Encryption**: Cryptography is handled by `libp2p-noise`, ensuring secure channels. Direct messages are encrypted, though group messages via pubsub are not end-to-end encrypted in the current implementation.
  * 🌐 **Decentralized Network with libp2p**: The application uses `libp2p` to create a robust, decentralized network. It connects to public bootstrap nodes to discover other peers.
  * 🤝 **Peer Discovery**: Peer discovery is automatic. The application uses `pubsub-peer-discovery` over a specific topic to find other users of the chat application.
  * 👤 **Secure Identity**: Each user is identified by a `libp2p` `PeerId`, which is generated locally and is unique to the user.
  * 💬 **Direct and Group Chats**: Supports both direct (1-to-1) chats over encrypted streams and group chats using `libp2p`'s `gossipsub` (pubsub) mechanism.
  * 🕒 **Zero Stored Messages**: No messages or metadata are stored on servers. Communication is ephemeral and exists only on the participants' devices.
  * 🎨 **Modern Interface**: Developed with VueJS 3, Vite, and Tailwind CSS, prioritizing a lightweight, responsive, and modern user experience.

## 🧠 How It Works: libp2p Architecture

The project leverages the power of `libp2p` to create a fully decentralized chat application. Here's how it works:

1.  **Initialization**: When the user starts the application, a `libp2p` node is created in the browser. This node has a unique `PeerId` that identifies the user on the network.
2.  **Bootstrapping**: The `libp2p` node connects to a set of public bootstrap nodes. These nodes help new peers discover other peers on the network.
3.  **Peer Discovery**: Once connected to the bootstrap nodes, the application uses `libp2p`'s `pubsub-peer-discovery` mechanism. It subscribes to a specific topic (`/libp2p/example-chat/peer-discovery`) to find other users of the same application.
4.  **Presence**: The application uses `libp2p`'s `gossipsub` (pubsub) to broadcast and receive presence information. This allows users to see who is online.
5.  **Direct Chat**: For one-to-one conversations, a direct, encrypted stream is established between two peers using the `libp2p-noise` security protocol.
6.  **Group Chat**: Group conversations are handled using `libp2p`'s `gossipsub`. Users subscribe to a topic that represents the group, and messages are broadcast to all subscribers.

## 🧰 Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **UI/Frontend** | VueJS 3 + Vite | Reactive and modular Single Page Application. |
| **Styling** | Tailwind CSS + Headless UI | Agile, responsive design and accessible components. |
| **P2P Communication** | `libp2p` | Handles peer discovery, transport (WebRTC, WebSockets), and stream multiplexing. |
| **Cryptography** | `libp2p-noise` | Provides encrypted, authenticated communication channels. |
| **Global State** | Pinia | Centralized state management for the Vue application. |

## 🚀 How to Run the Prototype

### Prerequisites

  * Node.js (version 18 or higher)
  * NPM or Yarn

### Steps

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/secure-p2p-chat.git
    cd secure-p2p-chat
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to `http://localhost:5173`.

## 🧪 Testing the P2P Connection

To test the communication, you will need a minimum of **two** browser tabs/windows.

1.  **Open two browser tabs/windows** and navigate to `http://localhost:5173`.
2.  **Create a different identity** in each tab (e.g., `user-a` and `user-b`).
3.  **Wait a few moments** for the `libp2p` nodes to discover each other through the bootstrap nodes and pubsub.
4.  Once discovered, the other user will appear in the "Online Contacts" list.
5.  Click on the other user's name to start a direct, end-to-end encrypted chat.
6.  You can also create groups and invite other users to join.

## 🗺️ Future Roadmap

The modular architecture allows for expansion to more advanced features:

  * [ ] Implement the full **Signal Protocol** (Double Ratchet).
  * [ ] Group chat with a shared key distribution scheme.
  * [ ] Supernode discovery via DHT (Distributed Hash Table) to eliminate the need for invite codes.
  * [ ] Mobile and Desktop versions with secure key synchronization.
  * [ ] Decentralized reputation mechanisms (Web of Trust).