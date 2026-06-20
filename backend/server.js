require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 60) * 1000;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEMO_DATA_PATH = path.join(__dirname, '..', 'data', 'demo-products.json');

let cache = {
  expiresAt: 0,
  data: null,
  source: 'none'
};

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Ejemplo de tienda digital básica' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    storeName: 'Ejemplo de tienda digital básica',
    whatsappNumber: process.env.WHATSAPP_NUMBER || '524451032072'
  });
});

app.get('/api/products', async (_req, res) => {
  try {
    const result = await getProducts();
    res.json(result);
  } catch (error) {
    console.error('[api/products]', error);
    res.status(500).json({
      ok: false,
      source: 'error',
      message: 'No se pudo cargar el catálogo. Revisa la configuración del backend.',
      products: []
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

async function getProducts() {
  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    return cache.data;
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;
  const range = process.env.SHEETS_RANGE || 'A2:K';

  if (apiKey && spreadsheetId && apiKey !== 'pon_tu_api_key_aqui') {
    try {
      const products = await fetchProductsFromGoogleSheets({ apiKey, spreadsheetId, range });
      const response = {
        ok: true,
        source: 'google-sheets',
        updatedAt: new Date().toISOString(),
        products
      };
      cache = { expiresAt: now + CACHE_TTL_MS, data: response, source: 'google-sheets' };
      return response;
    } catch (error) {
      console.warn('[Google Sheets] Se usará catálogo demo por respaldo:', error.message);
    }
  }

  const products = await loadDemoProducts();
  const response = {
    ok: true,
    source: 'demo-local',
    updatedAt: new Date().toISOString(),
    products
  };
  cache = { expiresAt: now + CACHE_TTL_MS, data: response, source: 'demo-local' };
  return response;
}

async function fetchProductsFromGoogleSheets({ apiKey, spreadsheetId, range }) {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Error al consultar Google Sheets');
  }

  const rows = Array.isArray(payload.values) ? payload.values : [];
  return normalizeRows(rows);
}

async function loadDemoProducts() {
  const raw = await fs.readFile(DEMO_DATA_PATH, 'utf8');
  const products = JSON.parse(raw);
  return products.map((product, index) => normalizeProductObject(product, index));
}

function normalizeRows(rows) {
  return rows
    .filter(row => row && row.some(Boolean))
    .map((row, index) => normalizeSheetRow(row, index))
    .filter(product => product.available !== false || product.name);
}

function normalizeSheetRow(row, index) {
  // Nuevo formato recomendado: A:K
  // Departamento | Categoría | Subcategoría | Nombre | Precio | Imagen | Tallas | Etiqueta | Descripción | Disponible | Orden
  if (row.length >= 6) {
    const [department, category, subcategory, name, price, image, sizes, tag, description, available, sortOrder] = row;
    return {
      id: slugify(`${department || 'general'}-${subcategory || category || 'general'}-${name || 'producto'}-${index}`),
      department: cleanText(department) || 'General',
      category: cleanText(category) || 'General',
      subcategory: cleanText(subcategory) || cleanText(category) || 'General',
      name: cleanText(name) || `Producto ${index + 1}`,
      price: parsePrice(price),
      image: normalizeImagePath(image),
      sizes: parseSizes(sizes),
      tag: cleanText(tag) || 'Disponible',
      description: cleanText(description) || 'Prenda disponible para pedido directo.',
      available: parseAvailable(available),
      sortOrder: parseOrder(sortOrder, index)
    };
  }

  // Compatibilidad con el formato anterior: A:E
  // Categoría | Nombre | Precio | Imagen | Tallas
  const [category, name, price, image, sizes] = row;
  return {
    id: slugify(`${category || 'general'}-${name || 'producto'}-${index}`),
    department: 'General',
    category: cleanText(category) || 'General',
    subcategory: cleanText(category) || 'General',
    name: cleanText(name) || `Producto ${index + 1}`,
    price: parsePrice(price),
    image: normalizeImagePath(image),
    sizes: parseSizes(sizes),
    tag: 'Disponible',
    description: 'Prenda disponible para pedido directo.',
    available: true,
    sortOrder: index + 1
  };
}

function normalizeProductObject(product, index) {
  return {
    id: product.id || slugify(`${product.department || 'general'}-${product.subcategory || product.category || 'general'}-${product.name || 'producto'}-${index}`),
    department: cleanText(product.department) || 'General',
    category: cleanText(product.category) || 'General',
    subcategory: cleanText(product.subcategory) || cleanText(product.category) || 'General',
    name: cleanText(product.name) || `Producto ${index + 1}`,
    price: parsePrice(product.price),
    image: normalizeImagePath(product.image),
    sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : parseSizes(product.sizes),
    tag: cleanText(product.tag) || 'Disponible',
    description: cleanText(product.description) || 'Prenda disponible para pedido directo.',
    available: product.available === undefined ? true : Boolean(product.available),
    sortOrder: parseOrder(product.sortOrder, index)
  };
}


function normalizeImagePath(value) {
  const image = cleanText(value);
  if (!image) return '/assets/producto-demo-1.svg';
  if (/^(https?:)?\/\//i.test(image) || image.startsWith('/') || image.startsWith('data:')) {
    return image;
  }
  return `/assets/${image}`;
}

function cleanText(value) {
  return String(value || '').trim();
}

function parsePrice(value) {
  const normalized = String(value || '0').replace(/[^0-9.]/g, '');
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : 0;
}

function parseSizes(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  const sizes = String(value || '')
    .split(',')
    .map(size => size.trim())
    .filter(Boolean);

  return sizes.length ? sizes : ['Unitalla'];
}

function parseAvailable(value) {
  const text = cleanText(value).toLowerCase();
  if (!text) return true;
  return !['no', 'false', 'falso', '0', 'agotado', 'sin stock'].includes(text);
}

function parseOrder(value, index) {
  const order = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(order) ? order : index + 1;
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
  });
}

module.exports = app;
