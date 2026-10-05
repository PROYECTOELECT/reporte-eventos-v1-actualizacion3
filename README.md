# Sistema de Reportes de Eventos

App web (React + Vite) con reportes en Supabase, mapa, PDF/Excel, usuarios locales, QR e informativo.

## 1. Instalar en local

```bash
npm install
npm run dev
```

En Windows PowerShell, si `npm` falla por política de scripts:

```cmd
npm.cmd install
npm.cmd run dev
```

## 2. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Si no las pones, se usa el proyecto Supabase ya configurado.

## 3. Supabase

- Proyecto: `isqksdpjunlydpnadlud`
- Tabla: `reportes`
- Bucket público: `evidencias`

Los **reportes y fotos** ya están en la nube.

Aún en el navegador (localStorage): usuarios, buzón, informativo, logos y tema. En cada dispositivo hay que tener las mismas cuentas o, en un siguiente paso, pasarlos a Supabase.

## 4. Subir a GitHub

En la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Listo para nube"
```

Crea un repositorio en GitHub y sube:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

## 5. Publicar en Vercel

1. Entra a https://vercel.com y conéctate con GitHub
2. Importa el repositorio
3. Framework: Vite
4. En Environment Variables agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

La URL de Vercel es la que usas en el celular.

## 6. Importante en el teléfono

- Cámara QR y GPS requieren **HTTPS** (Vercel lo da) o localhost
- Permite ubicación y cámara cuando el navegador lo pida


## 7. Instalar en el celular como app

La app debe estar publicada en **HTTPS** (Vercel).

### Android (Chrome)
1. Abre la URL de Vercel en Chrome
2. Menú ⋮ → **Agregar a la pantalla de inicio** o **Instalar aplicación**
3. Confirma. Queda el ícono como una app.

### iPhone (Safari)
1. Abre la URL en Safari
2. Botón Compartir → **Agregar a pantalla de inicio**
3. Confirma.

No se descarga desde Play Store ni App Store: se instala desde el navegador.


## 6b. Modulos recientes
- Informe de supervision
- Control de tiempo (ingreso/salida)
- GPS de equipo solo admin/master


## 8. Modulos 23-sep-2026
- REGISTRO DE PERSONAL (asistencia local)
- PERSONAL E INDICADORES (permiso personalIndicadores)
- Informe supervision
Estos tres usan localStorage por ahora (no requieren tablas nuevas en GitHub).
