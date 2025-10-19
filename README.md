# 🛡️ Secure P2P Chat

**Secure P2P Chat** is an innovative prototype of a digital communication system that operates **without dependency on a central server**. All conversations are direct between user devices (P2P), protected with **end-to-end encryption (E2EE)** from the initial design.

The project focuses on ensuring confidentiality, network autonomy, and user privacy, offering an independent and transparent alternative in a landscape of growing concern over surveillance and data collection.

## ✨ Key Features

  * 🔐 **True End-to-End Encryption**: Utilizes the `libsodium.js` library for strong cryptography based on ChaCha20-Poly1305 or AES-GCM. The key exchange handshake uses the X25519 algorithm.
  * 🌐 **Decentralized Network**: Communication occurs directly between peers (P2P) via WebRTC DataChannel, eliminating the need for a central server for message exchange.
  * 🤝 **Volunteer Supernodes**: User discovery is facilitated by volunteer supernodes. Any user can act as a supernode to help others connect, keeping the network resilient and decentralized.
  * 👤 **Secure Identity**: Each user possesses an asymmetric key pair generated locally. The private key never leaves the user's device.
  * 🔍 **Strong Authentication**: The identity of contacts can be verified via a public key *fingerprint*, protecting against man-in-the-middle attacks.
  * 🕒 **Zero Stored Messages**: No messages or metadata are stored on servers. Communication is ephemeral and exists only on the participants' devices.
  * 🎨 **Modern Interface**: Developed with VueJS 3, Vite, and Tailwind CSS, prioritizing a lightweight, responsive, and modern user experience.

## 🧠 How It Works: Hybrid Architecture

The project uses a hybrid network model:

1.  **Direct P2P**: For message exchange, communication is established directly between user devices using **WebRTC**.
2.  **Volunteer Supernodes**: For contact discovery, the network utilizes supernodes. A supernode is simply another user on the network who chooses to help connect other peers. It acts as an ephemeral intermediary for WebRTC signaling, relaying the "offers" and "answers" needed to establish the P2P connection.
3.  **Manual Bootstrapping**: The initial connection to a supernode is made via an "invite code" (manual signaling), ensuring there is no fixed central entry point to the network.

Once the P2P connection between two chat users is established (with the help of the supernode), the supernode is completely removed from the communication path.

## 🧰 Tech Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **UI/Frontend** | VueJS 3 + Vite | Reactive and modular Single Page Application. |
| **Styling** | Tailwind CSS + Headless UI | Agile, responsive design and accessible components. |
| **P2P Communication** | WebRTC + `simple-peer` | Direct transport channel between clients. |
| **Cryptography** | `libsodium.js` | Key generation (X25519), session key derivation, and E2EE. |
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

## 🧪 Testing the P2P Connection (Hybrid Model)

To test the communication, you will need a minimum of **three** browser tabs/windows: one **Supernode** and two **Clients**.

### 1\. Start the Supernode

  * **Browser A**: Create your identity (e.g., `supernode-host`).
  * Navigate to **Settings**.
  * In the "Act as a Volunteer Supernode" section, enable the switch.
  * Copy the generated **invite code**.

### 2\. Connect Clients to the Supernode

  * **Browser B**: Create your identity (e.g., `client-alpha`).

  * Go to **Settings**.

  * Paste the code from **Browser A** into the "Connect to a Supernode" section and click **Connect**.

  * A **response code** will be generated. Copy it.

  * **Back in Browser A**: In the "Act as a Volunteer Supernode" section, paste the response code from **Browser B** and click **Accept Client**. The connection will be established.

  * **Browser C**: Create your identity (e.g., `client-beta`).

  * Repeat the process above to connect **Browser C** to **Browser A**.

### 3\. Start Chatting

Once the clients are connected to the supernode, they will appear in each other's "Online Contacts" list. Now, one client can click on the other's name to initiate an end-to-end encrypted P2P chat session.

## 🗺️ Future Roadmap

The modular architecture allows for expansion to more advanced features:

  * [ ] Implement the full **Signal Protocol** (Double Ratchet).
  * [ ] Group chat with a shared key distribution scheme.
  * [ ] Supernode discovery via DHT (Distributed Hash Table) to eliminate the need for invite codes.
  * [ ] Mobile and Desktop versions with secure key synchronization.
  * [ ] Decentralized reputation mechanisms (Web of Trust).