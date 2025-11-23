class EntradasManager {
    constructor() {
        this.entradas = [];
        this.productos = [];
        this.proveedores = [];
        this.init();
    }

    init() {
        this.setCurrentDate();
        this.cargarProductos();
        this.cargarProveedores();
        this.cargarEntradas();
        this.setupEventListeners();
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('fecha').value = today;
    }

    async cargarProductos() {
        try {
            const response = await fetch('php/productos.php?action=getAll');
            const data = await response.json();
            
            if (data.success) {
                this.productos = data.data;
                this.llenarSelectProductos();
            } else {
                this.mostrarAlerta('Error al cargar productos', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    async cargarProveedores() {
        try {
            const response = await fetch('php/proveedores.php?action=getAll');
            const data = await response.json();
            
            if (data.success) {
                this.proveedores = data.data;
                this.llenarSelectProveedores();
            } else {
                this.mostrarAlerta('Error al cargar proveedores', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    llenarSelectProductos() {
        const select = document.getElementById('producto_id');
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        
        this.productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.id;
            option.textContent = `${producto.codigo} - ${producto.descripcion}`;
            select.appendChild(option);
        });
    }

    llenarSelectProveedores() {
        const select = document.getElementById('proveedor_id');
        select.innerHTML = '<option value="">Seleccionar proveedor...</option>';
        
        this.proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor.id;
            option.textContent = proveedor.nombre;
            select.appendChild(option);
        });
    }

    async cargarEntradas() {
        try {
            const response = await fetch('php/entradas.php?action=getAll');
            const data = await response.json();
            
            if (data.success) {
                this.entradas = data.data;
                this.mostrarEntradas();
            } else {
                this.mostrarAlerta('Error al cargar entradas', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    mostrarEntradas() {
        const tbody = document.getElementById('tbodyEntradas');
        tbody.innerHTML = '';

        this.entradas.forEach(entrada => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entrada.fecha}</td>
                <td>${entrada.codigo} - ${entrada.descripcion}</td>
                <td>${entrada.proveedor_nombre || 'N/A'}</td>
                <td>${entrada.cantidad}</td>
                <td>$${parseFloat(entrada.costo_unitario).toFixed(2)}</td>
                <td>$${parseFloat(entrada.costo_total).toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${entrada.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.setupEliminarButtons();
    }

    setupEventListeners() {
        // Form submit
        document.getElementById('formEntrada').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarEntrada();
        });

        // Calcular costo total
        document.getElementById('cantidad').addEventListener('input', () => this.calcularCostoTotal());
        document.getElementById('costo_unitario').addEventListener('input', () => this.calcularCostoTotal());

        // Botón cancelar
        document.getElementById('btnCancelar').addEventListener('click', () => this.limpiarFormulario());

        // Botón refresh
        document.getElementById('btnRefresh').addEventListener('click', () => this.cargarEntradas());
    }

    calcularCostoTotal() {
        const cantidad = parseFloat(document.getElementById('cantidad').value) || 0;
        const costoUnitario = parseFloat(document.getElementById('costo_unitario').value) || 0;
        const costoTotal = cantidad * costoUnitario;
        
        document.getElementById('costo_total').value = costoTotal.toFixed(2);
    }

    async guardarEntrada() {
        const formData = new FormData(document.getElementById('formEntrada'));
        const data = Object.fromEntries(formData);

        // Validaciones
        if (!data.producto_id || !data.cantidad || !data.fecha) {
            this.mostrarAlerta('Por favor complete los campos obligatorios', 'warning');
            return;
        }

        try {
            const response = await fetch('php/entradas.php?action=create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarAlerta('Entrada registrada exitosamente', 'success');
                this.limpiarFormulario();
                this.cargarEntradas();
            } else {
                this.mostrarAlerta(result.message || 'Error al guardar la entrada', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    async eliminarEntrada(id) {
        if (!confirm('¿Está seguro de que desea eliminar esta entrada?')) {
            return;
        }

        try {
            const response = await fetch('php/entradas.php?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id })
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarAlerta('Entrada eliminada exitosamente', 'success');
                this.cargarEntradas();
            } else {
                this.mostrarAlerta(result.message || 'Error al eliminar la entrada', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    setupEliminarButtons() {
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-eliminar').dataset.id;
                this.eliminarEntrada(id);
            });
        });
    }

    limpiarFormulario() {
        document.getElementById('formEntrada').reset();
        this.setCurrentDate();
        document.getElementById('costo_total').value = '';
    }

    mostrarAlerta(mensaje, tipo) {
        // Crear alerta Bootstrap
        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
        alerta.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insertar al inicio del main
        const main = document.querySelector('main');
        main.insertBefore(alerta, main.firstChild);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alerta.parentNode) {
                alerta.remove();
            }
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new EntradasManager();
});