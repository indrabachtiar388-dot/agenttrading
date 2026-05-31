# Panduan Deploy ke Netlify

## 🚀 Cara Deploy

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. **Push code ke GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Login ke Netlify:**
   - Buka https://app.netlify.com
   - Login dengan GitHub account

3. **Import project:**
   - Klik "Add new site" → "Import an existing project"
   - Pilih "GitHub"
   - Pilih repository `Agentmemecoin`

4. **Configure build settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (Netlify akan auto-detect dari `netlify.toml`)

5. **Set environment variables:**
   - Klik "Site settings" → "Environment variables"
   - Tambahkan:
     ```
     VITE_HELIUS_API_KEY = your_helius_api_key
     VITE_SUPABASE_URL = your_supabase_url
     VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
     VITE_SMART_WALLETS = (opsional)
     ```
   - ⚠️ **PENTING:** Jangan lupa prefix `VITE_` untuk semua env vars!

6. **Deploy:**
   - Klik "Deploy site"
   - Tunggu build selesai (~1-2 menit)
   - Site akan live di `https://random-name.netlify.app`

7. **Custom domain (opsional):**
   - Klik "Domain settings" → "Add custom domain"
   - Follow instruksi untuk setup DNS

---

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Initialize:**
   ```bash
   netlify init
   ```
   - Pilih "Create & configure a new site"
   - Pilih team
   - Site name (atau biarkan random)

4. **Set environment variables:**
   ```bash
   netlify env:set VITE_HELIUS_API_KEY "your_helius_api_key"
   netlify env:set VITE_SUPABASE_URL "your_supabase_url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your_supabase_anon_key"
   ```

5. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

---

## ⚠️ Troubleshooting

### Error: "main.jsx:1" atau blank page

**Penyebab:** Environment variables tidak diset di Netlify.

**Solusi:**
1. Buka Netlify dashboard → Site settings → Environment variables
2. Pastikan semua env vars ada dengan prefix `VITE_`
3. Redeploy: Site settings → Deploys → Trigger deploy → Deploy site

---

### Error: "Failed to load module"

**Penyebab:** Build gagal karena dependency issue.

**Solusi:**
1. Cek build log di Netlify dashboard
2. Pastikan `package.json` dan `package-lock.json` sudah di-commit
3. Coba build lokal dulu: `npm run build`
4. Kalau lokal berhasil, push lagi ke GitHub

---

### Error: "404 Not Found" saat refresh page

**Penyebab:** SPA routing tidak di-handle oleh Netlify.

**Solusi:**
- File `netlify.toml` sudah include redirect rule
- Pastikan file ini ada di root project dan sudah di-commit
- Redeploy

---

### Error: "Supabase auth failed"

**Penyebab:** Supabase URL salah atau site URL belum ditambahkan ke Supabase allowed URLs.

**Solusi:**
1. Buka Supabase dashboard → Authentication → URL Configuration
2. Tambahkan Netlify URL ke "Site URL" dan "Redirect URLs":
   ```
   https://your-site-name.netlify.app
   ```
3. Save dan coba login lagi

---

### Error: "Helius RPC gagal"

**Penyebab:** Helius API key salah atau quota habis.

**Solusi:**
1. Cek Helius dashboard → API keys
2. Pastikan API key valid dan quota masih ada
3. Update env var di Netlify kalau perlu
4. Redeploy

---

## 📋 Checklist Sebelum Deploy

- [ ] `.env` file **TIDAK** di-commit (sudah ada di `.gitignore`)
- [ ] `netlify.toml` sudah di-commit
- [ ] `package.json` dan `package-lock.json` sudah di-commit
- [ ] Build lokal berhasil: `npm run build`
- [ ] Environment variables sudah diset di Netlify dashboard
- [ ] Supabase allowed URLs sudah include Netlify URL

---

## 🔒 Security Notes

1. **Jangan commit `.env` file** — env vars harus diset di Netlify dashboard, bukan di code
2. **Jangan commit API keys** — semua keys harus di environment variables
3. **Supabase anon key aman untuk public** — ini memang designed untuk frontend
4. **Helius API key aman untuk frontend** — tapi set rate limit di Helius dashboard

---

## 🔄 Auto-Deploy

Setelah setup awal, setiap push ke GitHub akan auto-deploy:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Netlify akan auto-detect push dan deploy otomatis (~1-2 menit).

---

## 📊 Monitor Deploy

1. **Build logs:** Netlify dashboard → Deploys → klik deploy → scroll ke "Deploy log"
2. **Function logs:** (kalau pakai Netlify Functions) → Functions tab
3. **Analytics:** Site settings → Analytics (paid feature)

---

## 💡 Tips

1. **Preview deploys:** Setiap PR akan dapat preview URL otomatis
2. **Branch deploys:** Setup branch deploys untuk staging environment
3. **Environment per branch:** Set different env vars untuk production vs staging
4. **Build hooks:** Setup webhook untuk trigger deploy dari external service

---

## 🆘 Masih Error?

Kalau masih error setelah ikuti panduan ini:

1. **Copy full error message** dari Netlify build log
2. **Screenshot** error di browser console (F12 → Console tab)
3. **Cek** apakah error juga muncul saat run lokal (`npm run dev`)
4. **Share** error message untuk troubleshooting lebih lanjut

---

**Deploy berhasil?** Site akan live di `https://your-site-name.netlify.app` 🚀
