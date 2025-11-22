/**
 * MÓDULO DE REPORTES
 * Generación de reportes y análisis del sistema
 */

// API Base URL
const REPORTES_API_URL = 'php/reportes.php';

/**
 * Inicializar módulo de reportes
 */
document.addEventListener('DOMContentLoaded', function() {
    configurarPestanas();
    cargarInventarioActual();
    cargarSelectsReportes();
    establecerFechasPorDefecto();
});

/**
 * Configurar sistema de pestañas
 */
function configurarPestanas() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Activar el seleccionado
            this.classList.add('active');
            const tabId = 'tab-' + this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            // Cargar datos según la pestaña
            switch(this.dataset.tab) {
                case 'inventario':
                    cargarInventarioActual();
                    break;
                case 'movimientos':
                    cargarMovimientos();
                    break;
            }
        });
    });
}

/**
 * Establecer fechas por defecto (último mes)
 */
function establecerFechasPorDefecto() {
    const hoy = new Date();
    const hace30dias = new Date(hoy);
    hace30dias.setDate(hace30dias.getDate() - 30);
    
    const hoyStr = hoy.toISOString().split('T')[0];
    const hace30diasStr = hace30dias.toISOString().split('T')[0];
    
    // Filtros de movimientos
    document.getElementById('filtro-fecha-desde').value = hace30diasStr;
    document.getElementById('filtro-fecha-hasta').value = hoyStr;
    
    // Reporte por producto
    document.getElementById('reporte-producto-desde').value = hace30diasStr;
    document.getElementById('reporte-producto-hasta').value = hoyStr;
    
    // Reporte por cliente
    document.getElementById('reporte-cliente-desde').value = hace30diasStr;
    document.getElementById('reporte-cliente-hasta').value = hoyStr;
}

/**
 * Cargar selects de productos y clientes
 */
async function cargarSelectsReportes() {
    try {
        // Cargar productos
        const respProductos = await fetch('../php/productos.php?action=listar');
        const dataProductos = await respProductos.json();
        
        const selectProducto = document.getElementById('reporte-producto');
        if (dataProductos.success && dataProductos.data.length > 0) {
            dataProductos.data.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id;
                option.textContent = `${prod.codigo} - ${prod.descripcion}`;
                selectProducto.appendChild(option);
            });
        }
        
        // Cargar clientes
        const respClientes = await fetch('../php/salidas.php?action=listar_clientes');
        const dataClientes = await respClientes.json();
        
        const selectCliente = document.getElementById('reporte-cliente');
        if (dataClientes.success && dataClientes.data.length > 0) {
            dataClientes.data.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nombre;
                selectCliente.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error al cargar selects:', error);
    }
}

/**
 * Cargar inventario actual
 */
