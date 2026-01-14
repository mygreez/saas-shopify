# 🚀 Guide Étape par Étape : Setup VPS Gratuit (Style Hostinger)

## 📋 Vue d'ensemble

Vous allez créer un serveur gratuit avec :
- ✅ Accès FTP (comme Hostinger)
- ✅ Gestionnaire de fichiers web (Webmin)
- ✅ Support Next.js
- ✅ Base de données PostgreSQL
- ✅ Nom de domaine gratuit

**Temps estimé :** 30-45 minutes  
**Coût :** 0€ (gratuit à vie)

---

## ÉTAPE 1 : Créer le compte Oracle Cloud

1. **Allez sur** : https://cloud.oracle.com
2. **Cliquez sur** "Start for Free"
3. **Remplissez le formulaire** :
   - Email
   - Nom, Prénom
   - Numéro de téléphone
   - Carte bancaire (vérification uniquement, pas de débit)
4. **Vérifiez votre email** et confirmez le compte
5. **Connectez-vous** à votre compte

---

## ÉTAPE 2 : Créer l'instance VPS

1. **Dans le menu**, cliquez sur **"Compute"** → **"Instances"**
2. **Cliquez sur** "Create Instance"
3. **Remplissez le formulaire** :

   **Informations de base :**
   - **Name** : `greez-saas-server`
   - **Placement** : Laissez par défaut
   - **Image** : Cliquez sur "Edit"
     - Sélectionnez **"Canonical Ubuntu"**
     - Version : **22.04** (Always Free Eligible)
   - **Shape** : Cliquez sur "Edit"
     - Sélectionnez **"VM.Standard.A1.Flex"** (Always Free)
     - OCPU : **1**
     - Memory : **6 GB**

   **Réseau :**
   - Laissez par défaut (créera un VCN automatiquement)

   **SSH Keys :**
   - **Option 1** : "Save Private Key" (téléchargez la clé)
   - **Option 2** : "Paste SSH Keys" (collez votre clé publique si vous en avez une)

4. **Cliquez sur** "Create"
5. **Attendez** 2-3 minutes que l'instance démarre
6. **Notez l'IP publique** (ex: `123.45.67.89`)

---

## ÉTAPE 3 : Se connecter au serveur

### Sur Mac/Linux :
```bash
# Rendre la clé exécutable
chmod 400 ~/Downloads/ssh-key-2026-01-14.key

# Se connecter
ssh -i ~/Downloads/ssh-key-2026-01-14.key ubuntu@VOTRE_IP_PUBLIQUE
```

### Sur Windows :
Utilisez **PuTTY** ou **Windows Terminal** avec WSL

---

## ÉTAPE 4 : Configuration initiale du serveur

Une fois connecté, exécutez ces commandes :

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version

# Installation PM2 (gestionnaire de processus)
sudo npm install -g pm2

# Installation Nginx (serveur web)
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier que Nginx fonctionne
curl http://localhost
# Si ça affiche du HTML, c'est bon !
```

---

## ÉTAPE 5 : Configuration FTP

```bash
# Installation vsftpd (serveur FTP)
sudo apt install -y vsftpd

# Configuration
sudo nano /etc/vsftpd.conf
```

**Dans l'éditeur, modifiez/ajoutez ces lignes :**
```ini
write_enable=YES
local_enable=YES
chroot_local_user=YES
allow_writeable_chroot=YES
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=VOTRE_IP_PUBLIQUE
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
```

**Sauvegardez** : `Ctrl+X`, puis `Y`, puis `Enter`

```bash
# Créer un utilisateur FTP
sudo adduser ftpuser
# Entrez un mot de passe (notez-le !)

# Créer le dossier web
sudo mkdir -p /home/ftpuser/www
sudo chown ftpuser:ftpuser /home/ftpuser/www

# Ajouter l'utilisateur à la liste autorisée
echo "ftpuser" | sudo tee -a /etc/vsftpd.userlist

# Redémarrer FTP
sudo systemctl restart vsftpd
sudo systemctl enable vsftpd
```

---

## ÉTAPE 6 : Ouvrir les ports dans Oracle Cloud

1. **Dans Oracle Cloud**, allez dans **"Networking"** → **"Virtual Cloud Networks"**
2. **Cliquez** sur votre VCN (ex: `vcn-...`)
3. **Cliquez** sur **"Security Lists"** → **"Default Security List"**
4. **Cliquez** sur **"Add Ingress Rules"**

   **Règle 1 - FTP :**
   - Source Type : `CIDR`
   - Source CIDR : `0.0.0.0/0`
   - IP Protocol : `TCP`
   - Destination Port Range : `21`
   - Description : `FTP`

   **Règle 2 - FTP Passif :**
   - Source Type : `CIDR`
   - Source CIDR : `0.0.0.0/0`
   - IP Protocol : `TCP`
   - Destination Port Range : `40000-50000`
   - Description : `FTP Passive`

   **Règle 3 - HTTP :**
   - Source Type : `CIDR`
   - Source CIDR : `0.0.0.0/0`
   - IP Protocol : `TCP`
   - Destination Port Range : `80`
   - Description : `HTTP`

   **Règle 4 - HTTPS :**
   - Source Type : `CIDR`
   - Source CIDR : `0.0.0.0/0`
   - IP Protocol : `TCP`
   - Destination Port Range : `443`
   - Description : `HTTPS`

5. **Cliquez** sur "Add Ingress Rules" pour chaque règle

---

## ÉTAPE 7 : Installation Webmin (Gestionnaire de fichiers web)

```bash
# Télécharger et installer Webmin
wget -O - https://raw.githubusercontent.com/webmin/webmin/master/setup-repos.sh | sh
sudo apt install -y webmin

