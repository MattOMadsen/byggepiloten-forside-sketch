<?php
/**
 * Firma-outreach klik-tracking udenom WAF-problemer med /api-proxy redirect.
 * Kaldes fra SPA /t/l/:token/:target — returnerer JSON { ok, url }.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$token = isset($_GET['k']) ? preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $_GET['k']) : '';
$target = isset($_GET['a']) ? preg_replace('/[^a-z]+/', '', (string) $_GET['a']) : 'signup';
if ($target === '') {
    $target = 'signup';
}
$dest = isset($_GET['u']) ? (string) $_GET['u'] : '';

$fallback = 'https://byggepiloten.dk/opret/firma';
if ($token === '') {
    echo json_encode(['ok' => false, 'url' => $fallback]);
    exit;
}

$api = 'http://127.0.0.1:3001/api/public/firma-outreach/engage/' . rawurlencode($token) . '/' . rawurlencode($target);
if ($dest !== '') {
    $api .= '?u=' . rawurlencode($dest);
}
$ch = curl_init($api);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_CONNECTTIMEOUT => 3,
]);
$body = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false || $code < 200 || $code >= 300) {
    // Fallback destinations hvis API er nede
    if ($target === 'go' && preg_match('#^https?://#i', $dest)) {
        $fallback = $dest;
    } elseif ($target === 'guide') {
        $fallback = 'https://byggepiloten.dk/guide/firma';
    } elseif ($target === 'home') {
        $fallback = 'https://byggepiloten.dk/';
    } else {
        $fallback = 'https://byggepiloten.dk/opret/firma?ref=' . rawurlencode($token);
    }
    echo json_encode(['ok' => false, 'url' => $fallback]);
    exit;
}

echo $body;