async function cargarInventarioActual() {
    try {
        const response = await fetch(REPORTES_API_URL + '?action=inventario_actual');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Actualizar resumen
            const totalProductos = data.data.length;
            const valorTotal = data.data.reduce((sum, p) => sum + parseFloat(p.valor_inventario || 0), 0);
            const stockBajo = data.data.filter(p => p.stock_actual < 10).length;
            
            document.getElementById('total-productos').textContent = totalProductos;
            document.getElementById('valor-inventario').textContent = '$' + valorTotal.toFixed(2);
            document.getElementById('stock-bajo').textContent = stockBajo;
            
            // Llenar tabla
            const tbody = document.getElementById('tabla-inventario');
            tbody.innerHTML = '';
            
            data.data.forEach(producto => {
                const valor = parseFloat(producto.valor_inventario || 0);
                const stock = parseInt(producto.stock_actual);
                
                // Determinar estado del stock
                let estadoBadge = '';
                if (stock === 0) {
                    estadoBadge = '<span style="background: #dc2626; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Sin Stock</span>';
                } else if (stock < 10) {
                    estadoBadge = '<span style="background: #ea580c; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Stock Bajo</span>';
                } else {
                    estadoBadge = '<span style="background: #16a34a; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">Disponible</span>';
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${producto.codigo}</strong></td>
                    <td>${producto.descripcion}</td>
                    <td>${producto.marca || '-'}</td>
                    <td>${producto.unidad}</td>
                    <td><strong>${stock}</strong></td>
                    <td>$${parseFloat(producto.costo || 0).toFixed(2)}</td>
                    <td>$${valor.toFixed(2)}</td>
                    <td>${estadoBadge}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            document.getElementById('tabla-inventario').innerHTML = 
                '<tr><td colspan="8" class="text-center">No hay productos en el inventario</td></tr>';
        }
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        mostrarAlertaReportes('Error al cargar el inventario', 'danger');
    }
}

/**
 * Cargar todos los movimientos
 */
async function cargarMovimientos() {
    try {
        const response = await fetch(REPORTES_API_URL + '?action=movimientos');
        const data = await response.json();
        
        mostrarMovimientos(data.data || []);
    } catch (error) {
        console.error('Error al cargar movimientos:', error);
        mostrarAlertaReportes('Error al cargar movimientos', 'danger');
    }
}

/**
 * Filtrar movimientos
 */
async function filtrarMovimientos() {
    const tipo = document.getElementById('filtro-tipo-movimiento').value;
    const desde = document.getElementById('filtro-fecha-desde').value;
    const hasta = document.getElementById('filtro-fecha-hasta').value;
    
    try {
        let url = REPORTES_API_URL + '?action=movimientos';
        if (tipo) url += `&tipo=${tipo}`;
        if (desde) url += `&desde=${desde}`;
        if (hasta) url += `&hasta=${hasta}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        mostrarMovimientos(data.data || []);
    } catch (error) {
        console.error('Error al filtrar movimientos:', error);
        mostrarAlertaReportes('Error al filtrar movimientos', 'danger');
    }
}

/**
 * Mostrar movimientos en tabla
 */
function mostrarMovimientos(movimientos) {
    const tbody = document.getElementById('tabla-movimientos');
    
    if (movimientos.length > 0) {
        tbody.innerHTML = '';
        
        movimientos.forEach(mov => {
            let tipoIcon = '';
            let tipoColor = '';
            
            if (mov.tipo_movimiento === 'ENTRADA') {
                tipoIcon = '📥';
                tipoColor = 'color: #16a34a;';
            } else if (mov.tipo_movimiento === 'SALIDA') {
                tipoIcon = '📤';
                tipoColor = 'color: #dc2626;';
            } else {
                tipoIcon = '⚙️';
                tipoColor = 'color: #ea580c;';
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatearFechaReporte(mov.fecha)}</td>
                <td style="${tipoColor} font-weight: bold;">
                    ${tipoIcon} ${mov.tipo_movimiento}
                </td>
                <td>
                    <strong>${mov.codigo}</strong><br>
                    <small>${mov.descripcion}</small>
                </td>
                <td><strong>${Math.abs(mov.cantidad)}</strong></td>
                <td>${mov.tercero || '-'}</td>
                <td><small>${mov.comentarios || '-'}</small></td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron movimientos</td></tr>';
    }
}

/**
 * Generar reporte por producto
 */
async function generarReporteProducto() {
    const productoId = document.getElementById('reporte-producto').value;
    const desde = document.getElementById('reporte-producto-desde').value;
    const hasta = document.getElementById('reporte-producto-hasta').value;
    
    if (!productoId) {
        mostrarAlertaReportes('Debe seleccionar un producto', 'warning');
        return;
    }
    
    try {
        const url = `${REPORTES_API_URL}?action=reporte_producto&producto_id=${productoId}&desde=${desde}&hasta=${hasta}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            mostrarResultadoReporteProducto(data);
        } else {
            mostrarAlertaReportes('Error al generar reporte', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlertaReportes('Error al generar reporte', 'danger');
    }
}

/**
 * Mostrar resultado del reporte por producto
 */
function mostrarResultadoReporteProducto(data) {
    const container = document.getElementById('resultado-reporte-producto');
    
    let html = `
        <div class="card" style="margin-top: 1.5rem; background: #f8fafc;">
            <h4>Producto: ${data.producto.descripcion}</h4>
            <p><strong>Código:</strong> ${data.producto.codigo} | <strong>Stock Actual:</strong> ${data.producto.stock_actual}</p>
            
            <div class="table-container" style="margin-top: 1rem;">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Tercero</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    let totalEntradas = 0;
    let totalSalidas = 0;
    
    if (data.movimientos && data.movimientos.length > 0) {
        data.movimientos.forEach(mov => {
            const cantidad = parseInt(mov.cantidad);
            if (cantidad > 0) totalEntradas += cantidad;
            else totalSalidas += Math.abs(cantidad);
            
            html += `
                <tr>
                    <td>${formatearFechaReporte(mov.fecha)}</td>
                    <td>${mov.tipo_movimiento}</td>
                    <td>${Math.abs(cantidad)}</td>
                    <td>${mov.tercero || '-'}</td>
                    <td>$${mov.total || '0.00'}</td>
                </tr>
            `;
        });
    } else {
        html += '<tr><td colspan="5" class="text-center">Sin movimientos en el período</td></tr>';
    }
    
    html += `
                    </tbody>
                    <tfoot style="background: #e2e8f0; font-weight: bold;">
                        <tr>
                            <td colspan="2">TOTALES</td>
                            <td>Entradas: ${totalEntradas} | Salidas: ${totalSalidas}</td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <button class="btn-success mt-2" onclick="exportarReporteProductoCSV()">📥 Exportar a CSV</button>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Generar reporte por cliente
 */
async function generarReporteCliente() {
    const clienteId = document.getElementById('reporte-cliente').value;
    const desde = document.getElementById('reporte-cliente-desde').value;
    const hasta = document.getElementById('reporte-cliente-hasta').value;
    
    if (!clienteId) {
        mostrarAlertaReportes('Debe seleccionar un cliente', 'warning');
        return;
    }
    
    try {
        const url = `${REPORTES_API_URL}?action=reporte_cliente&cliente_id=${clienteId}&desde=${desde}&hasta=${hasta}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            mostrarResultadoReporteCliente(data);
        } else {
            mostrarAlertaReportes('Error al generar reporte', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlertaReportes('Error al generar reporte', 'danger');
    }
}

/**
 * Mostrar resultado del reporte por cliente
 */
function mostrarResultadoReporteCliente(data) {
    const container = document.getElementById('resultado-reporte-cliente');
    
    let html = `
        <div class="card" style="margin-top: 1.5rem; background: #f8fafc;">
            <h4>Cliente: ${data.cliente.nombre}</h4>
            <p><strong>Contacto:</strong> ${data.cliente.contacto || '-'} | <strong>Teléfono:</strong> ${data.cliente.telefono || '-'}</p>
            
            <div class="table-container" style="margin-top: 1rem;">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    let totalGeneral = 0;
    
    if (data.salidas && data.salidas.length > 0) {
        data.salidas.forEach(salida => {
            const total = parseFloat(salida.precio_total || 0);
            totalGeneral += total;
            
            html += `
                <tr>
                    <td>${formatearFechaReporte(salida.fecha)}</td>
                    <td>${salida.descripcion}</td>
                    <td>${salida.cantidad}</td>
                    <td>$${parseFloat(salida.precio_unitario || 0).toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        html += '<tr><td colspan="5" class="text-center">Sin salidas en el período</td></tr>';
    }
    
    html += `
                    </tbody>
                    <tfoot style="background: #e2e8f0; font-weight: bold;">
                        <tr>
                            <td colspan="4" class="text-right">TOTAL GENERAL:</td>
                            <td>$${totalGeneral.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <button class="btn-success mt-2" onclick="exportarReporteClienteCSV()">📥 Exportar a CSV</button>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Exportar inventario a CSV
 */
function exportarInventarioCSV() {
    window.location.href = REPORTES_API_URL + '?action=exportar_inventario';
}

/**
 * Exportar movimientos a CSV
 */
function exportarMovimientosCSV() {
    const tipo = document.getElementById('filtro-tipo-movimiento').value;
    const desde = document.getElementById('filtro-fecha-desde').value;
    const hasta = document.getElementById('filtro-fecha-hasta').value;
    
    let url = REPORTES_API_URL + '?action=exportar_movimientos';
    if (tipo) url += `&tipo=${tipo}`;
    if (desde) url += `&desde=${desde}`;
    if (hasta) url += `&hasta=${hasta}`;
    
    window.location.href = url;
}

/**
 * Mostrar alerta en reportes
 */
function mostrarAlertaReportes(mensaje, tipo = 'info') {
    const alertDiv = document.getElementById('alert-reportes');
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.innerHTML = mensaje;
    alertDiv.style.display = 'flex';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

/**
 * Formatear fecha
 */
function formatearFechaReporte(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-PA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}