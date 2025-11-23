class ProveedoresManager {
    constructor() {
        this.proveedores = [];
        this.proveedorEditando = null;
        this.init();
    }

    init() {
        this.cargarProveedores();
        this.setupEventListeners();
    }

    async cargarProveedores() {
        try {
            const response = await fetch('php/proveedores.php?action=getAll');
            const data = await response.json();
            
            if (data.success) {
                this.proveedores = data.data;
                this.mostrarProveedores();
            } else {
                this.mostrarAlerta('Error al cargar proveedores', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    mostrarProveedores() {
        const tbody = document.getElementById('tbodyProveedores');
        tbody.innerHTML = '';

        this.proveedores.forEach(proveedor => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${proveedor.nombre}</td>
                <td>${proveedor.contacto || 'N/A'}</td>
                <td>${proveedor.telefono || 'N/A'}</td>
                <td>${proveedor.email || 'N/A'}</td>
                <td>
                    <span class="badge ${proveedor.activo ? 'bg-success' : 'bg-secondary'}">
                        ${proveedor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-warning btn-editar me-1" data-id="${proveedor.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${proveedor.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.setupActionButtons();
    }

    setupEventListeners() {
        // Botón guardar proveedor
        document.getElementById('btnGuardarProveedor').addEventListener('click', () => this.guardarProveedor());

        // Botón refresh
        document.getElementById('btnRefresh').addEventListener('click', () => this.cargarProveedores());

        // Limpiar formulario cuando se cierre el modal
        const modal = document.getElementById('modalProveedor');
        modal.addEventListener('hidden.bs.modal', () => this.limpiarFormulario());
    }

    setupActionButtons() {
        // Botones editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-editar').dataset.id;
                this.editarProveedor(id);
            });
        });

        // Botones eliminar
        document.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-eliminar').dataset.id;
                this.eliminarProveedor(id);
            });
        });
    }

    nuevoProveedor() {
        this.proveedorEditando = null;
        document.getElementById('modalProveedorTitle').textContent = 'Nuevo Proveedor';
        this.limpiarFormulario();
    }

    editarProveedor(id) {
        const proveedor = this.proveedores.find(p => p.id == id);
        if (!proveedor) return;

        this.proveedorEditando = proveedor;
        document.getElementById('modalProveedorTitle').textContent = 'Editar Proveedor';
        
        // Llenar formulario
        document.getElementById('proveedor_id').value = proveedor.id;
        document.getElementById('nombre').value = proveedor.nombre;
        document.getElementById('contacto').value = proveedor.contacto || '';
        document.getElementById('telefono').value = proveedor.telefono || '';
        document.getElementById('email').value = proveedor.email || '';
        document.getElementById('direccion').value = proveedor.direccion || '';
        document.getElementById('comentarios').value = proveedor.comentarios || '';
        document.getElementById('activo').checked = proveedor.activo;

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalProveedor'));
        modal.show();
    }

    async guardarProveedor() {
        const formData = new FormData(document.getElementById('formProveedor'));
        const data = Object.fromEntries(formData);

        // Validaciones
        if (!data.nombre) {
            this.mostrarAlerta('El nombre es obligatorio', 'warning');
            return;
        }

        try {
            const action = this.proveedorEditando ? 'update' : 'create';
            const response = await fetch(`php/proveedores.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarAlerta(
                    this.proveedorEditando ? 'Proveedor actualizado exitosamente' : 'Proveedor creado exitosamente', 
                    'success'
                );
                
                // Cerrar modal y recargar datos
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalProveedor'));
                modal.hide();
                
                this.cargarProveedores();
            } else {
                this.mostrarAlerta(result.message || 'Error al guardar el proveedor', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    async eliminarProveedor(id) {
        if (!confirm('¿Está seguro de que desea eliminar este proveedor?')) {
            return;
        }

        try {
            const response = await fetch('php/proveedores.php?action=delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id })
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarAlerta('Proveedor eliminado exitosamente', 'success');
                this.cargarProveedores();
            } else {
                this.mostrarAlerta(result.message || 'Error al eliminar el proveedor', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.mostrarAlerta('Error de conexión', 'danger');
        }
    }

    limpiarFormulario() {
        document.getElementById('formProveedor').reset();
        document.getElementById('proveedor_id').value = '';
        document.getElementById('activo').checked = true;
    }

    mostrarAlerta(mensaje, tipo) {
        const alerta = document.createElement('div');
        alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
        alerta.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const main = document.querySelector('main');
        main.insertBefore(alerta, main.firstChild);

        setTimeout(() => {
            if (alerta.parentNode) {
                alerta.remove();
            }
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ProveedoresManager();
});