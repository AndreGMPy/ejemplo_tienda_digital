const state = {
  products: [],
  filteredProducts: [],
  activeDepartment: 'Todos',
  activeSubcategory: 'Todos',
  search: '',
  sort: 'featured',
  whatsappNumber: '524451032072',
  cart: loadCart()
};

const elements = {
  menuButton: document.querySelector('#menuButton'),
  navLinks: document.querySelector('#navLinks'),
  productGrid: document.querySelector('#productGrid'),
  template: document.querySelector('#productCardTemplate'),
  departmentFilters: document.querySelector('#departmentFilters'),
  subcategoryFilters: document.querySelector('#subcategoryFilters'),
  mobileDepartmentFilters: document.querySelector('#mobileDepartmentFilters'),
  mobileSubcategoryFilters: document.querySelector('#mobileSubcategoryFilters'),
  searchInput: document.querySelector('#searchInput'),
  sortSelect: document.querySelector('#sortSelect'),
  catalogFeedback: document.querySelector('#catalogFeedback'),
  cartBadge: document.querySelector('#cartBadge'),
  floatingCartCount: document.querySelector('#floatingCartCount'),
  openCartButton: document.querySelector('#openCartButton'),
  contactCartButton: document.querySelector('#contactCartButton'),
  floatingCartButton: document.querySelector('#floatingCartButton'),
  cartDrawer: document.querySelector('#cartDrawer'),
  cartBackdrop: document.querySelector('#cartBackdrop'),
  closeCartButton: document.querySelector('#closeCartButton'),
  clearCartButton: document.querySelector('#clearCartButton'),
  sendOrderButton: document.querySelector('#sendOrderButton'),
  cartItems: document.querySelector('#cartItems'),
  cartTotal: document.querySelector('#cartTotal'),
  imageDialog: document.querySelector('#imageDialog'),
  dialogImage: document.querySelector('#dialogImage'),
  closeImageDialog: document.querySelector('#closeImageDialog')
};

init();

async function init() {
  bindEvents();
  updateCartUI();
  await loadConfig();
  await loadProducts();
}

function bindEvents() {
  elements.menuButton.addEventListener('click', toggleMenu);
  elements.navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  document.querySelectorAll('[data-department-link]').forEach(button => {
    button.addEventListener('click', () => {
      setDepartment(button.dataset.departmentLink || 'Todos');
      scrollToCatalog();
      closeMenu();
    });
  });

  document.querySelectorAll('[data-subcategory-link]').forEach(button => {
    button.addEventListener('click', () => {
      state.activeSubcategory = button.dataset.subcategoryLink || 'Todos';
      renderFilters();
      applyFilters();
      scrollToCatalog();
    });
  });

  elements.searchInput.addEventListener('input', event => {
    state.search = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  elements.sortSelect.addEventListener('change', event => {
    state.sort = event.target.value;
    applyFilters();
  });

  elements.openCartButton.addEventListener('click', openCart);
  elements.contactCartButton.addEventListener('click', openCart);
  elements.floatingCartButton.addEventListener('click', openCart);
  elements.closeCartButton.addEventListener('click', closeCart);
  elements.cartBackdrop.addEventListener('click', closeCart);
  elements.clearCartButton.addEventListener('click', clearCart);
  elements.sendOrderButton.addEventListener('click', sendOrderToWhatsApp);
  elements.closeImageDialog.addEventListener('click', () => elements.imageDialog.close());

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      closeCart();
      if (elements.imageDialog.open) elements.imageDialog.close();
    }
  });
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Config no disponible');
    const config = await response.json();
    state.whatsappNumber = config.whatsappNumber || state.whatsappNumber;
  } catch (error) {
    console.warn(error.message);
  }
}

async function loadProducts() {
  elements.catalogFeedback.textContent = 'Cargando prendas disponibles...';

  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('No se pudo cargar el catálogo');

    const payload = await response.json();
    state.products = normalizeProducts(Array.isArray(payload.products) ? payload.products : []);

    renderFilters();
    applyFilters();
  } catch (error) {
    elements.catalogFeedback.textContent = 'No pudimos cargar el catálogo por ahora. Inténtalo nuevamente en unos minutos.';
    console.error(error);
  }
}

function normalizeProducts(products) {
  return products.map((product, index) => ({
    id: product.id || `producto-${index}`,
    department: clean(product.department) || 'General',
    category: clean(product.category) || 'General',
    subcategory: clean(product.subcategory) || clean(product.category) || 'General',
    name: clean(product.name) || `Producto ${index + 1}`,
    price: Number(product.price || 0),
    image: clean(product.image) || '/assets/producto-demo-1.svg',
    sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Unitalla'],
    tag: clean(product.tag) || 'Disponible',
    description: clean(product.description) || 'Prenda disponible para pedido directo.',
    available: product.available !== false,
    sortOrder: Number.isFinite(Number(product.sortOrder)) ? Number(product.sortOrder) : index + 1
  }));
}

