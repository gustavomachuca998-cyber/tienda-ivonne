// Datos iniciales actualizados con el catálogo real de Ivonne
const productosPredeterminados = [
    { 
        nombre: "Bolso Dulces Gatos", 
        precio: 6000, 
        desc: "Hermoso bolso artesanal con diseño de gatitos, sistema de cierre ajustable con cordón y forro interior satinado gris.", 
        img: "img/bolso-gatos.jpg" 
    },
    { 
        nombre: "Bolso Eco Floral Plegable", 
        precio: 4500, 
        desc: "Práctico y elegante bolso tote con estampado de flores. Incluye broche y correa central para plegarlo y llevarlo enrollado a todas partes.", 
        img: "img/bolso-flores-1.jpg" 
    },
    { 
        nombre: "Catálogo de Telas Disponibles", 
        precio: 0, 
        desc: "¡Diseños personalizables! Elige tu patrón favorito para tus próximos bolsos: diseños de pugs con lentes, gatos de colores, patitas o corazones románticos.", 
        img: "img/telas-mascotas.jpg" 
    }
];

// Cargar productos desde el LocalStorage ("Base de Datos" del navegador) o usar los predeterminados
let productos = JSON.parse(localStorage.getItem('inventario_ivonne')) || productosPredeterminados;

// Estado interno para saber si el Administrador está autenticado en esta sesión
let modoAdminAutenticado = false;

// Guardar cambios en el almacenamiento local
function sincronizarLocalStorage() {
    localStorage.setItem('inventario_ivonne', JSON.stringify(productos));
}

// Renderizar el catálogo en la pantalla con el estilo Sodimac
function mostrarProductos(listaAFiltrar = productos) {
    const grid = document.getElementById('tienda-grid');
    
    if (listaAFiltrar.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px;">No se encontraron productos que coincidan con la búsqueda.</p>`;
        return;
    }

    grid.innerHTML = listaAFiltrar.map((p) => {
        // Encontrar el índice real dentro del array global 'productos'
        const originalIndex = productos.findIndex(item => item.nombre === p.nombre);
        
        return `
            <div class="product-card">
                <img src="${p.img}" alt="${p.nombre}">
                <div class="product-info">
                    <h4>${p.nombre}</h4>
                    <p class="price">$${p.precio.toLocaleString('es-CL')}</p>
                    <div class="card-actions">
                        <button class="btn-primary" onclick="verDetalles(${originalIndex})">Ver Detalles</button>
                        ${modoAdminAutenticado ? `
                            <button class="btn-edit" onclick="cargarEdicionProducto(${originalIndex})" title="Editar precio/contenido">✏️</button>
                            <button class="btn-delete" onclick="eliminarProducto(${originalIndex})" title="Eliminar producto">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filtro buscador superior estilo Sodimac
function filtrarProductos() {
    const textoBusqueda = document.getElementById('search-input').value.toLowerCase();
    const productosFiltrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(textoBusqueda) || 
        p.desc.toLowerCase().includes(textoBusqueda)
    );
    mostrarProductos(productosFiltrados);
}

// Control de apertura de Modales de Cliente
function abrirAuth(tipo) {
    cerrarModales();
    document.getElementById('auth-modal').classList.remove('hide');
    document.getElementById('login-view').classList.toggle('hide', tipo !== 'login');
    document.getElementById('register-view').classList.toggle('hide', tipo !== 'registro');
}

// Mostrar login de Administrador
function mostrarLoginAdmin() {
    cerrarModales();
    if (modoAdminAutenticado) {
        // Si ya está logueada, abre o cierra directo el panel de control
        document.getElementById('panel-admin').classList.toggle('hide');
    } else {
        document.getElementById('admin-login-modal').classList.remove('hide');
    }
}

// Verificar contraseña maestra del Administrador
function verificarPasswordAdmin() {
    const pass = document.getElementById('admin-password').value;
    
    // Contraseña por defecto para tu mamá: "admin123" (puedes cambiarla aquí)
    if (pass === "admin123") {
        modoAdminAutenticado = true;
        document.getElementById('panel-admin').classList.remove('hide');
        cerrarModales();
        mostrarProductos(); // Recarga tarjetas para habilitar botones de edición/borrado
        alert("¡Identidad Confirmada! Bienvenido al Panel de Gestión, Ivonne.");
    } else {
        alert("Contraseña incorrecta. Acceso denegado.");
    }
    document.getElementById('admin-password').value = "";
}

function cerrarPanelAdmin() {
    document.getElementById('panel-admin').classList.add('hide');
}

// CRUD: Guardar o Editar Producto (Panel de Mamá)
function guardarProducto(event) {
    event.preventDefault();
    
    const index = document.getElementById('prod-index').value;
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseInt(document.getElementById('prod-precio').value);
    const desc = document.getElementById('prod-desc').value;
    const img = document.getElementById('prod-img').value;

    const nuevoProducto = { nombre, precio, desc, img };

    if (index === "") {
        // Agregar nuevo
        productos.push(nuevoProducto);
        alert("¡Producto añadido exitosamente al catálogo!");
    } else {
        // Guardar edición
        productos[index] = nuevoProducto;
        alert("¡Producto actualizado correctamente!");
        document.getElementById('btn-submit-form').innerText = "Añadir al Catálogo";
        document.getElementById('btn-submit-form').classList.remove('btn-edit');
    }

    document.getElementById('form-producto').reset();
    document.getElementById('prod-index').value = "";
    
    sincronizarLocalStorage();
    mostrarProductos();
}

// CRUD: Cargar datos en el formulario para editar
function cargarEdicionProducto(index) {
    const p = productos[index];
    document.getElementById('prod-index').value = index;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-desc').value = p.desc;
    document.getElementById('prod-img').value = p.img;

    document.getElementById('btn-submit-form').innerText = "Guardar Cambios 💾";
    window.scrollTo({ top: document.getElementById('panel-admin').offsetTop - 100, behavior: 'smooth' });
}

// CRUD: Eliminar Producto
function eliminarProducto(index) {
    if (confirm(`¿Estás segura de que quieres eliminar "${productos[index].nombre}" del catálogo?`)) {
        productos.splice(index, 1);
        sincronizarLocalStorage();
        mostrarProductos();
    }
}

// Modal de detalles extendidos
function verDetalles(index) {
    const p = productos[index];
    document.getElementById('det-nombre').innerText = p.nombre;
    document.getElementById('det-descripcion').innerText = p.desc;
    document.getElementById('det-precio').innerText = `$${p.precio.toLocaleString('es-CL')}`;
    document.getElementById('det-img').src = p.img;
    document.getElementById('detalle-modal').classList.remove('hide');
}

function cerrarModales() {
    document.getElementById('auth-modal').classList.add('hide');
    document.getElementById('admin-login-modal').classList.add('hide');
    document.getElementById('detalle-modal').classList.add('hide');
}

// Funciones de simulación para clientes
function simularLoginCliente() { alert("Sesión de cliente iniciada correctamente (Simulación)."); cerrarModales(); }
function simularRegistroCliente() { alert("Cuenta de cliente creada de forma exitosa (Simulación)."); cerrarModales(); }

// Inicializar la tienda al cargar la página
mostrarProductos();
