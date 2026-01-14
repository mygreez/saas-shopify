# Setup VPS Oracle Cloud Gratuit (Style Hostinger)

## 🎯 Objectif
Créer un serveur gratuit avec FTP, gestionnaire de fichiers et support Next.js, similaire à Hostinger.

---

## 📋 Prérequis
- Compte Oracle Cloud (gratuit) : https://cloud.oracle.com
- Carte bancaire (pour vérification, pas de débit)

---

## 🚀 Étape 1 : Créer l'instance VPS

1. **Connectez-vous** à Oracle Cloud
2. **Menu** → "Compute" → "Instances"
3. **Create Instance**
4. Configuration :
   - **Name** : `greez-saas-server`
   - **Image** : Ubuntu 22.04 (Always Free Eligible)
   - **Shape** : VM.Standard.A1.Flex (Always Free)
   - **Networking** : Par défaut
   - **SSH Keys** : Générer une nouvelle clé ou uploader la vôtre
5. **Create**

---

## 🔧 Étape 2 : Configuration initiale

### Connexion SSH
```bash
ssh -i ~/.ssh/votre_cle ubuntu@VOTRE_IP_PUBLIQUE
```

### Mise à jour système
```bash
sudo apt update && sudo apt upgrade -y
```

### Installation Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Vérifier (doit être v20.x)
```

### Installation PM2 (gestionnaire de processus)
```bash
sudo npm install -g pm2
```

### Installation Nginx (reverse proxy)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📁 Étape 3 : Configuration FTP (vsftpd)

### Installation
```bash
sudo apt install -y vsftpd
```

### Configuration
```bash
sudo nano /etc/vsftpd.conf
```

Modifiez/ajoutez :
```ini
# Activer l'écriture
write_enable=YES

# Utilisateurs locaux
local_enable=YES

# Chroot pour sécurité
chroot_local_user=YES
allow_writeable_chroot=YES

# Ports passifs
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=VOTRE_IP_PUBLIQUE

# Utilisateurs autorisés
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
```

### Créer un utilisateur FTP
```bash
# Créer un utilisateur
sudo adduser ftpuser
sudo mkdir -p /home/ftpuser/www
sudo chown ftpuser:ftpuser /home/ftpuser/www

# Ajouter à la liste autorisée
echo "ftpuser" | sudo tee -a /etc/vsftpd.userlist

# Redémarrer vsftpd
sudo systemctl restart vsftpd
sudo systemctl enable vsftpd
```

### Ouvrir les ports dans Oracle Cloud
1. **Networking** → **Virtual Cloud Networks**
2. Sélectionnez votre VCN
3. **Security Lists** → **Default Security List**
4. **Ingress Rules** → **Add Ingress Rules**
5. Ajoutez :
   - **Port 21** (FTP)
   - **Ports 40000-50000** (FTP passif)

---

## 🌐 Étape 4 : Installation Webmin (Gestionnaire de fichiers web)

```bash
# Télécharger et installer Webmin
wget -O - https://raw.githubusercontent.com/webmin/webmin/master/setup-repos.sh | sh
sudo apt install -y webmin

# Accéder à Webmin
# https://VOTRE_IP:10000
# Login : root / votre mot de passe root
```

### Configuration Webmin
1. Connectez-vous à `https://VOTRE_IP:10000`
2. **System** → **Users and Groups** → Créer un utilisateur
3. **Webmin** → **Webmin Configuration** → **IP Access Control** → Autoriser votre IP

---

## 🚀 Étape 5 : Déployer Next.js

### Cloner votre projet
```bash
cd /home/ftpuser/www
sudo -u ftpuser git clone https://github.com/mygreez/saas-shopify.git
cd saas-shopify
```

### Installer les dépendances
```bash
sudo -u ftpuser npm install
```

### Build
```bash
sudo -u ftpuser npm run build
```

### Créer le fichier de démarrage
```bash
sudo nano /home/ftpuser/www/saas-shopify/start.sh
```

