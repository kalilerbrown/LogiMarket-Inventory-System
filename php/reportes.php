<?php
/**
 * API DE REPORTES
 * Generación de reportes y exportación a CSV
 */

require_once 'config.php';

// Obtener la acción
$action = $_GET['action'] ?? '';

// Procesar según la acción
switch ($action) {
    case 'inventario_actual':
        inventarioActual();
        break;
    case 'movimientos':
        listarMovimientos();
        break;
    case 'reporte_producto':
        reportePorProducto();
        break;
    case 'reporte_cliente':
        reportePorCliente();
        break;
    case 'exportar_inventario':
        exportarInventarioCSV();
        break;
    case 'exportar_movimientos':
        exportarMovimientosCSV();
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Acción no válida']);
}

/**
 * Obtener inventario actual
 */
function inventarioActual() {
    try {
        $db = getDB();
        
        $sql = "SELECT 
                    id,
                    codigo,
                    descripcion,
                    marca,
                    unidad,
                    costo,
                    precio,
                    stock_actual,
                    (stock_actual * costo) AS valor_inventario
                FROM productos
                ORDER BY descripcion ASC";
        
        $stmt = $db->query($sql);
        $productos = $stmt->fetchAll();
        
        sendJSON([
            'success' => true,
            'data' => $productos
        ]);
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al obtener inventario: ' . $e->getMessage()
        ]);
    }
}

/**
 * Listar todos los movimientos (usa la vista)
 */
function listarMovimientos() {
    try {
        $db = getDB();
        
        // Construir filtros
        $where = [];
        $params = [];
        
        if (!empty($_GET['tipo'])) {
            $where[] = "tipo_movimiento = :tipo";
            $params[':tipo'] = $_GET['tipo'];
        }
        
        if (!empty($_GET['desde'])) {
            $where[] = "fecha >= :desde";
            $params[':desde'] = $_GET['desde'];
        }
        
        if (!empty($_GET['hasta'])) {
            $where[] = "fecha <= :hasta";
            $params[':hasta'] = $_GET['hasta'];
        }
        
        $sql = "SELECT * FROM vista_movimientos";
        
        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        $sql .= " ORDER BY fecha DESC, fecha_registro DESC LIMIT 1000";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $movimientos = $stmt->fetchAll();
        
        sendJSON([
            'success' => true,
            'data' => $movimientos
        ]);
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al listar movimientos: ' . $e->getMessage()
        ]);
    }
}

/**
 * Reporte por producto
 */
function reportePorProducto() {
    try {
        $producto_id = $_GET['producto_id'] ?? null;
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        
        if (!$producto_id) {
            sendJSON([
                'success' => false,
                'message' => 'ID de producto no proporcionado'
            ]);
            return;
        }
        
        $db = getDB();
        
        // Obtener información del producto
        $sql = "SELECT * FROM productos WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $producto_id]);
        $producto = $stmt->fetch();
        
        if (!$producto) {
            sendJSON([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            return;
        }
        
        // Obtener movimientos del producto
        $sql = "SELECT * FROM vista_movimientos WHERE codigo = :codigo";
        $params = [':codigo' => $producto['codigo']];
        
        if ($desde) {
            $sql .= " AND fecha >= :desde";
            $params[':desde'] = $desde;
        }
        
        if ($hasta) {
            $sql .= " AND fecha <= :hasta";
            $params[':hasta'] = $hasta;
        }
        
        $sql .= " ORDER BY fecha DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $movimientos = $stmt->fetchAll();
        
        sendJSON([
            'success' => true,
            'producto' => $producto,
            'movimientos' => $movimientos
        ]);
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al generar reporte: ' . $e->getMessage()
        ]);
    }
}

/**
 * Reporte por cliente
 */