function renderFilters() {
  renderDepartmentFilters(elements.departmentFilters, 'vertical');
  renderDepartmentFilters(elements.mobileDepartmentFilters, 'mobile');
  renderSubcategoryFilters(elements.subcategoryFilters, 'vertical');
  renderSubcategoryFilters(elements.mobileSubcategoryFilters, 'mobile');
}

function renderDepartmentFilters(container, variant) {
  const departments = ['Todos', ...unique(state.products.map(product => product.department))];
  container.innerHTML = '';

  departments.forEach(department => {
    const count = department === 'Todos'
      ? state.products.length
      : state.products.filter(product => product.department === department).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${variant === 'vertical' ? 'filter-button' : 'category-button'}${department === state.activeDepartment ? ' active' : ''}`;
    button.innerHTML = `<span>${escapeHtml(department)}</span><small>${count}</small>`;
    button.addEventListener('click', () => setDepartment(department));
    container.appendChild(button);
  });
}

function renderSubcategoryFilters(container, variant) {
  const visibleProducts = state.activeDepartment === 'Todos'
    ? state.products
    : state.products.filter(product => product.department === state.activeDepartment);

  const subcategories = ['Todos', ...unique(visibleProducts.map(product => product.subcategory))];

  if (!subcategories.includes(state.activeSubcategory)) {
    state.activeSubcategory = 'Todos';
  }

  container.innerHTML = '';

  subcategories.forEach(subcategory => {
    const count = subcategory === 'Todos'
      ? visibleProducts.length
      : visibleProducts.filter(product => product.subcategory === subcategory).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${variant === 'vertical' ? 'filter-button subtle' : 'category-button'}${subcategory === state.activeSubcategory ? ' active' : ''}`;
    button.innerHTML = `<span>${escapeHtml(subcategory)}</span><small>${count}</small>`;
    button.addEventListener('click', () => {
      state.activeSubcategory = subcategory;
      renderFilters();
      applyFilters();
    });
    container.appendChild(button);
  });
}

function setDepartment(department) {
  state.activeDepartment = department;
  state.activeSubcategory = 'Todos';
  renderFilters();
  applyFilters();
}

function applyFilters() {
  const filtered = state.products.filter(product => {
    const matchesDepartment = state.activeDepartment === 'Todos' || product.department === state.activeDepartment;
    const matchesSubcategory = state.activeSubcategory === 'Todos' || product.subcategory === state.activeSubcategory;
    const query = `${product.name} ${product.department} ${product.category} ${product.subcategory} ${product.tag} ${product.description}`.toLowerCase();
    const matchesSearch = !state.search || query.includes(state.search);
    return matchesDepartment && matchesSubcategory && matchesSearch;
  });

  state.filteredProducts = sortProducts(filtered, state.sort);
  renderProducts();
}

function sortProducts(products, sortMode) {
  const copy = [...products];

  if (sortMode === 'price-asc') {
    return copy.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  }

  if (sortMode === 'price-desc') {
    return copy.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  if (sortMode === 'name-asc') {
    return copy.sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
  }

  return copy.sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
}

function renderProducts() {
  elements.productGrid.innerHTML = '';

  if (!state.filteredProducts.length) {
    elements.catalogFeedback.textContent = 'No encontramos prendas con esa búsqueda.';
    return;
  }

  const label = [
    state.activeDepartment !== 'Todos' ? state.activeDepartment : 'Todos los departamentos',
    state.activeSubcategory !== 'Todos' ? state.activeSubcategory : null
  ].filter(Boolean).join(' · ');

  elements.catalogFeedback.textContent = `${state.filteredProducts.length} producto${state.filteredProducts.length === 1 ? '' : 's'} en ${label}.`;

  state.filteredProducts.forEach(product => {
    const node = elements.template.content.cloneNode(true);
    const card = node.querySelector('.product-card');
    const imageButton = node.querySelector('.product-image-button');
    const image = node.querySelector('.product-image');
    const ribbon = node.querySelector('.product-ribbon');
    const department = node.querySelector('.product-department');
    const category = node.querySelector('.product-category');
    const name = node.querySelector('.product-name');
    const description = node.querySelector('.product-description');
    const price = node.querySelector('.product-price');
    const sizeSelect = node.querySelector('.size-select');
    const addButton = node.querySelector('.add-button');

    image.src = product.image;
    image.alt = product.name;
    image.onerror = () => { image.onerror = null; image.src = '/assets/producto-demo-1.svg'; };
    ribbon.textContent = product.available ? product.tag : 'Agotado';
    department.textContent = product.department;
    category.textContent = product.subcategory;
    name.textContent = product.name;
    description.textContent = product.description;
    price.textContent = formatMoney(product.price);

    (product.sizes || ['Unitalla']).forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      sizeSelect.appendChild(option);
    });

    if (!product.available) {
      card.classList.add('sold-out');
      addButton.disabled = true;
      addButton.textContent = 'Sin disponibilidad';
    }

    imageButton.addEventListener('click', () => openImage(product));
    addButton.addEventListener('click', () => {
      addToCart({ ...product, selectedSize: sizeSelect.value });
      addButton.textContent = 'Agregado ✓';
      setTimeout(() => { addButton.textContent = 'Agregar al carrito'; }, 900);
      card.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.985)' },
        { transform: 'scale(1)' }
      ], { duration: 220, easing: 'ease-out' });
    });

    elements.productGrid.appendChild(node);
  });
}

