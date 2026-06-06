import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    collection, 
    onSnapshot, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCnJON-05hFqrGaDWXYiUtQ2I5M_kPreE",
  authDomain: "tienda-ivonne.firebaseapp.com",
  projectId: "tienda-ivonne",
  storageBucket: "tienda-ivonne.firebasestorage.app",
  messagingSenderId: "735940912326",
  appId: "1:735940912326:web:5f1c6b3982c1e70c3163c7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let usuarioActual = null;
let productosLocales = [];
// Inicialización del arreglo global de Favoritos desde localStorage
let favoritos = JSON.parse(localStorage.getItem('tienda_favoritos')) || [];

const convertirImagenABase64 = (archivo) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

// =========================================================================
// --- 🔐 CONTROL DE ACCESO ÚNICO (SOLO TÚ ERES ADMIN) ---
// =========================================================================
onAuthStateChanged(auth, (user) => {
    const btnUser = document.getElementById('btn-user-status');
    const btnAdminPanel = document.getElementById('btn-admin-panel');
    
    if (btnAdminPanel) btnAdminPanel.style.display = "none";

    if (user) {
        usuarioActual = user;
        const nombreMostrar = user.displayName || user.email.split('@')[0];
        if (btnUser) btnUser.innerText = `👤 Hola, ${nombreMostrar}`;
        
        if (user.email === "gustavomachuca998@gmail.com") {
            if (btnAdminPanel) btnAdminPanel.style.display = "block";
        }
    } else {
        usuarioActual = null;
        if (btnUser) btnUser.innerText = "👤 Mi Cuenta";
    }
    mostrarProductos(); 
});

// =========================================================================
// --- MONITORIZACIÓN DE PRODUCTOS ---
// =========================================================================
try {
    onSnapshot(collection(db, "productos"), (snapshot) => {
        productosLocales = [];
        snapshot.forEach((docSnap) => {
            productosLocales.push({ id: docSnap.id, ...docSnap.data() });
        });
        mostrarProductos();
    }, (error) => {
        console.error("Error en el flujo de productos:", error);
    });
} catch(e) {
    console.error(e);
}

