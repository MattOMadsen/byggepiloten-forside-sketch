<?php
declare(strict_types=1);

/**
 * Offentlig portfolio-sitemap (uden /api/ i URL — robots Disallow: /api/).
 * Proxy til lokal Node: GET /api/public/portfolio-sitemap.xml
 */

$target = 'http://127.0.0.1:3001/api/public/portfolio-sitemap.xml';
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 5,
]);
$body = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($body === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Portfolio-sitemap midlertidigt utilgængelig';
    if ($err) {
        error_log('sitemap-portfolios.php: ' . $err);
    }
    exit;
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $body;