# Ouvrir le port 10000 dans Oracle Cloud (même procédure que l'étape 6)
# Port : 10000
```

**Accéder à Webmin :**
1. Ouvrez votre navigateur : `https://VOTRE_IP:10000`
2. **Acceptez** le certificat (non sécurisé, c'est normal)
3. **Login** :
   - Username : `root`
   - Password : (votre mot de passe root Ubuntu)

---

## ÉTAPE 8 : Déployer votre application Next.js

```bash
# Se connecter en tant qu'utilisateur FTP
sudo su - ftpuser

# Aller dans le dossier web
cd ~/www

# Cloner votre projet
git clone https://github.com/mygreez/saas-shopify.git
cd saas-shopify

# Installer les dépendances
npm install

# Créer le fichier .env.production
nano .env.production
```

**Ajoutez vos variables d'environnement :**
```bash
NEXT_PUBLIC_SUPABASE_URL=votre_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle
NEXTAUTH_SECRET=votre_secret
NEXTAUTH_URL=http://VOTRE_IP
# ... autres variables
```

**Sauvegardez** : `Ctrl+X`, `Y`, `Enter`

```bash
# Build l'application
npm run build

# Créer le script de démarrage
nano start.sh
```

**Contenu de start.sh :**
```bash
#!/bin/bash
cd /home/ftpuser/www/saas-shopify
npm start
```

```bash
# Rendre exécutable
chmod +x start.sh

# Démarrer avec PM2
pm2 start start.sh --name greez-saas
pm2 save
pm2 startup
# Copiez la commande affichée et exécutez-la avec sudo
```

---

## ÉTAPE 9 : Configuration Nginx (Reverse Proxy)

```bash
# Revenir en root
exit

# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/greez-saas
```

**Contenu :**
```nginx
server {
    listen 80;
    server_name VOTRE_IP_OU_DOMAINE;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/greez-saas /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## ÉTAPE 10 : Tester l'accès FTP

### Avec FileZilla :

1. **Téléchargez FileZilla** : https://filezilla-project.org
2. **Ouvrez FileZilla**
3. **Remplissez** :
   - **Host** : `VOTRE_IP_PUBLIQUE`
   - **Username** : `ftpuser`
   - **Password** : (celui que vous avez créé)
   - **Port** : `21`
4. **Cliquez** sur "Quickconnect"
5. Vous devriez voir vos fichiers !

---

## ÉTAPE 11 : Nom de domaine gratuit (Optionnel)

### Option 1 : No-IP (Gratuit)

1. **Allez sur** : https://www.noip.com
2. **Créez un compte** (gratuit)
3. **Créez un hostname** : `greez-saas.ddns.net`
4. **Installez le client sur votre VPS** :
   ```bash
   cd /usr/local/src
   wget https://www.noip.com/client/linux/noip-duc-linux.tar.gz
   tar xzf noip-duc-linux.tar.gz
   cd noip-2.1.9-1
   make install
   # Suivez les instructions
   ```

### Option 2 : Domaine pas cher

- **Cloudflare Registrar** : ~$8/an
- **Namecheap** : .xyz à ~$1/an

---

## ✅ Checklist finale

- [ ] VPS Oracle Cloud créé et démarré
- [ ] Connexion SSH fonctionnelle
- [ ] Node.js 20.x installé
- [ ] PM2 installé
- [ ] Nginx installé et fonctionnel
- [ ] FTP configuré et testé avec FileZilla
- [ ] Webmin installé et accessible
- [ ] Ports ouverts dans Oracle Cloud (21, 80, 443, 40000-50000, 10000)
- [ ] Application Next.js clonée et buildée
- [ ] Variables d'environnement configurées
- [ ] PM2 configuré (redémarrage auto)
- [ ] Nginx configuré comme reverse proxy
- [ ] Application accessible via `http://VOTRE_IP`

---

## 🆘 Dépannage

### Le serveur ne démarre pas
```bash
pm2 logs greez-saas
pm2 status
```

### Nginx ne fonctionne pas
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### FTP ne fonctionne pas
```bash
sudo systemctl status vsftpd
sudo netstat -tulpn | grep :21
# Vérifiez que les ports sont ouverts dans Oracle Cloud
```

### L'application ne répond pas
```bash
# Vérifier que Next.js tourne
curl http://localhost:3000

# Vérifier PM2
pm2 list
pm2 restart greez-saas
```

---

## 📝 Commandes utiles

```bash
# Redémarrer l'application
pm2 restart greez-saas

# Voir les logs
pm2 logs greez-saas

# Mettre à jour le code
cd /home/ftpuser/www/saas-shopify
git pull
npm install
npm run build
pm2 restart greez-saas

# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h

# Voir les processus
htop
```

---

## 🎉 Félicitations !

Votre serveur est maintenant configuré avec :
- ✅ Accès FTP (comme Hostinger)
- ✅ Gestionnaire de fichiers web (Webmin)
- ✅ Application Next.js déployée
- ✅ Reverse proxy Nginx
- ✅ Redémarrage automatique (PM2)

**Votre application est accessible sur :** `http://VOTRE_IP`

---

## 📞 Support

- **Documentation Oracle Cloud** : https://docs.oracle.com/en-us/iaas/
- **Documentation Webmin** : https://webmin.com/docs.html
- **Documentation PM2** : https://pm2.keymetrics.io/docs/
- **Documentation Nginx** : https://nginx.org/en/docs/