function mostrarProductos() {
    const grid = document.getElementById('contenedor-productos');
    if (!grid) return;
    grid.innerHTML = "";

    actualizarBadgeFavoritos();

    if (productosLocales.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777; font-style: italic; padding: 40px;">No hay productos en el catálogo.</p>`;
        return;
    }

    productosLocales.forEach((p) => {
        const card = document.createElement('div');
        card.className = "product-card";
        card.style.position = "relative"; // Necesario para posicionar de forma flotante el corazón
        
        const esAdmin = usuarioActual && (usuarioActual.email === "gustavomachuca998@gmail.com");
        const esFav = favoritos.includes(p.id);

        const contenedorMultimedia = p.urlImagen 
            ? `<img src="${p.urlImagen}" alt="${p.nombre}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px 12px 0 0; display: block;">`
            : `<div class="product-icon-frame">👜</div>`;

        card.innerHTML = `
            <!-- ❤️ BOTÓN FLOTANTE DE FAVORITOS EN LA ESQUINA DE LA TARJETA -->
            <button class="btn-toggle-fav" onclick="toggleFavorito('${p.id}', event)" style="position: absolute; top: 12px; right: 12px; background: white; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; font-size: 18px; z-index: 10; transition: transform 0.2s;">
                ${esFav ? '❤️' : '🤍'}
            </button>
            ${contenedorMultimedia}
            <div class="product-info" style="padding: 15px;">
                <h4>${p.nombre}</h4>
                <p class="price">$${p.precio.toLocaleString('es-CL')}</p>
                <div class="card-actions">
                    <button class="btn-primary" onclick="verDetalleProducto('${p.id}')">Ver Detalles</button>
                    ${esAdmin ? `
                        <button class="btn-edit" onclick="prepararEditar('${p.id}')">✏️</button>
                        <button class="btn-delete" onclick="eliminarProducto('${p.id}')">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// =========================================================================
// --- LÓGICA DEL SISTEMA DE FAVORITOS ---
// =========================================================================
window.toggleFavorito = function(id, event) {
    if(event) event.stopPropagation();
    
    const index = favoritos.indexOf(id);
    if (index === -1) {
        favoritos.push(id);
    } else {
        favoritos.splice(index, 1);
    }
    
    localStorage.setItem('tienda_favoritos', JSON.stringify(favoritos));
    mostrarProductos();
    
    if(!document.getElementById('modal-favoritos').classList.contains('hide')) {
        renderizarListaFavoritos();
    }
};

function actualizarBadgeFavoritos() {
    const badge = document.getElementById('fav-badge');
    if(!badge) return;
    if(favoritos.length > 0) {
        badge.innerText = favoritos.length;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

function renderizarListaFavoritos() {
    const contenedor = document.getElementById('lista-favoritos-contenido');
    if(!contenedor) return;
    contenedor.innerHTML = "";

    const itemsFavoritos = productosLocales.filter(p => favoritos.includes(p.id));

    if(itemsFavoritos.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; color: #999; font-style: italic; padding: 20px 0;">No tienes artículos guardados todavía.</p>`;
        return;
    }

    itemsFavoritos.forEach(p => {
        const itemRow = document.createElement('div');
        itemRow.style = "display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;";
        
        const imgTag = p.urlImagen 
            ? `<img src="${p.urlImagen}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">`
            : `<div style="font-size: 24px; width: 50px; text-align: center;">👜</div>`;

        itemRow.innerHTML = `
            ${imgTag}
            <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nombre}</h4>
                <p style="margin: 3px 0 0 0; color: #D81B60; font-weight: bold; font-size: 13px;">$${p.precio.toLocaleString('es-CL')}</p>
            </div>
            <button onclick="verDetalleDesdeFav('${p.id}')" style="background: #4A148C; color: white; border: none; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; font-weight: bold;">Ver</button>
            <button onclick="toggleFavorito('${p.id}')" style="background: none; border: none; cursor: pointer; font-size: 16px;">❌</button>
        `;
        contenedor.appendChild(itemRow);
    });
}

window.verDetalleDesdeFav = function(id) {
    document.getElementById('modal-favoritos').classList.add('hide');
    verDetalleProducto(id);
};

// Eventos de control del modal de Favoritos
document.getElementById('btn-favoritos').addEventListener('click', () => {
    renderizarListaFavoritos();
    document.getElementById('modal-favoritos').classList.remove('hide');
});

// =========================================================================
// --- GESTIÓN DEL CATÁLOGO DE PRODUCTOS (CONSERVADO COMPLETO) ---
// =========================================================================
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-form');
    
    const id = document.getElementById('prod-index').value;
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseInt(document.getElementById('prod-precio').value);
    const desc = document.getElementById('prod-desc').value;
    const archivoImagen = document.getElementById('prod-imagen').files[0];

    if (archivoImagen && archivoImagen.size > 750000) {
        alert("⚠️ La imagen es muy pesada para el plan gratuito. Por favor, usa una foto comprimida o de menos de 750 KB.");
        btnSubmit.innerText = id === "" ? "Guardar en Catálogo" : "Actualizar Producto";
        btnSubmit.disabled = false;
        return;
    }

    btnSubmit.innerText = "Guardando artículo...";
    btnSubmit.disabled = true;

    try {
        let urlImagen = "";
        
        if (id !== "") {
            const productoExistente = productosLocales.find(prod => prod.id === id);
            if (productoExistente && productoExistente.urlImagen) {
                urlImagen = productoExistente.urlImagen;
            }
        }

        if (archivoImagen) {
            urlImagen = await convertirImagenABase64(archivoImagen);
        }

        if (id === "") {
            const nuevoDocRef = doc(collection(db, "productos"));
            await setDoc(nuevoDocRef, { nombre, precio, desc, urlImagen });
            alert("¡Bolso añadido exitosamente!");
        } else {
            await updateDoc(doc(db, "productos", id), { nombre, precio, desc, urlImagen });
            alert("¡Producto actualizado con éxito!");
        }
        
        document.getElementById('form-producto').reset();
        document.getElementById('prod-index').value = "";
        cerrarModales();

    } catch (error) {
        alert("Error al guardar: " + error.message);
    } finally {
        btnSubmit.innerText = "Guardar en Catálogo";
        btnSubmit.disabled = false;
    }
});

window.prepararEditar = function(id) {
    const p = productosLocales.find(prod => prod.id === id);
    if (!p) return;
    document.getElementById('prod-index').value = p.id;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-desc').value = p.desc;
    document.getElementById('btn-submit-form').innerText = "Actualizar Producto";
    document.getElementById('modal-admin-dashboard').classList.remove('hide');
};

window.eliminarProducto = async function(id) {
    if (confirm("¿Quitar este bolso del catálogo?")) {
        try {
            await deleteDoc(doc(db, "productos", id));
        } catch (error) {
            alert(error.message);
        }
    }
};

window.verDetalleProducto = function(id) {
    const p = productosLocales.find(prod => prod.id === id);
    if (!p) return;
    
    const mediaBox = document.getElementById('modal-detail-media-box');
    if (mediaBox) {
        mediaBox.innerHTML = p.urlImagen 
            ? `<img src="${p.urlImagen}" alt="${p.nombre}" style="width:100%; max-height:280px; object-fit:contain; border-radius:8px; margin-bottom:15px; display:block;">`
            : `<span class="big-icon" style="font-size:55px; display:block; margin-bottom:15px; text-align:center;">👜</span>`;
    }

    document.getElementById('modal-detail-title').innerText = p.nombre;
    document.getElementById('modal-detail-price').innerText = `$${p.precio.toLocaleString('es-CL')}`;
    document.getElementById('modal-detail-desc').innerText = p.desc;
    document.getElementById('modal-detalle').classList.remove('hide');
};

// =========================================================================
// --- AUTENTICACIÓN SIMPLIFICADA DE USUARIOS ---
// =========================================================================
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });

        alert(`¡Cuenta creada con éxito!`);
        cerrarModales();
        document.getElementById('form-register').reset();
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("¡Sesión iniciada!");
        cerrarModales();
        document.getElementById('form-login').reset();
    } catch (error) {
        alert("Credenciales incorrectas.");
    }
});

