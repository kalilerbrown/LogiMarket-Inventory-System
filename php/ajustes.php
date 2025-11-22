<?php
/**
 * API DE AJUSTES DE INVENTARIO
 * Manejo de ajustes positivos y negativos del inventario
 */

require_once 'config.php';

// Obtener el método HTTP y los datos
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Determinar la acción
$action = '';
if ($method === 'GET' && isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif (isset($input['action'])) {
    $action = $input['action'];
}

// Procesar según la acción
switch ($action) {
    case 'listar':
        listarAjustes();
        break;
    case 'crear':
        crearAjuste($input);
        break;
    case 'eliminar':
        eliminarAjuste($input);
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Acción no válida']);
}

/**
 * Listar todos los ajustes con información del producto
 */
function listarAjustes() {
    try {
        $db = getDB();
        
        $sql = "SELECT 
                    a.id,
                    a.producto_id,
                    a.tipo_ajuste,
                    a.cantidad,
                    a.stock_anterior,
                    a.stock_nuevo,
                    a.fecha,
                    a.razon,
                    a.comentarios,
                    a.usuario,
                    a.fecha_registro,
                    p.codigo,
                    p.descripcion,
                    p.marca,
                    p.stock_actual
                FROM ajustes a
                INNER JOIN productos p ON a.producto_id = p.id
                ORDER BY a.fecha DESC, a.fecha_registro DESC";
        
        $stmt = $db->query($sql);
        $ajustes = $stmt->fetchAll();
        
        sendJSON([
            'success' => true,
            'data' => $ajustes,
            'total' => count($ajustes)
        ]);
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al listar ajustes: ' . $e->getMessage()
        ]);
    }
}

/**
 * Crear un nuevo ajuste de inventario
 */
function crearAjuste($data) {
    try {
        // Validar datos requeridos
        if (empty($data['producto_id']) || empty($data['tipo_ajuste']) || 
            empty($data['cantidad']) || empty($data['fecha']) || 
            empty($data['razon']) || empty($data['comentarios'])) {
            sendJSON([
                'success' => false,
                'message' => 'Faltan datos requeridos'
            ]);
            return;
        }
        
        $db = getDB();
        
        // Iniciar transacción
        $db->beginTransaction();
        
        // Obtener stock actual del producto
        $sql = "SELECT stock_actual FROM productos WHERE id = :producto_id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':producto_id' => $data['producto_id']]);
        $producto = $stmt->fetch();
        
        if (!$producto) {
            $db->rollBack();
            sendJSON([
                'success' => false,
                'message' => 'Producto no encontrado'
            ]);
            return;
        }
        
        $stock_anterior = $producto['stock_actual'];
        $cantidad = intval($data['cantidad']);
        
        // Calcular nuevo stock según tipo de ajuste
        if ($data['tipo_ajuste'] === 'POSITIVO') {
            $stock_nuevo = $stock_anterior + $cantidad;
        } else { // NEGATIVO
            $stock_nuevo = $stock_anterior - $cantidad;
            
            // Validar que no quede negativo
            if ($stock_nuevo < 0) {
                $db->rollBack();
                sendJSON([
                    'success' => false,
                    'message' => 'No hay suficiente stock para realizar este ajuste'
                ]);
                return;
            }
        }
        
        // Insertar el ajuste
        $sql = "INSERT INTO ajustes 
                (producto_id, tipo_ajuste, cantidad, stock_anterior, stock_nuevo, 
                 fecha, razon, comentarios, usuario) 
                VALUES 
                (:producto_id, :tipo_ajuste, :cantidad, :stock_anterior, :stock_nuevo,
                 :fecha, :razon, :comentarios, :usuario)";
        
        $stmt = $db->prepare($sql);
        $resultado = $stmt->execute([
            ':producto_id' => $data['producto_id'],
            ':tipo_ajuste' => $data['tipo_ajuste'],
            ':cantidad' => $cantidad,
            ':stock_anterior' => $stock_anterior,
            ':stock_nuevo' => $stock_nuevo,
            ':fecha' => $data['fecha'],
            ':razon' => $data['razon'],
            ':comentarios' => $data['comentarios'],
            ':usuario' => 'Sistema' // Aquí podrías usar el usuario autenticado
        ]);
        
        if ($resultado) {
            $ajuste_id = $db->lastInsertId();
            
            // Actualizar stock del producto
            $sql = "UPDATE productos SET stock_actual = :stock_nuevo WHERE id = :producto_id";
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':stock_nuevo' => $stock_nuevo,
                ':producto_id' => $data['producto_id']
            ]);
            
            // Confirmar transacción
            $db->commit();
            
            sendJSON([
                'success' => true,
                'message' => 'Ajuste registrado exitosamente',
                'id' => $ajuste_id,
                'stock_anterior' => $stock_anterior,
                'stock_nuevo' => $stock_nuevo
            ]);
        } else {
            $db->rollBack();
            sendJSON([
                'success' => false,
                'message' => 'Error al registrar el ajuste'
            ]);
        }
        
    } catch (PDOException $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        sendJSON([
            'success' => false,
            'message' => 'Error al crear ajuste: ' . $e->getMessage()
        ]);
    }
}

/**
 * Eliminar un ajuste
 * NOTA: Solo elimina el registro, NO revierte el cambio en inventario
 */
function eliminarAjuste($data) {
    try {
        if (empty($data['id'])) {
            sendJSON([
                'success' => false,
                'message' => 'ID de ajuste no proporcionado'
            ]);
            return;
        }
        
        $db = getDB();
        
        $sql = "DELETE FROM ajustes WHERE id = :id";
        $stmt = $db->prepare($sql);
        $resultado = $stmt->execute([':id' => $data['id']]);
        
        if ($resultado && $stmt->rowCount() > 0) {
            sendJSON([
                'success' => true,
                'message' => 'Ajuste eliminado exitosamente'
            ]);
        } else {
            sendJSON([
                'success' => false,
                'message' => 'No se encontró el ajuste o ya fue eliminado'
            ]);
        }
        
    } catch (PDOException $e) {
        sendJSON([
            'success' => false,
            'message' => 'Error al eliminar ajuste: ' . $e->getMessage()
        ]);
    }
}
?>