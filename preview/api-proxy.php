<?php
declare(strict_types=1);

$uri = $_SERVER['REQUEST_URI'] ?? '';
$prefix = '/api';
$pathOnly = parse_url($uri, PHP_URL_PATH) ?? $uri;
if (!str_starts_with($pathOnly, $prefix)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
    exit;
}

$path = substr($pathOnly, strlen($prefix));
if ($path === '' || $path[0] !== '/') {
    $path = '/' . ltrim($path, '/');
}

$target = 'http://127.0.0.1:3001/api' . $path;
$query = $_SERVER['QUERY_STRING'] ?? '';
if ($query === '') {
    $fromUri = parse_url($uri, PHP_URL_QUERY);
    if (is_string($fromUri) && $fromUri !== '') {
        $query = $fromUri;
    }
}
if ($query !== '') {
    $target .= '?' . $query;
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_CUSTOMREQUEST => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    CURLOPT_TIMEOUT => 120,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$forwardHeaders = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) === 'host') {
            continue;
        }
        $forwardHeaders[] = $name . ': ' . $value;
    }
}
if ($forwardHeaders) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
}

$body = file_get_contents('php://input');
if (is_string($body) && $body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API offline']);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);

http_response_code($status);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (!str_contains($line, ':')) {
        continue;
    }
    [$name, $value] = explode(':', $line, 2);
    $name = trim($name);
    if ($name === '' || strcasecmp($name, 'Transfer-Encoding') === 0) {
        continue;
    }
    header($name . ': ' . trim($value), false);
}

echo $respBody;