# PrivacyPass

PrivacyPass is a privacy-preserving Web3 identity verification platform. Users can prove eligibility (age, student status, membership) without revealing full identity documents. Credentials are anchored on-chain, while personal data stays off-chain.

## Identity (Sign in with PrivacyPass)

Store your name, email, and password securely in the database (MongoDB Atlas). Data is hashed (never stored in plaintext) and a commitment is anchored on-chain. The **key and QR store your identity in a privacy-safe way**: when you use them on another website, that site can get your **display name** and **email verified** so it can show “Signed in as [name]” without ever seeing your email or password.

- **Register** at `/identity` with name, email, password, and optional display name. Data is stored in Atlas (`useridentities`); a credential is created and linked to this identity.
- **Login** at `/identity` to get a QR code and one-time verify URL (key).
- **Manage Credentials** (Dashboard): Your credentials list shows all credentials for your wallet, including the PrivacyPass Identity credential. Each credential has a **QR** and **Key** (verify URL). Opening a credential shows both; the key can be copied for use on other sites. If the credential is linked to your registered identity, verification returns your identity data from the database.
- **Issue Credential** (Issuer): When an issuer issues a credential to a wallet that has a registered identity, the credential is automatically linked. The issued credential's QR and key then return that identity data when verified.
- **External sites** can call `GET /identity/verify-token?...` or verify via `GET /verify/qr?cid=...&t=...&sig=...`; both return `claims: { displayName, emailVerified }` and `claimsSignature` when the credential is identity-linked.

## Structure

- `contracts/` – Hardhat project and `PrivacyPass` Solidity contract.
- `backend/` – Node/Express API, MongoDB models, and Ethereum integration.
- `frontend/` – Vite + React + Tailwind single-page app with Web3 UI.

## Running Locally

1. **Contracts**
   - `cd contracts`
   - Copy `.env.example` to `.env` and fill `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`.
   - Install deps: `npm install`
   - Compile: `npm run build`
   - Deploy (example): `npm run deploy:sepolia`
   - Copy deployed address into `backend/.env` as `CONTRACT_ADDRESS`.

2. **Backend**
   - `cd backend`
   - Copy `.env.example` to `.env` and set `MONGO_URI`, `RPC_URL`, `CONTRACT_ADDRESS`, `ALLOWED_ORIGIN`.
   - Install deps: `npm install`
   - Run dev server: `npm run dev` (default `http://localhost:4000`).

3. **Frontend**
   - `cd frontend`
   - Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to backend URL.
   - Install deps: `npm install`
   - Run dev server: `npm run dev` (default `http://localhost:5173`).

## Storing data in MongoDB Atlas

All backend data is stored in MongoDB. To use **MongoDB Atlas**:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com), create an account (or sign in), and create a free cluster.
2. In the cluster: **Connect** → **Connect your application** → copy the connection string.
3. Replace `<password>` with your database user password. Optionally set the database name (e.g. `privacypass`).
4. In `backend/.env` set:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/privacypass?retryWrites=true&w=majority
   ```
5. In Atlas: **Network Access** → add your IP (or `0.0.0.0/0` for development).
6. Run the backend: `cd backend && npm run dev`. You should see `MongoDB connected (Atlas)`.

**Collections stored in Atlas:** `credentials`, `useridentities`, `issuers`, `verificationlogs`, `activitytimelines`, and any other Mongoose models used by the app.

## Deployment Notes

- **MongoDB Atlas**: Use the steps above; set `MONGO_URI` in backend `.env` (and in your host’s env vars when deploying).
- **Render (backend)**:
  - Create a new Web Service from the `backend` folder.
  - Build command: `npm install && npm run build`.
  - Start command: `npm start`.
  - Set env vars (`MONGO_URI`, `RPC_URL`, `CONTRACT_ADDRESS`, `JWT_SECRET`, `ALLOWED_ORIGIN` with your Vercel URL).
- **Vercel (frontend)**:
  - Import the repo, select `frontend` as root.
  - Build command: `npm run build`.
  - Output directory: `dist`.
  - Env vars: `VITE_API_BASE_URL` (Render backend URL), `VITE_CHAIN_NAME`, `VITE_EXPLORER_URL`.

