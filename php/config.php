<?php
/**
 * Archivo de Configuración - Base de Datos LogiMarket
 * Este archivo contiene la configuración de conexión a MySQL
 */

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_USER', 'root');           
define('DB_PASS', '');              
define('DB_NAME', 'logimarket');
define('DB_CHARSET', 'utf8mb4');

// Configuración de zona horaria
date_default_timezone_set('America/Panama');

// Configuración de errores (cambiar a false en producción)
define('DISPLAY_ERRORS', true);

if (DISPLAY_ERRORS) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

/**
 * Clase Database - Manejo de conexión PDO
 */
class Database {
    private static $instance = null;
    private $connection;
    
    /**
     * Constructor privado para patrón Singleton
     */
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            
        } catch (PDOException $e) {
            die(json_encode([
                'success' => false,
                'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ]));
        }
    }
    
    /**
     * Obtener instancia única de la conexión
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Obtener la conexión PDO
     */
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Prevenir clonación del objeto
     */
    private function __clone() {}
    
    /**
     * Prevenir deserialización
     */
    public function __wakeup() {
        throw new Exception("No se puede deserializar singleton");
    }
}

/**
 * Función auxiliar para obtener la conexión
 */
function getDB() {
    return Database::getInstance()->getConnection();
}

/**
 * Función para enviar respuesta JSON
 */
function sendJSON($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Función para sanitizar entrada
 */
function sanitize($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Permitir CORS para desarrollo local
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>