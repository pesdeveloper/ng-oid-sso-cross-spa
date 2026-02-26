# Scripts Mac – Desarrollo Rápido

---

# bod-git-download.sh

Actualiza repo al estado exacto de origin/main.

git fetch origin  
git reset --hard origin/main  
git clean -fd  

---

# bod-run.sh

npm run dist:mma  
ng serve --host=127.0.0.1 --ssl --port=4205  

---

# Permisos

chmod +x bod-git-download.sh  
chmod +x bod-run.sh  

Opcional persistente en git:

git update-index --chmod=+x bod-git-download.sh  
git update-index --chmod=+x bod-run.sh  

---

# Flujo Windows → Mac

./bod-git-download.sh  
./bod-run.sh  

---

# MásPagos (si usa tgz local)

npm install ../ng-libs-local/mma-sso-session-guard.tgz --force  

Luego:

ng serve --host=127.0.0.1 --ssl --port=4203  

---

# Notas

- No cambiar versión para dev local
- Forzar reinstall si se usa tgz
- BOD no necesita reinstall si usa dist local
