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
const db = getFirestore(app); // Usamos solo Firestore (100% Gratis)

let usuarioActual = null;
let productosLocales = [];

// Helper para convertir la imagen seleccionada a una cadena de texto (Base64)
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

    if (productosLocales.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777; font-style: italic; padding: 40px;">No hay productos en el catálogo.</p>`;
        return;
    }

    productosLocales.forEach((p) => {
        const card = document.createElement('div');
        card.className = "product-card";
        
        const esAdmin = usuarioActual && (usuarioActual.email === "gustavomachuca998@gmail.com");

        const contenedorMultimedia = p.urlImagen 
            ? `<img src="${p.urlImagen}" alt="${p.nombre}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px 12px 0 0; display: block;">`
            : `<div class="product-icon-frame">👜</div>`;

        card.innerHTML = `
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
// --- GESTIÓN DEL CATÁLOGO DE PRODUCTOS (ACTUALIZADO Y PROTEGIDO) ---
// =========================================================================
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-form');
    
    const id = document.getElementById('prod-index').value;
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseInt(document.getElementById('prod-precio').value);
    const desc = document.getElementById('prod-desc').value;
    const archivoImagen = document.getElementById('prod-imagen').files[0];

    // 🛡️ FILTRO DE TAMAÑO: Evita que imágenes gigantes (como las de IA) bloqueen Firestore
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
        
        // Limpiamos el formulario
        document.getElementById('form-producto').reset();
        document.getElementById('prod-index').value = "";
        
        // 🚀 LA SOLUCIÓN: Cierra el panel de control automáticamente para ver los cambios reflejados
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
    
    // 🚀 LA LÍNEA QUE FALTA: Hace visible el panel de administración al presionar el lápiz
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
};

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', cerrarModales);
});
