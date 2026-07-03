# Estrategia de Mantenimiento Django Demo

Version minima en Django de la vista "Estrategia de mantenimiento", separada del proyecto principal y sin datos reales.

## Incluye

- Proyecto Django independiente
- Una sola ruta `/`
- Misma interfaz demo de estrategia de mantenimiento
- Datos falsos de un mes en `demo/static/demo/data/sample_month.json`
- Despliegue simple con `gunicorn` y `whitenoise`
- Archivo `render.yaml` para usar en Render

## Uso local

```bash
cd estrategia_mantenimiento_django_demo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

Abre:

`http://127.0.0.1:8000/`

## Estructura

- `config/`: settings y urls
- `demo/views.py`: vista unica
- `demo/templates/demo/home.html`: plantilla principal
- `demo/static/demo/`: css, js y datos falsos

## Subir a GitHub

```bash
cd estrategia_mantenimiento_django_demo
git init
git branch -M main
git add .
git commit -m "Initial Django demo"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Desplegar en Render

1. Crea un repo nuevo en GitHub con esta carpeta.
2. En Render, elige `New + > Web Service`.
3. Conecta el repo.
4. Si Render no toma `render.yaml`, configura manualmente:

- `Build Command`: `bash build.sh`
- `Start Command`: `gunicorn config.wsgi:application`

5. Variables recomendadas:

- `DJANGO_DEBUG=false`
- `DJANGO_SECRET_KEY=una-clave-larga`
- `DJANGO_ALLOWED_HOSTS=.onrender.com`

## Nota

No usa base de datos del proyecto original ni datos confidenciales. Todo el contenido es sintetico.