function addToCart(product) {
  const item = {
    cartId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    id: product.id,
    name: product.name,
    department: product.department,
    category: product.category,
    subcategory: product.subcategory,
    price: Number(product.price || 0),
    image: product.image,
    selectedSize: product.selectedSize || 'Unitalla'
  };

  state.cart.push(item);
  saveCart();
  updateCartUI();
}

function removeFromCart(cartId) {
  state.cart = state.cart.filter(item => item.cartId !== cartId);
  saveCart();
  updateCartUI();
}

function clearCart() {
  if (!state.cart.length) return;
  const confirmed = window.confirm('¿Quieres vaciar el carrito?');
  if (!confirmed) return;

  state.cart = [];
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const count = state.cart.length;
  const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0), 0);

  elements.cartBadge.textContent = count;
  elements.floatingCartCount.textContent = count;
  elements.cartTotal.textContent = formatMoney(total);
  renderCartItems();
}

function renderCartItems() {
  elements.cartItems.innerHTML = '';

  if (!state.cart.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-cart';
    empty.textContent = 'Tu carrito está vacío. Agrega tus prendas favoritas del catálogo.';
    elements.cartItems.appendChild(empty);
    return;
  }

  state.cart.forEach(item => {
    const row = document.createElement('article');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${escapeHtml(item.image || '/assets/producto-demo-1.svg')}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null;this.src='/assets/producto-demo-1.svg';">
      <div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.department || 'General')} · ${escapeHtml(item.subcategory || item.category || 'General')}</p>
        <p>Talla: ${escapeHtml(item.selectedSize)} · ${formatMoney(item.price)}</p>
      </div>
      <button class="remove-item" type="button" aria-label="Quitar ${escapeHtml(item.name)}">×</button>
    `;
    row.querySelector('.remove-item').addEventListener('click', () => removeFromCart(item.cartId));
    elements.cartItems.appendChild(row);
  });
}

function sendOrderToWhatsApp() {
  if (!state.cart.length) {
    alert('Tu carrito está vacío.');
    return;
  }

  const total = state.cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const lines = state.cart.map((item, index) => {
    return `${index + 1}. ${item.name} | ${item.department || 'General'} / ${item.subcategory || item.category || 'General'} | Talla: ${item.selectedSize} | ${formatMoney(item.price)}`;
  });

  const message = [
    'Hola, quiero hacer este pedido:',
    '',
    ...lines,
    '',
    `Total estimado: ${formatMoney(total)}`,
    '',
    '¿Me confirmas disponibilidad, colores y forma de entrega?'
  ].join('\n');

  const url = `https://wa.me/${state.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openCart() {
  elements.cartDrawer.classList.add('open');
  elements.cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
}

function closeCart() {
  elements.cartDrawer.classList.remove('open');
  elements.cartDrawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
}

function openImage(product) {
  elements.dialogImage.src = product.image || '/assets/producto-demo-1.svg';
  elements.dialogImage.alt = product.name;
  if (typeof elements.imageDialog.showModal === 'function') {
    elements.imageDialog.showModal();
  }
}

function toggleMenu() {
  const isOpen = elements.navLinks.classList.toggle('open');
  elements.menuButton.setAttribute('aria-expanded', String(isOpen));
}

function closeMenu() {
  elements.navLinks.classList.remove('open');
  elements.menuButton.setAttribute('aria-expanded', 'false');
}

function scrollToCatalog() {
  document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('carrito-tienda-demo')) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem('carrito-tienda-demo', JSON.stringify(state.cart));
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function clean(value) {
  return String(value || '').trim();
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
