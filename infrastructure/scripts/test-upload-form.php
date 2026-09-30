<?php

declare(strict_types=1);

$render = static function (array $variables): string {
    extract($variables, EXTR_SKIP);
    ob_start();
    try {
        require dirname(__DIR__, 2) . '/backend/views/upload-form.php';
        return (string)ob_get_contents();
    } finally {
        ob_end_clean();
    }
};

foreach ([[], ['csrf_token' => ''], ['csrf_token' => null]] as $variables) {
    try {
        $render($variables);
    } catch (LogicException $error) {
        continue;
    }
    fwrite(STDERR, "Upload form accepted a missing CSRF token.\n");
    exit(1);
}

$html = $render(['csrf_token' => 'test<&"token']);
if (!str_contains($html, 'value="test&lt;&amp;&quot;token"') || !str_contains($html, 'Enhandiy')) {
    fwrite(STDERR, "Upload form did not escape the token or render the default title.\n");
    exit(1);
}

$modalHtml = $render(['csrf_token' => 'test-token', 'render_as_modal_body' => true]);
if (str_contains($modalHtml, 'page-header') || !str_contains($modalHtml, 'id="upload"')) {
    fwrite(STDERR, "Modal upload form lost its form or rendered the standalone header.\n");
    exit(1);
}

echo "Upload form boundary tests passed.\n";
