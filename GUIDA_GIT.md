# Guida Git per ASIAFLEX - Come Aggiungere Cambiamenti alla Repository

## Panoramica
Questa guida spiega come aggiungere tutti i cambiamenti fatti in locale alla repository ASIAFLEX utilizzando i comandi Git.

## Comandi Git Fondamentali

### 1. Verificare lo Stato dei File

Prima di aggiungere cambiamenti, controlla sempre lo stato della tua repository:

```bash
git status
```

Questo comando ti mostrerà:
- File modificati (modified)
- File nuovi (untracked)
- File pronti per il commit (staged)

### 2. Aggiungere Tutti i Cambiamenti

Per aggiungere TUTTI i cambiamenti alla staging area:

```bash
git add .
```

Oppure per essere più espliciti:

```bash
git add --all
```

### 3. Aggiungere File Specifici

Se vuoi aggiungere solo file specifici:

```bash
# Aggiungere un singolo file
git add nome_file.js

# Aggiungere più file specifici
git add contracts/AsiaFlexToken.sol scripts/deploy.js

# Aggiungere tutti i file in una directory
git add scripts/
```

### 4. Controllare i File in Staging

Verifica quali file sono pronti per il commit:

```bash
git status
```

### 5. Fare il Commit

Crea un commit con un messaggio descrittivo:

```bash
git commit -m "Descrizione delle modifiche"
```

Esempi di messaggi per ASIAFLEX:
```bash
git commit -m "Add new minting functionality"
git commit -m "Fix price calculation in AsiaFlexToken"
git commit -m "Update deployment script for Sepolia"
git commit -m "Add ProofOfReserve integration"
```

### 6. Pushare alla Repository

Invia i cambiamenti alla repository remota:

```bash
git push
```

O specificando il branch:

```bash
git push origin main
git push origin nome-del-tuo-branch
```

## Flusso Completo di Lavoro

Ecco il flusso completo per aggiungere cambiamenti al progetto ASIAFLEX:

```bash
# 1. Controlla lo stato
git status

# 2. Aggiungi tutti i cambiamenti
git add .

# 3. Verifica i file in staging
git status

# 4. Crea il commit
git commit -m "Descrizione significativa delle modifiche"

# 5. Pusha alla repository
git push
```

## Esempi Specifici per ASIAFLEX

### Esempio 1: Aggiungere un nuovo script
```bash
# Hai creato un nuovo script in scripts/newFeature.js
git add scripts/newFeature.js
git commit -m "Add new feature script for token management"
git push
```

### Esempio 2: Modificare contratti e test
```bash
# Hai modificato contracts/AsiaFlexToken.sol e test/AsiaFlexToken.test.js
git add contracts/AsiaFlexToken.sol test/AsiaFlexToken.test.js
git commit -m "Update AsiaFlexToken contract and add comprehensive tests"
git push
```

### Esempio 3: Aggiornare configurazione
```bash
# Hai modificato hardhat.config.js e package.json
git add hardhat.config.js package.json
git commit -m "Update Hardhat configuration and dependencies"
git push
```

## File da NON Committare

Il file `.gitignore` nel progetto esclude automaticamente:
- `node_modules/` (dipendenze npm)
- `.env` (variabili d'ambiente sensibili)
- `/cache` e `/artifacts` (file generati da Hardhat)
- `/coverage` (report di copertura test)

## Verificare i Cambiamenti Prima del Commit

### Vedere le differenze
```bash
# Vedere tutte le modifiche non staged
git diff

# Vedere le modifiche staged
git diff --staged

# Vedere le modifiche in un file specifico
git diff contracts/AsiaFlexToken.sol
```

### Vedere la cronologia
```bash
# Ultimi 10 commit
git log --oneline -10

# Vedere i dettagli di un commit specifico
git show <commit-hash>
```

## Comandi Utili per Debug

```bash
# Rimuovere file dalla staging area (senza perdere modifiche)
git restore --staged nome_file.js

# Vedere il grafico dei branch
git log --graph --oneline --all

# Vedere chi ha modificato ogni riga di un file
git blame contracts/AsiaFlexToken.sol
```

## Best Practices per ASIAFLEX

1. **Messaggi di commit chiari**: Usa messaggi descrittivi che spiegano COSA e PERCHÉ
2. **Commit atomici**: Ogni commit dovrebbe rappresentare una singola funzionalità o fix
3. **Test prima del push**: Sempre eseguire `npm test` o `npx hardhat test` prima di pushare
4. **Controlla .env**: Non committare mai file `.env` con chiavi private reali
5. **Review prima del push**: Usa `git diff --staged` per rivedere le modifiche

## Troubleshooting Comune

### Problema: "Updates were rejected"
```bash
# Prima di pushare, pusha sempre l'ultima versione
git pull
git push
```

### Problema: File .env committato per errore
```bash
# Rimuovi dal tracking
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

### Problema: Voler annullare l'ultimo commit
```bash
# Mantiene le modifiche nel working directory
git reset --soft HEAD~1

# Rimuove le modifiche completamente (ATTENZIONE!)
git reset --hard HEAD~1
```

---

*Questa guida è specifica per il progetto ASIAFLEX. Per maggiori informazioni su Git, consulta la [documentazione ufficiale](https://git-scm.com/doc).*