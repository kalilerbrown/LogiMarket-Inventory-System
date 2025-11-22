/**
 * MÓDULO DE AJUSTES DE INVENTARIO
 * Gestión de ajustes positivos y negativos del inventario
 */

// API Base URL
const API_URL = 'php/ajustes.php';

// Estado del módulo
let ajusteEnEdicion = null;

/**
 * Inicializar el módulo cuando se carga
 */
document.addEventListener('DOMContentLoaded', function() {
    cargarProductosParaAjuste();
    cargarAjustes();
    configurarFormularioAjuste();
    establecerFechaActual();
    
    // Actualizar stock cuando se selecciona un producto
    document.getElementById('ajuste-producto').addEventListener('change', function() {
        mostrarStockActual(this.value);
    });
});

/**
 * Establecer la fecha actual por defecto
 */
function establecerFechaActual() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('ajuste-fecha').value = hoy;
}

/**
 * Cargar productos disponibles en el select
 */
async function cargarProductosParaAjuste() {
    try {
        const response = await fetch('../php/productos.php?action=listar');
        const data = await response.json();
        
        const select = document.getElementById('ajuste-producto');
        select.innerHTML = '<option value="">Seleccione un producto...</option>';
        
        if (data.success && data.data.length > 0) {
            data.data.forEach(producto => {
                const option = document.createElement('option');
                option.value = producto.id;
                option.textContent = `${producto.codigo} - ${producto.descripcion} (Stock: ${producto.stock_actual})`;
                option.dataset.stock = producto.stock_actual;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarAlerta('Error al cargar los productos', 'danger');
    }
}

/**
 * Mostrar stock actual del producto seleccionado
 */
function mostrarStockActual(productoId) {
    const select = document.getElementById('ajuste-producto');
    const infoDiv = document.getElementById('info-stock-ajuste');
    const stockDisplay = document.getElementById('stock-actual-display');
    
    if (productoId) {
        const option = select.options[select.selectedIndex];
        const stock = option.dataset.stock || 0;
        stockDisplay.textContent = stock;
        infoDiv.style.display = 'flex';
    } else {
        infoDiv.style.display = 'none';
    }
}

/**
 * Configurar el formulario de ajuste
 */
function configurarFormularioAjuste() {
    const form = document.getElementById('form-ajuste');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar formulario
        if (!validarFormularioAjuste()) {
            return;
        }
        
        // Obtener datos del formulario
        const formData = {
            producto_id: document.getElementById('ajuste-producto').value,
            tipo_ajuste: document.getElementById('ajuste-tipo').value,
            cantidad: parseInt(document.getElementById('ajuste-cantidad').value),
            fecha: document.getElementById('ajuste-fecha').value,
            razon: document.getElementById('ajuste-razon').value,
            comentarios: document.getElementById('ajuste-comentarios').value
        };
        
        // Confirmar antes de registrar
        const mensaje = `¿Confirma el ajuste ${formData.tipo_ajuste} de ${formData.cantidad} unidades?`;
        if (!confirm(mensaje)) {
            return;
        }
        
        try {
            // Registrar ajuste
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'crear',
                    ...formData
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarAlerta('✅ Ajuste registrado exitosamente', 'success');
                limpiarFormularioAjuste();
                cargarAjustes();
                cargarProductosParaAjuste(); // Actualizar stocks
            } else {
                mostrarAlerta('❌ Error: ' + data.message, 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarAlerta('❌ Error al registrar el ajuste', 'danger');
        }
    });
}

/**
 * Validar formulario antes de enviar
 */
function validarFormularioAjuste() {
    const productoId = document.getElementById('ajuste-producto').value;
    const tipo = document.getElementById('ajuste-tipo').value;
    const cantidad = parseInt(document.getElementById('ajuste-cantidad').value);
    const fecha = document.getElementById('ajuste-fecha').value;
    const razon = document.getElementById('ajuste-razon').value.trim();
    const comentarios = document.getElementById('ajuste-comentarios').value.trim();
    
    if (!productoId) {
        mostrarAlerta('⚠️ Debe seleccionar un producto', 'warning');
        return false;
    }
    
    if (!tipo) {
        mostrarAlerta('⚠️ Debe seleccionar el tipo de ajuste', 'warning');
        return false;
    }
    
    if (!cantidad || cantidad <= 0) {
        mostrarAlerta('⚠️ La cantidad debe ser mayor a 0', 'warning');
        return false;
    }
    
    if (!fecha) {
        mostrarAlerta('⚠️ Debe seleccionar una fecha', 'warning');
        return false;
    }
    
    if (!razon) {
        mostrarAlerta('⚠️ Debe especificar la razón del ajuste', 'warning');
        return false;
    }
    
    if (!comentarios) {
        mostrarAlerta('⚠️ Debe agregar comentarios adicionales', 'warning');
        return false;
    }
    
    // Validar stock para ajustes negativos
    if (tipo === 'NEGATIVO') {
        const select = document.getElementById('ajuste-producto');
        const option = select.options[select.selectedIndex];
        const stockActual = parseInt(option.dataset.stock || 0);
        
        if (cantidad > stockActual) {
            mostrarAlerta(`⚠️ No hay suficiente stock. Stock actual: ${stockActual}`, 'warning');
            return false;
        }
    }
    
    return true;
}

/**
 * Cargar lista de ajustes
 */
async function cargarAjustes() {
    try {
        const response = await fetch(API_URL + '?action=listar');
        const data = await response.json();
        
        const tbody = document.getElementById('tabla-ajustes');
        
        if (data.success && data.data.length > 0) {
            tbody.innerHTML = '';
            
            data.data.forEach(ajuste => {
                const tr = document.createElement('tr');
                
                // Clase según tipo de ajuste
                const tipoClass = ajuste.tipo_ajuste === 'POSITIVO' ? 'text-success' : 'text-danger';
                const tipoIcon = ajuste.tipo_ajuste === 'POSITIVO' ? '➕' : '➖';
                
                tr.innerHTML = `
                    <td>${formatearFecha(ajuste.fecha)}</td>
                    <td>
                        <strong>${ajuste.codigo}</strong><br>
                        <small>${ajuste.descripcion}</small>
                    </td>
                    <td class="${tipoClass}">
                        ${tipoIcon} ${ajuste.tipo_ajuste}
                    </td>
                    <td><strong>${ajuste.cantidad}</strong></td>
                    <td>${ajuste.stock_anterior}</td>
                    <td>${ajuste.stock_nuevo}</td>
                    <td>${ajuste.razon}</td>
                    <td>
                        <small>${ajuste.comentarios}</small>
                    </td>
                    <td class="table-actions">
                        <button class="btn-danger btn-sm" onclick="eliminarAjuste(${ajuste.id})" 
                                title="Eliminar ajuste">
                            🗑️
                        </button>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay ajustes registrados</td></tr>';
        }
    } catch (error) {
        console.error('Error al cargar ajustes:', error);
        const tbody = document.getElementById('tabla-ajustes');
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Error al cargar los ajustes</td></tr>';
    }
}

/**
 * Eliminar un ajuste
 */
async function eliminarAjuste(id) {
    if (!confirm('⚠️ ¿Está seguro de eliminar este ajuste?\n\nNOTA: Esta acción NO revertirá el cambio en el inventario.')) {
        return;
    }
    
    try {
        const response = await fetch(API_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'eliminar',
                id: id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarAlerta('✅ Ajuste eliminado exitosamente', 'success');
            cargarAjustes();
        } else {
            mostrarAlerta('❌ Error: ' + data.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error al eliminar el ajuste', 'danger');
    }
}

/**
 * Limpiar formulario
 */
function limpiarFormularioAjuste() {
    document.getElementById('form-ajuste').reset();
    establecerFechaActual();
    document.getElementById('info-stock-ajuste').style.display = 'none';
    ajusteEnEdicion = null;
}

/**
 * Mostrar alerta
 */
function mostrarAlerta(mensaje, tipo = 'info') {
    const alertDiv = document.getElementById('alert-ajustes');
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.innerHTML = mensaje;
    alertDiv.style.display = 'flex';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-PA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Agregar estilos para texto de colores
const style = document.createElement('style');
style.textContent = `
    .text-success { color: var(--success-color); font-weight: bold; }
    .text-danger { color: var(--danger-color); font-weight: bold; }
`;
document.head.appendChild(style);