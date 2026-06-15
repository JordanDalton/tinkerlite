<?php
$projectPath = $argv[1] ?? getcwd();
$autoload = rtrim($projectPath, '/') . '/vendor/autoload.php';
$result = ['classes' => [], 'functions' => []];

if (file_exists($autoload)) {
    $loader = require $autoload;
    if (method_exists($loader, 'getClassMap')) {
        $classes = array_keys($loader->getClassMap());
        sort($classes);
        $result['classes'] = $classes;
    }
}

$result['functions'] = get_defined_functions()['user'];
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