Contenu :
```bash
#!/bin/bash
cd /home/ftpuser/www/saas-shopify
npm start
```

Rendre exécutable :
```bash
sudo chmod +x /home/ftpuser/www/saas-shopify/start.sh
sudo chown ftpuser:ftpuser /home/ftpuser/www/saas-shopify/start.sh
```

### Démarrer avec PM2
```bash
sudo -u ftpuser pm2 start /home/ftpuser/www/saas-shopify/start.sh --name greez-saas
sudo -u ftpuser pm2 save
sudo -u ftpuser pm2 startup
```

---

## 🔄 Étape 6 : Configuration Nginx (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/greez-saas
```

Contenu :
```nginx
server {
    listen 80;
    server_name VOTRE_DOMAINE_OU_IP;

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

Activer :
```bash
sudo ln -s /etc/nginx/sites-available/greez-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Étape 7 : Variables d'environnement

```bash
sudo nano /home/ftpuser/www/saas-shopify/.env.production
```

Ajoutez vos variables :
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://VOTRE_IP
# etc.
```

---

## 📱 Utilisation

### Accès FTP (FileZilla)
- **Host** : `VOTRE_IP_PUBLIQUE`
- **Port** : `21`
- **Username** : `ftpuser`
- **Password** : (celui que vous avez créé)
- **Protocol** : FTP

### Accès Webmin
- **URL** : `https://VOTRE_IP:10000`
- **Username** : `root`
- **Password** : (votre mot de passe root)

### Mise à jour du code
```bash
# Via FTP : Upload les fichiers
# Ou via SSH :
cd /home/ftpuser/www/saas-shopify
sudo -u ftpuser git pull
sudo -u ftpuser npm install
sudo -u ftpuser npm run build
sudo -u ftpuser pm2 restart greez-saas
```

---

## 🌐 Nom de domaine gratuit

### Option 1 : Sous-domaine gratuit
- **No-IP** : https://www.noip.com
  - Créez un compte
  - Créez un hostname : `greez-saas.ddns.net`
  - Installez le client sur votre VPS pour mettre à jour l'IP

### Option 2 : Domaine pas cher
- **Cloudflare Registrar** : ~$8/an
- **Namecheap** : .xyz à ~$1/an
- **Porkbun** : Domaines à partir de $1/an

---

## ✅ Checklist finale

- [ ] VPS Oracle Cloud créé
- [ ] Node.js installé
- [ ] FTP configuré et testé
- [ ] Webmin installé et accessible
- [ ] Next.js déployé et fonctionnel
- [ ] Nginx configuré
- [ ] PM2 configuré (redémarrage auto)
- [ ] Ports ouverts dans Oracle Cloud
- [ ] Variables d'environnement configurées

---

## 🆘 Dépannage

### Le serveur ne démarre pas
```bash
sudo -u ftpuser pm2 logs greez-saas
```

### Nginx ne fonctionne pas
```bash
sudo nginx -t
sudo systemctl status nginx
```

### FTP ne fonctionne pas
```bash
sudo systemctl status vsftpd
sudo netstat -tulpn | grep :21
```

### Vérifier les ports ouverts
```bash
sudo ufw status
# Si nécessaire :
sudo ufw allow 21/tcp
sudo ufw allow 40000:50000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 10000/tcp
```

---

## 💡 Astuces

1. **Sauvegarde automatique** : Configurez un cron job pour sauvegarder régulièrement
2. **SSL/HTTPS** : Installez Certbot pour Let's Encrypt (gratuit)
3. **Monitoring** : Utilisez PM2 Monitor pour surveiller l'app
4. **Logs** : Consultez les logs avec `pm2 logs` ou dans `/var/log/nginx/`

---

## 📞 Support

- **Documentation Oracle Cloud** : https://docs.oracle.com/en-us/iaas/
- **Documentation Webmin** : https://webmin.com/docs.html
- **Documentation PM2** : https://pm2.keymetrics.io/docs/