function reportePorCliente() {
    try {
        $cliente_id = $_GET['cliente_id'] ?? null;
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;
        
        if (!$cliente_id) {
            sendJSON([
                'success' => false,
                'message' => 'ID de cliente no proporcionado'
            ]);
            return;
        }
        
        $db = getDB();
        
        // Obtener información del cliente
        $sql = "SELECT * FROM clientes WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $cliente_id]);
        $cliente = $stmt->fetch();
        
        if (!$cliente) {
            sendJSON([
                'success' => false,
                'message' => 'Cliente no encontrado'
            ]);
            return;
        }
        
        // Obtener salidas del cliente
        $sql = "SELECT 
                    s.fecha,
                    p.codigo,
                    p.descripcion,
                    s.cantidad,
                    s.precio_unitario,
                    s.precio_total,
                    s.comentarios
                FROM salidas s
                INNER JOIN productos p ON s.producto_id = p.id
                WHERE s.cliente_id = :cliente_id";
        
        $params = [':cliente_id' => $cliente_id];
        
        if ($desde) {
            $sql .= " AND s.fecha >= :desde";
            $params[':desde'] = $desde;
        }
        
        if ($hasta) {
            $sql .= " AND s.fecha <= :hasta";
            $params[':hasta'] = $hasta;
        }
        
        $sql .= " ORDER BY s.fecha DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $salidas = $stmt->fetchAll();
        
        sendJSON([
            'success' => true,
            'cliente' => $cliente,
            'salidas' => $salidas
        ]);
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al generar reporte: ' . $e->getMessage()
        ]);
    }
}

/**
 * Exportar inventario a CSV
 */
function exportarInventarioCSV() {
    try {
        $db = getDB();
        
        $sql = "SELECT 
                    codigo AS 'Código',
                    descripcion AS 'Descripción',
                    marca AS 'Marca',
                    unidad AS 'Unidad',
                    stock_actual AS 'Stock Actual',
                    costo AS 'Costo Unitario',
                    (stock_actual * costo) AS 'Valor Total'
                FROM productos
                ORDER BY descripcion ASC";
        
        $stmt = $db->query($sql);
        $datos = $stmt->fetchAll();
        
        generarCSV('inventario_actual_' . date('Y-m-d'), $datos);
        
    } catch (PDOException $e) {
        die('Error al exportar: ' . $e->getMessage());
    }
}

/**
 * Exportar movimientos a CSV
 */
function exportarMovimientosCSV() {
    try {
        $db = getDB();
        
        // Construir filtros
        $where = [];
        $params = [];
        
        if (!empty($_GET['tipo'])) {
            $where[] = "tipo_movimiento = :tipo";
            $params[':tipo'] = $_GET['tipo'];
        }
        
        if (!empty($_GET['desde'])) {
            $where[] = "fecha >= :desde";
            $params[':desde'] = $_GET['desde'];
        }
        
        if (!empty($_GET['hasta'])) {
            $where[] = "fecha <= :hasta";
            $params[':hasta'] = $_GET['hasta'];
        }
        
        $sql = "SELECT 
                    fecha AS 'Fecha',
                    tipo_movimiento AS 'Tipo Movimiento',
                    codigo AS 'Código Producto',
                    descripcion AS 'Descripción',
                    cantidad AS 'Cantidad',
                    tercero AS 'Cliente/Proveedor',
                    comentarios AS 'Comentarios'
                FROM vista_movimientos";
        
        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        $sql .= " ORDER BY fecha DESC LIMIT 5000";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $datos = $stmt->fetchAll();
        
        generarCSV('movimientos_' . date('Y-m-d'), $datos);
        
    } catch (PDOException $e) {
        die('Error al exportar: ' . $e->getMessage());
    }
}

/**
 * Función auxiliar para generar archivo CSV
 */
function generarCSV($nombre_archivo, $datos) {
    // Establecer headers para descarga
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $nombre_archivo . '.csv"');
    
    // Abrir output stream
    $output = fopen('php://output', 'w');
    
    // BOM para Excel UTF-8
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    if (count($datos) > 0) {
        // Escribir encabezados (nombres de columnas)
        fputcsv($output, array_keys($datos[0]));
        
        // Escribir datos
        foreach ($datos as $fila) {
            fputcsv($output, $fila);
        }
    }
    
    fclose($output);
    exit;
}
?>