// =========================================================================
// --- NAVEGACIÓN GENERAL Y MODALES ---
// =========================================================================
document.getElementById('btn-admin-panel').addEventListener('click', () => {
    document.getElementById('modal-admin-dashboard').classList.remove('hide');
});

document.getElementById('btn-cerrar-admin-dashboard').addEventListener('click', () => {
    document.getElementById('modal-admin-dashboard').classList.add('hide');
});

if(document.getElementById('btn-user-status')) {
    document.getElementById('btn-user-status').addEventListener('click', () => {
        if (usuarioActual) {
            if (confirm("¿Quieres cerrar sesión?")) signOut(auth);
        } else {
            document.getElementById('modal-auth').classList.remove('hide');
            document.getElementById('login-view').classList.remove('hide');
            document.getElementById('register-view').classList.add('hide');
        }
    });
}

document.getElementById('link-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-view').classList.add('hide');
    document.getElementById('register-view').classList.remove('hide');
});

document.getElementById('link-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-view').classList.add('hide');
    document.getElementById('login-view').classList.remove('hide');
});

window.cerrarModales = function() {
    document.getElementById('modal-auth').classList.add('hide');
    document.getElementById('modal-detalle').classList.add('hide');
    document.getElementById('modal-admin-dashboard').classList.add('hide');
    document.getElementById('modal-favoritos').classList.add('hide');
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', cerrarModales);
});
