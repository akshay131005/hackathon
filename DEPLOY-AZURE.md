# Deploy PrivacyPass to Microsoft Azure (Step-by-Step)

You have an Azure account with credit. This guide assumes you start from zero and follow every step in order.

---

## Part 1: Before You Start

### What you need

1. **Azure account** – You have this, with credit.
2. **GitHub account** – Free at [github.com](https://github.com).
3. **Your project** – The `hackathon` folder on your PC (backend + frontend + contracts).
4. **MongoDB Atlas** – You already use this; keep the same connection string.
5. **Backend env values** – From `backend/.env`: `MONGO_URI`, `RPC_URL`, `CONTRACT_ADDRESS`, `JWT_SECRET`, `ISSUER_JWT_SECRET`. We will copy these into Azure later.

### What we will create in Azure

- **One Web App (App Service)** – runs your **backend** (Node/Express).
- **One Static Web App** – serves your **frontend** (React/Vite).

MongoDB and the blockchain stay as they are; we only deploy your code and set environment variables.

---

## Part 2: Put Your Code on GitHub

Azure will pull your code from GitHub, so we put the project there first.

### 2.1 Open terminal in your project folder

- In Cursor/VS Code: **Terminal → New Terminal**.
- Or open **PowerShell** and run:

```powershell
cd "C:\Users\aksha\OneDrive\Desktop\hackathon"
```

### 2.2 Initialize Git and commit (if not already done)

```powershell
git init
git add .
git status
```

- You should see a list of files. Then:

```powershell
git commit -m "Initial commit for Azure deployment"
```

If you get “nothing to commit” or “already committed”, that’s fine; move on.

### 2.3 Create a repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click the **+** (top right) → **New repository**.
3. **Repository name**: e.g. `privacypass-hackathon`.
4. **Public**.
5. Do **not** check “Add a README” or “Add .gitignore”.
6. Click **Create repository**.

### 2.4 Connect your folder to GitHub and push

GitHub will show a page with a URL like:  
`https://github.com/YOUR_USERNAME/privacypass-hackathon.git`

In your terminal (same folder: `hackathon`), run these **one by one** (replace `YOUR_USERNAME` and repo name if different):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/privacypass-hackathon.git
git branch -M main
git push -u origin main
```

- If it asks for GitHub login, use your username and a **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens) as the password.
- After this, your code is on GitHub.

---

## Part 3: Create the Backend on Azure (Web App / App Service)

### 3.1 Open Azure Portal

1. Go to [portal.azure.com](https://portal.azure.com).
2. Sign in with your Microsoft account (the one with credit).

### 3.2 Create a Web App

1. In the top search bar, type **App Service** and press Enter.
2. Click **+ Create** → **Web App** (or **Create** in the App Service list).
3. Fill the form:

   | Field | What to enter |
   |--------|----------------|
   | **Subscription** | Your subscription (the one with credit). |
   | **Resource group** | Click **Create new** → name: `privacypass-rg` → OK. |
   | **Name** | `privacypass-api` (or any unique name; Azure will say if taken). |
   | **Publish** | **Code**. |
   | **Runtime stack** | **Node 18 LTS** (or Node 20 LTS). |
   | **Operating System** | **Linux**. |
   | **Region** | e.g. **(US) East US** or one close to you. |
   | **Pricing** | **Basic B1** or **Free F1** to start (you can change later). |

4. Click **Review + create**, then **Create**.
5. Wait until deployment finishes (1–2 minutes), then click **Go to resource**.

### 3.3 Connect the Web App to GitHub (deploy your backend code)

1. In the left menu of your Web App, click **Deployment Center**.
2. **Source**: choose **GitHub**. If asked, sign in to GitHub and authorize Azure.
3. **Organization**: your GitHub username.
4. **Repository**: `privacypass-hackathon` (or whatever you named it).
5. **Branch**: `main`.
6. **Build Provider**: **GitHub Actions** (default).
7. Click **Next** or the **Build** tab.
8. Set:

   | Setting | Value |
   |---------|--------|
   | **Application framework** | If there is a preset, choose something like “Node” or leave default. |
   | **Build command** | `npm install && npm run build` |
   | **Start command** | `npm start` |
   | **Application location** (or “Code” path) | `backend` |

9. Click **Save** or **Next**, then **Save** again if needed.
10. Azure will create a GitHub Action and run a build. Wait a few minutes. In **Deployment Center**, the **Logs** or **Status** should show “Success” for the latest run.

### 3.4 Set environment variables (Configuration)

1. In the left menu of your Web App, click **Configuration** (under Settings).
2. Open the **Application settings** tab.
3. Click **+ New application setting** and add each of these (one by one). Get the **values** from your local `backend/.env`:

   | Name | Value (example – use YOUR real values) |
   |------|----------------------------------------|
   | `MONGO_URI` | Your full MongoDB Atlas connection string. |
   | `RPC_URL` | Your Sepolia RPC URL (e.g. Infura). |
   | `CONTRACT_ADDRESS` | Your deployed PrivacyPass contract address. |
   | `JWT_SECRET` | A long random string (same as local or new). |
   | `ISSUER_JWT_SECRET` | A long random string (same as local or new). |
   | `ALLOWED_ORIGIN` | For now use: `*` (we will change this after frontend is deployed). |
   | `PORT` | `8080` (Azure sets this; some setups need it explicitly). |

4. If you use `DEPLOYER_PRIVATE_KEY` or `API_BASE_URL` in backend, add those too.
5. Click **Save** at the top, then when prompted **Restart** the app.

### 3.5 Get your backend URL and test

1. In the left menu, click **Overview**.
2. Copy **Default domain**: it looks like `https://privacypass-api.azurewebsites.net`.
3. Open that URL in a browser. You should see the response from your backend (e.g. a simple message or JSON). If you see that, the backend is live.

**Write down this URL** – you will need it for the frontend (e.g. `https://privacypass-api.azurewebsites.net`).

---

## Part 4: Deploy the Frontend (Static Web Apps)

### 4.1 Create a Static Web App

1. In Azure Portal search bar, type **Static Web Apps** and open it.
2. Click **+ Create**.
3. Fill:

   | Field | Value |
   |--------|--------|
   | **Subscription** | Same as before. |
   | **Resource group** | Use existing: `privacypass-rg`. |
   | **Name** | `privacypass-web` (or any unique name). |
   | **Plan type** | **Free** (or Standard if you prefer). |
   | **Region** | Same as backend (e.g. East US). |

4. Click **Deploy** (or **Next**).
5. **Source**: **GitHub**. Sign in if needed.
6. **Organization**, **Repository**, **Branch**: your GitHub username, repo name, `main`.
7. **Build configuration**:

   | Setting | Value |
   |---------|--------|
   | **Build Preset** | Custom (or leave default). |
   | **App location** | `frontend` |
   | **Api location** | Leave **empty**. |
   | **Output location** | `dist` |

8. Click **Review + create**, then **Create**.
9. Azure will create the Static Web App and a GitHub Action. Wait until the first workflow run completes (a few minutes). You can check in GitHub: **Actions** tab in your repo.

### 4.2 Tell the frontend where the backend is (API URL)

The frontend must call your Azure backend URL. We do that with an environment variable at build time.

**Option A – Using Azure (recommended):**

1. Open your **Static Web App** in Azure (e.g. `privacypass-web`).
2. Go to **Configuration** (or **Environment variables** / **Application settings** depending on UI).
3. Add:

   - **Name**: `VITE_API_BASE_URL`  
   - **Value**: `https://privacypass-api.azurewebsites.net` (your real backend URL from Part 3.5).

4. Save. Then we need a **new build** so the frontend picks this up:
   - In GitHub: go to your repo → **Actions** → open the latest “Azure Static Web Apps” workflow → **Re-run all jobs**.

**Option B – Using a file in the repo:**

1. In the `frontend` folder, create a file named `.env.production` (no other name).
2. Put one line in it (use your real backend URL):

   ```
   VITE_API_BASE_URL=https://privacypass-api.azurewebsites.net
   ```

3. Commit and push:

   ```powershell
   git add frontend/.env.production
   git commit -m "Add production API URL for Azure"
   git push
   ```

4. The GitHub Action will run again and build with this URL.

### 4.3 Get your frontend URL

1. In Azure, open your **Static Web App**.
2. In **Overview**, find **URL** (e.g. `https://privacypass-web.xxx.azurestaticapps.net`).
3. Open that URL in a browser. You should see your PrivacyPass landing page.

**Write down this URL** – we use it next for CORS.

---

## Part 5: Secure CORS (Backend only allows your frontend)

1. Go back to your **backend Web App** (App Service) in Azure.
2. **Configuration** → **Application settings**.
3. Find `ALLOWED_ORIGIN` and change its value from `*` to your **exact** frontend URL, e.g.:

   ```
   https://privacypass-web.xxx.azurestaticapps.net
   ```

   (No slash at the end.)

4. **Save**, then **Restart** the Web App.

Now the backend will only accept requests from your frontend origin.

---

## Part 6: Quick Test Checklist

- [ ] Backend URL opens in browser and shows your API response.
- [ ] Frontend URL opens and shows the PrivacyPass landing page.
- [ ] From the frontend: open Dashboard, connect wallet (or use Identity). No CORS errors in browser console (F12).
- [ ] If something fails: check **Deployment Center** (backend) and **GitHub Actions** (frontend) for build errors; check **Configuration** for typos in env vars.

---

## Summary of URLs to Keep

| What | URL |
|------|-----|
| Backend API | `https://YOUR-BACKEND-NAME.azurewebsites.net` |
| Frontend app | `https://YOUR-STATIC-WEB-NAME.xxx.azurestaticapps.net` |

Use the frontend URL to use the app; the frontend will call the backend URL automatically when `VITE_API_BASE_URL` is set correctly.

---

## If the backend build fails in Azure

- In GitHub: **Actions** → open the failed workflow run and read the error.
- Common fixes:
  - **Application location** must be exactly `backend` (no leading/trailing slash).
  - **Build command**: `npm install && npm run build`.
  - **Start command**: `npm start`.
  - In **Configuration**, ensure `PORT` is set to `8080` if your code uses `process.env.PORT`.

## If the frontend build fails

- In GitHub **Actions**, check the “Build and Deploy” step.
- Ensure **App location** is `frontend` and **Output location** is `dist`.
- If `VITE_API_BASE_URL` is missing, add it via `.env.production` (Option B in 4.2) and push again.

---

You can follow this guide from top to bottom; your Azure account with credit is enough to run both the Web App and the Static Web App.
