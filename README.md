# Ejemplo de tienda digital básica

Proyecto demo de una tienda digital tipo catálogo para ropa. Está pensado para mostrarse como ejemplo en un repositorio o portafolio: se ve como tienda real para el cliente final y mantiene la parte técnica dentro del backend y este README.

## Características

- Página de inicio con estilo comercial.
- Departamentos principales: **Hombre** y **Dama**.
- Subcategorías dentro de cada departamento.
- Catálogo con filtros, búsqueda y ordenamiento.
- Carrito local con `localStorage`.
- Pedido directo por WhatsApp.
- Backend en Node.js + Express.
- Conexión opcional a Google Sheets API.
- Catálogo demo local si no configuras Google Sheets.

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

Abre:

```text
http://localhost:3000
```

## Configuración de Google Sheets

El proyecto puede leer productos desde Google Sheets mediante el backend. El archivo `.env` debe tener:

```env
GOOGLE_SHEETS_API_KEY=tu_api_key
SPREADSHEET_ID=id_de_tu_google_sheet
SHEETS_RANGE=A2:K
WHATSAPP_NUMBER=524451032072
```

## Columnas recomendadas para Google Sheets

Tu hoja actual solo tiene estas columnas:

| A | B | C | D | E |
|---|---|---|---|---|
| Categoría | Nombre | Precio | Imagen | Tallas |

Eso funciona, pero para una tienda más grande conviene agregar más columnas para organizar bien Hombre, Dama y subcategorías.

Formato recomendado:

| Columna | Nombre | Ejemplo |
|---|---|---|
| A | Departamento | Hombre |
| B | Categoría | Ropa |
| C | Subcategoría | Playeras |
| D | Nombre | Playera oversized blanca |
| E | Precio | 280 |
| F | Imagen | producto1.jpeg o URL |
| G | Tallas | CH, M, G, XL |
| H | Etiqueta | Nuevo |
| I | Descripción | Playera de algodón con corte amplio |
| J | Disponible | Sí |
| K | Orden | 1 |

## Ejemplo de filas

```csv
Departamento,Categoría,Subcategoría,Nombre,Precio,Imagen,Tallas,Etiqueta,Descripción,Disponible,Orden
Hombre,Ropa,Playeras,Playera oversized blanca,280,producto1.jpeg,"CH, M, G, XL",Nuevo,Playera cómoda de corte amplio,Sí,1
Hombre,Ropa,Sudaderas,Sudadera urbana negra,450,producto2.jpeg,"M, G, XL",Temporada,Sudadera ligera para uso diario,Sí,2
Dama,Ropa,Tops,Top básico beige,230,producto3.jpeg,"CH, M, G",Nuevo,Top fresco para combinar con jeans,Sí,3
Dama,Ropa,Vestidos,Vestido casual negro,480,producto4.jpeg,"CH, M, G",Favorito,Vestido casual para salidas,Sí,4
```

## Importante sobre imágenes

En Google Sheets puedes poner:

1. Una URL pública de imagen, por ejemplo de Cloudinary, Firebase Storage o un servidor propio.
2. Un nombre de archivo local si la imagen está dentro de `public/assets`, por ejemplo:

```text
/assets/producto-demo-1.svg
```

Si pones solo `producto1.jpeg`, el navegador buscará la imagen en la raíz del sitio. Lo más claro es usar rutas así:

```text
/assets/producto1.jpeg
```

## Formato anterior compatible

El backend todavía puede leer el formato anterior de 5 columnas:

```text
Categoría | Nombre | Precio | Imagen | Tallas
```

Pero se recomienda usar el formato nuevo A:K para que el catálogo pueda dividirse en departamentos y subcategorías.

## Estructura

```text
backend/server.js          Backend Express y conexión a Google Sheets
public/index.html          Página principal
public/styles.css          Diseño responsive
public/app.js              Lógica del catálogo, filtros y carrito
data/demo-products.json    Catálogo local de respaldo
.env.example               Variables de entorno de ejemplo
google-sheets-template.csv Plantilla de columnas para Google Sheets
```

## Scripts

```bash
npm start
npm run dev
```


## Despliegue en Vercel

Este proyecto ya incluye un `server.js` en la raíz para que Vercel pueda detectar la aplicación Express.

Variables de entorno necesarias en Vercel:

```env
GOOGLE_SHEETS_API_KEY=tu_clave_real
SPREADSHEET_ID=tu_id_de_google_sheets
SHEETS_RANGE=A2:K
WHATSAPP_NUMBER=524451032072
```

En Vercel, importa el repositorio desde GitHub y deja la configuración por defecto. No subas tu archivo `.env` al repositorio.
