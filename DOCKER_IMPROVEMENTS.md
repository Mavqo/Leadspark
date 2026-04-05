# LeadSpark Docker Optimization Report

## Overview
Questo documento riassume le ottimizzazioni applicate al Dockerfile di LeadSpark (Astro 4 + Node Adapter).

---

## 🎯 Cambiamenti Effettuati

### 1. Security Hardening

#### ✅ Node.js Upgrade
- **Prima:** `node:18-alpine`
- **Dopo:** `node:20.18-alpine3.20` (LTS con tag specifico)
- **Motivazione:** Node 18 raggiunge End-of-Life nel 2025, Node 20 è LTS fino al 2026

#### ✅ Non-root User
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001
USER astro
```
- L'applicazione gira come utente `astro` (UID 1001) invece di root
- Riduce la superficie di attacco in caso di compromissione

#### ✅ HEALTHCHECK
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', ...)"
```
- Monitora automaticamente lo stato dell'applicazione
- Kubernetes e Docker Swarm possono usarlo per restart automatico

#### ✅ Tag Specifici
- Usati tag precisi: `node:20.18-alpine3.20`
- Mai `:latest` per garantire reproducibility

---

### 2. Build Optimization

#### ✅ Multi-Stage Build Ottimizzato (3 Stage)

| Stage | Scopo | Output |
|-------|-------|--------|
| `deps` | Installazione dipendenze produzione | `node_modules` prod |
| `builder` | Build completa applicazione | `dist/` |
| `production` | Immagine finale minimale | Solo file necessari |

#### ✅ Layer Caching Migliorato
```dockerfile
# Dipendenze (cambiano raramente)
COPY package.json package-lock.json ./
RUN npm ci

# Codice sorgente (cambia frequentemente)
COPY src ./src
COPY public ./public
RUN npm run build
```
- Le dipendenze vengono cacheate separatamente dal codice
- Ricostruzione più veloce quando si modifica solo il codice

#### ✅ File Ownership Esplicito
```dockerfile
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
```
- File copiati direttamente con owner corretto
- Nessun `chown` aggiuntivo necessario

#### ✅ npm cache clean
```dockerfile
RUN npm ci --only=production && npm cache clean --force
```
- Pulisce la cache npm riducendo la dimensione dell'immagine

---

### 3. .dockerignore Migliorato

Aggiunti nuovi pattern per ridurre il context di build:

```
# Nuove esclusioni significative:
.pnpm-debug.log*
.output
.env.development
.env.test
.github
.gitlab-ci.yml
.cache
.parcel-cache
.vite
temp
tmp
logs
.vercel
.netlify
```

**Vantaggi:**
- Context di build più piccolo = upload più veloce
- Layer cache più stabile (meno file che cambiano)

---

### 4. Docker Compose Files

#### docker-compose.yml (Development)
- Volume mounting per hot reload
- Porta 4321 per Astro dev server
- Variabili da `.env`
- Health check configurato

#### docker-compose.prod.yml (Production)
- Security hardening:
  - `no-new-privileges:true`
  - `read_only: true`
  - `cap_drop: ALL`
  - `tmpfs` per `/tmp`
- Logging configurato con rotazione
- Restart policy: `unless-stopped`
- Health check più stringente

---

## 📊 Confronto Dimensioni (Stimato)

| Metrica | Originale | Ottimizzato | Miglioramento |
|---------|-----------|-------------|---------------|
| **Node Version** | 18 | 20.18 LTS | +2 major versions |
| **Stages** | 2 | 3 | Più efficiente |
| **User** | root | astro (non-root) | ✅ Secure |
| **HEALTHCHECK** | ❌ | ✅ | ✅ Monitoraggio |
| **Tag Specifico** | ❌ (alpine) | ✅ (alpine3.20) | ✅ Reproducibility |
| **Immagine finale stimata** | ~180MB | ~120MB | ~33% più piccola |

*Le dimensioni sono stimate basandosi su pattern simili. Il test effettivo richiede `docker build`.*

---

## 🚀 Comandi per Build e Run

### Build immagine
```bash
# Build produzione
docker build -t leadspark:latest .

# Build specifico target
docker build --target production -t leadspark:prod .
docker build --target builder -t leadspark:dev .

# Build senza cache
docker build --no-cache -t leadspark:latest .
```

### Run container
```bash
# Run base
docker run -p 3000:3000 leadspark:latest

# Run con env file
docker run -p 3000:3000 --env-file .env.production leadspark:latest

# Run in background
docker run -d -p 3000:3000 --name leadspark-app leadspark:latest

# Run con restart
docker run -d -p 3000:3000 --restart unless-stopped leadspark:latest
```

### Docker Compose
```bash
# Sviluppo
docker-compose up
docker-compose up --build
docker-compose up -d
docker-compose down

# Produzione
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down

# Logs
docker-compose logs -f app
docker-compose logs --tail=50 app
```

---

## ✅ Best Practices Applicate

### Dockerfile Best Practices
1. ✅ **Specific tags** - Mai `:latest`
2. ✅ **Multi-stage build** - Separazione concerns
3. ✅ **Non-root user** - Sicurezza
4. ✅ **Layer caching** - Ordine ottimale COPY/RUN
5. ✅ **Minimize layers** - Comandi combinati dove utile
6. ✅ **HEALTHCHECK** - Monitoraggio salute
7. ✅ **.dockerignore** - Context pulito

### Security Best Practices
1. ✅ **Non-root user** con UID/GID specifici
2. ✅ **Minimal base image** (Alpine)
3. ✅ **No dev dependencies** in produzione
4. ✅ **Read-only filesystem** in produzione
5. ✅ **Capability dropping** in produzione
6. ✅ **No new privileges** in produzione

### Performance Best Practices
1. ✅ **npm ci** invece di `npm install` (più veloce, deterministico)
2. ✅ **Cache pulizia** dopo install
3. ✅ **Stage dedicato** per dipendenze
4. ✅ **Solo file necessari** nell'immagine finale

---

## 📝 Note Aggiuntive

### Per Railway Deployment
Il `railway.toml` esistente dovrebbe funzionare senza modifiche. L'immagine ottimizzata ridurrà:
- Tempo di build su Railway
- Dimensione immagine finale
- Tempo di deploy

### Per Vercel
Se si usa anche Vercel, il Dockerfile non è necessario (Vercel usa il suo build system).

### Troubleshooting
```bash
# Verificare user
docker exec -it leadspark-app id

# Verificare health
docker inspect --format='{{.State.Health.Status}}' leadspark-app

# Shell nel container
docker exec -it leadspark-app sh
```

---

## 📚 Riferimenti

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Astro Adapter Node](https://docs.astro.build/en/guides/integrations-guide/node/)
