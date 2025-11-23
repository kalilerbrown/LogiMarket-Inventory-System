<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Configuración de la base de datos
$host = '127.0.0.1';
$dbname = 'logimarket';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error de conexión: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':
        getAllEntradas($pdo);
        break;
    case 'create':
        createEntrada($pdo);
        break;
    case 'delete':
        deleteEntrada($pdo);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
        break;
}

function getAllEntradas($pdo) {
    try {
        $sql = "SELECT e.*, p.codigo, p.descripcion, prov.nombre as proveedor_nombre 
                FROM entradas e 
                LEFT JOIN productos p ON e.producto_id = p.id 
                LEFT JOIN proveedores prov ON e.proveedor_id = prov.id 
                ORDER BY e.fecha DESC, e.fecha_registro DESC";
        
        $stmt = $pdo->query($sql);
        $entradas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $entradas]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al obtener entradas: ' . $e->getMessage()]);
    }
}

function createEntrada($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validaciones básicas
        if (empty($input['producto_id']) || empty($input['cantidad']) || empty($input['fecha'])) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
            return;
        }
        
        // Calcular costo total si no se proporciona
        $costo_unitario = floatval($input['costo_unitario'] ?? 0);
        $cantidad = intval($input['cantidad']);
        $costo_total = $costo_unitario * $cantidad;
        
        // Insertar entrada
        $sql = "INSERT INTO entradas (producto_id, proveedor_id, cantidad, costo_unitario, costo_total, fecha, comentarios, usuario) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['producto_id'],
            $input['proveedor_id'] ?: null,
            $cantidad,
            $costo_unitario,
            $costo_total,
            $input['fecha'],
            $input['comentarios'] ?? '',
            'admin' // En un sistema real, esto vendría de la sesión del usuario
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Entrada registrada exitosamente']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al crear entrada: ' . $e->getMessage()]);
    }
}

function deleteEntrada($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['id'])) {
            echo json_encode(['success' => false, 'message' => 'ID no proporcionado']);
            return;
        }
        
        // Primero obtenemos la información de la entrada para revertir el stock
        $sql_select = "SELECT producto_id, cantidad FROM entradas WHERE id = ?";
        $stmt_select = $pdo->prepare($sql_select);
        $stmt_select->execute([$input['id']]);
        $entrada = $stmt_select->fetch(PDO::FETCH_ASSOC);
        
        if (!$entrada) {
            echo json_encode(['success' => false, 'message' => 'Entrada no encontrada']);
            return;
        }
        
        // Iniciar transacción
        $pdo->beginTransaction();
        
        // Revertir el stock
        $sql_revertir = "UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?";
        $stmt_revertir = $pdo->prepare($sql_revertir);
        $stmt_revertir->execute([$entrada['cantidad'], $entrada['producto_id']]);
        
        // Eliminar la entrada
        $sql_delete = "DELETE FROM entradas WHERE id = ?";
        $stmt_delete = $pdo->prepare($sql_delete);
        $stmt_delete->execute([$input['id']]);
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Entrada eliminada exitosamente']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error al eliminar entrada: ' . $e->getMessage()]);
    }
}
?>