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
        getAllProveedores($pdo);
        break;
    case 'create':
        createProveedor($pdo);
        break;
    case 'update':
        updateProveedor($pdo);
        break;
    case 'delete':
        deleteProveedor($pdo);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida']);
        break;
}

function getAllProveedores($pdo) {
    try {
        $sql = "SELECT * FROM proveedores ORDER BY nombre";
        $stmt = $pdo->query($sql);
        $proveedores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['success' => true, 'data' => $proveedores]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al obtener proveedores: ' . $e->getMessage()]);
    }
}

function createProveedor($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['nombre'])) {
            echo json_encode(['success' => false, 'message' => 'El nombre es obligatorio']);
            return;
        }
        
        $sql = "INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, comentarios, activo) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['nombre'],
            $input['contacto'] ?? null,
            $input['telefono'] ?? null,
            $input['email'] ?? null,
            $input['direccion'] ?? null,
            $input['comentarios'] ?? null,
            $input['activo'] ?? 1
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Proveedor creado exitosamente']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al crear proveedor: ' . $e->getMessage()]);
    }
}

function updateProveedor($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['id']) || empty($input['nombre'])) {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
            return;
        }
        
        $sql = "UPDATE proveedores 
                SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, comentarios = ?, activo = ? 
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['nombre'],
            $input['contacto'] ?? null,
            $input['telefono'] ?? null,
            $input['email'] ?? null,
            $input['direccion'] ?? null,
            $input['comentarios'] ?? null,
            $input['activo'] ?? 1,
            $input['id']
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Proveedor actualizado exitosamente']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar proveedor: ' . $e->getMessage()]);
    }
}

function deleteProveedor($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['id'])) {
            echo json_encode(['success' => false, 'message' => 'ID no proporcionado']);
            return;
        }
        
        // Verificar si el proveedor tiene entradas asociadas
        $sql_check = "SELECT COUNT(*) as count FROM entradas WHERE proveedor_id = ?";
        $stmt_check = $pdo->prepare($sql_check);
        $stmt_check->execute([$input['id']]);
        $result = $stmt_check->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            echo json_encode(['success' => false, 'message' => 'No se puede eliminar el proveedor porque tiene entradas asociadas']);
            return;
        }
        
        $sql = "DELETE FROM proveedores WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$input['id']]);
        
        echo json_encode(['success' => true, 'message' => 'Proveedor eliminado exitosamente']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar proveedor: ' . $e->getMessage()]);
    }
}
?>