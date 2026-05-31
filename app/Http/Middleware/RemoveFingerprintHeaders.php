<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hapus header yang membocorkan tech stack (PHP versi, Laravel, dll).
 * Mengurangi fingerprinting oleh scanner kerentanan otomatis.
 */
class RemoveFingerprintHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        // PHP menambahkan X-Powered-By di level SAPI sebelum app jalan;
        // header_remove() mencabutnya meski expose_php masih On.
        header_remove('X-Powered-By');

        $response = $next($request);

        foreach (['X-Powered-By', 'Server'] as $header) {
            $response->headers->remove($header);
        }

        return $response;
    }
}
