import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
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

// =========================================================================
// --- OBSERVADOR DE ESTADO (BLINDADO) ---
// =========================================================================
onAuthStateChanged(auth, async (user) => {
    const btnUser = document.getElementById('btn-user-status');
    const btnAdminPanel = document.getElementById('btn-admin-panel');
    
    if (btnAdminPanel) btnAdminPanel.style.display = "none";

    if (user) {
        usuarioActual = user;
        const nombreMostrar = user.displayName || user.email.split('@')[0];
        if (btnUser) btnUser.innerText = `👤 Hola, ${nombreMostrar}`;
        
        // 🚀 SOLUCIÓN: Si es tu correo, te da el botón inmediatamente sin esperar a Firestore
        if (user.email === "gustavomachuca998@gmail.com") {
            if (btnAdminPanel) btnAdminPanel.style.display = "block";
            cargarUsuariosEnTiempoReal();
        } else {
            // Verificación secundaria para otros administradores asignados por ti
            try {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists() && userDoc.data().rol === "admin") {
                    if (btnAdminPanel) btnAdminPanel.style.display = "block";
                }
            } catch (e) {
                console.warn("Firestore bloqueado u oculto. Modo desarrollo activo.");
            }
        }
    } else {
        usuarioActual = null;
        if (btnUser) btnUser.innerText = "👤 Mi Cuenta";
    }
    mostrarProductos(); 
});

// =========================================================================
// --- MONITORIZACIÓN DE PRODUCTOS (CON CAPTURA DE ERRORES) ---
// =========================================================================
try {
    onSnapshot(collection(db, "productos"), (snapshot) => {
        productosLocales = [];
        snapshot.forEach((docSnap) => {
            productosLocales.push({ id: docSnap.id, ...docSnap.data() });
        });
        mostrarProductos();
    }, (error) => {
        console.error("Falta activar las reglas de Firestore en la consola:", error);
        mostrarProductos();
    });
} catch(e) {
    console.error(e);
}

function mostrarProductos() {
    const grid = document.getElementById('contenedor-productos');
    if (!grid) return;
    grid.innerHTML = "";

    if (productosLocales.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #777; font-style: italic; padding: 40px;">No hay productos cargados en el catálogo actualmente.</p>`;
        return;
    }

    productosLocales.forEach((p) => {
        const card = document.createElement('div');
        card.className = "product-card";
        
        const esAdmin = usuarioActual && (usuarioActual.email === "gustavomachuca998@gmail.com");

        card.innerHTML = `
            <div class="product-icon-frame">👜</div>
            <div class="product-info">
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
// --- MANEJO DEL FORMULARIO DE PRODUCTOS ---
// =========================================================================
document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-index').value;
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseInt(document.getElementById('prod-precio').value);
    const desc = document.getElementById('prod-desc').value;

    try {
        if (id === "") {
            const nuevoDocRef = doc(collection(db, "productos"));
            await setDoc(nuevoDocRef, { nombre, precio, desc });
            alert("¡Bolso añadido exitosamente!");
        } else {
            await updateDoc(doc(db, "productos", id), { nombre, precio, desc });
            alert("¡Producto actualizado!");
            document.getElementById('btn-submit-form').innerText = "Guardar en Catálogo";
        }
        document.getElementById('form-producto').reset();
        document.getElementById('prod-index').value = "";
    } catch (error) {
        alert("Error de escritura en base de datos. Revisa tus Reglas de Firestore: " + error.message);
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
    document.getElementById('modal-detail-title').innerText = p.nombre;
    document.getElementById('modal-detail-price').innerText = `$${p.precio.toLocaleString('es-CL')}`;
    document.getElementById('modal-detail-desc').innerText = p.desc;
    document.getElementById('modal-detalle').classList.remove('hide');
};

// =========================================================================
// --- CONTROL DE USUARIOS (SÚPER ADMIN) ---
// =========================================================================
function cargarUsuariosEnTiempoReal() {
    try {
        onSnapshot(collection(db, "usuarios"), (snapshot) => {
            const tbody = document.getElementById('tabla-usuarios-listado');
            if (!tbody) return;
            tbody.innerHTML = "";
            
            snapshot.forEach((docSnap) => {
                const u = docSnap.data();
                if (u.correo === auth.currentUser.email) return; 

                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #E1BEE7";
                tr.innerHTML = `
                    <td style="padding: 6px;"><strong>${u.nombre}</strong><br><span style="color:#777; font-size:11px;">${u.correo}</span></td>
                    <td style="padding: 6px;"><span style="padding: 2px 6px; border-radius:4px; font-weight:bold; font-size:11px; background:${u.rol === 'admin' ? '#CE93D8' : '#FFF'}">${u.rol.toUpperCase()}</span></td>
                    <td style="padding: 6px; text-align: center; display:flex; gap: 4px; justify-content: center;">
                        <button class="btn-cambiar-rol" data-id="${u.uid}" data-rol="${u.rol}" style="background:#4A148C; color:#fff; border:none; padding:4px 6px; border-radius:4px; cursor:pointer; font-size:11px;">🔄 Rol</button>
                        <button class="btn-reset-pass" data-email="${u.correo}" style="background:#FFB300; color:#fff; border:none; padding:4px 6px; border-radius:4px; cursor:pointer; font-size:11px;">🔑</button>
                        <button class="btn-eliminar-usuario" data-id="${u.uid}" style="background:#E53935; color:#fff; border:none; padding:4px 6px; border-radius:4px; cursor:pointer; font-size:11px;">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            declararEventosControlUsuarios();
        });
    } catch (err) {
        console.warn(err);
    }
}

function declararEventosControlUsuarios() {
    document.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.onclick = async (e) => {
            const uid = e.currentTarget.dataset.id;
            const rolActual = e.currentTarget.dataset.rol;
            const nuevoRol = rolActual === "admin" ? "cliente" : "admin";
            await updateDoc(doc(db, "usuarios", uid), { rol: nuevoRol });
        };
    });

    document.querySelectorAll('.btn-reset-pass').forEach(btn => {
        btn.onclick = async (e) => {
            const email = e.currentTarget.dataset.email;
            if (confirm(`¿Enviar link de recuperación de clave a ${email}?`)) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    alert("Enlace enviado.");
                } catch (error) {
                    alert(error.message);
                }
            }
        };
    });

    document.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.onclick = async (e) => {
            const uid = e.currentTarget.dataset.id;
            if (confirm("¿Eliminar perfil de usuario de la base de datos?")) {
                await deleteDoc(doc(db, "usuarios", uid));
            }
        };
    });
}

// =========================================================================
// --- REGISTRO DE CLIENTES ---
// =========================================================================
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });

        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
            uid: userCredential.user.uid,
            nombre: displayName,
            correo: email,
            rol: "cliente"
        });

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
// --- INTERRUPTORES DE APERTURA DEL NUEVO MENU PANEL ADMIN ---
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
