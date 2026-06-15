<?php
// tinker-runner.php — bootstraps a Laravel (or plain PHP) app and evals user code
// usage: php tinker-runner.php <projectPath> <codeFilePath>
declare(strict_types=1);
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING);

$projectPath = $argv[1] ?? getcwd();
$codeFile    = $argv[2] ?? null;
$code = ($codeFile && is_file($codeFile)) ? file_get_contents($codeFile) : '';

chdir($projectPath);

// 1. Autoload
$autoload = $projectPath . '/vendor/autoload.php';
if (is_file($autoload)) {
    require $autoload;
}

// 2. Boot Laravel if present (graceful generic-PHP fallback otherwise)
$bootstrap = $projectPath . '/bootstrap/app.php';
if (is_file($bootstrap)) {
    $app = require $bootstrap;
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
}

// 3. Syntax pre-check on the raw code so parse errors point at the right line
$lintResult = syntaxCheck($code);
if ($lintResult !== null) {
    echo "\x1F" . $lintResult;
    exit;
}

// 4. Auto-wrap the last bare expression in `return` so callers don't need it
$code = autoReturn($code);

// 5. Evaluate user code; tl_out() wraps each value in \x1E blocks, errors in \x1F blocks
ob_start();
try {
    $__return = eval($code);
    if ($__return !== null) {
        tl_out($__return);
    }
} catch (\Throwable $e) {
    echo "\x1F" . formatError($e);
}
echo ob_get_clean();

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Run `php -l` on the raw user code before eval so parse errors report the
 * correct line number (the parser identifies where the problem *started*,
 * not where it first notices something wrong).
 * Returns a formatted error string on failure, null on success.
 */
function syntaxCheck(string $code): ?string
{
    $tmp = tempnam(sys_get_temp_dir(), 'tl-lint-');
    // Wrap in <?php so the linter treats it as a script; line numbers shift by 1
    file_put_contents($tmp, "<?php\n" . $code);
    $out = shell_exec(PHP_BINARY . ' -l ' . escapeshellarg($tmp) . ' 2>&1');
    unlink($tmp);

    if (!$out || !str_contains($out, 'Parse error') && !str_contains($out, 'Fatal error')) {
        return null;
    }

    // Adjust line numbers: subtract 1 for the <?php line we prepended
    $out = preg_replace_callback('/on line (\d+)/', function ($m) {
        return 'on line ' . max(1, (int)$m[1] - 1);
    }, $out);
    // Also fix " line N" in "↳ line N" style references
    $out = preg_replace_callback('/\bline (\d+)\b/', function ($m) {
        return 'line ' . max(1, (int)$m[1] - 1);
    }, $out);

    // Strip the temp file path and "Errors parsing" trailer
    $out = preg_replace('/ in \/[^\s]+tl-lint-[^\s]+/', '', $out);
    $out = preg_replace('/\nErrors parsing.*$/m', '', $out);
    $out = trim($out);

    return $out . PHP_EOL . '  ↳ ' . extractLineRef($out) . PHP_EOL;
}

function extractLineRef(string $msg): string
{
    if (preg_match('/on line (\d+)/', $msg, $m)) {
        return 'line ' . $m[1];
    }
    return '';
}

/**
 * Format a Throwable for display, hiding internal runner paths and eval noise.
 */
function formatError(\Throwable $e): string
{
    $class   = get_class($e);
    $message = $e->getMessage();

    // Clean up the file reference – eval()'d code IS the user's snippet
    $file = $e->getFile();
    $line = $e->getLine();

    // "eval()'d code" appears inside the runner file string; strip to just a line number
    if (str_contains($file, "eval()'d code") || str_contains($file, 'tinker-runner.php')) {
        $location = "line {$line}";
    } else {
        $location = "{$file}:{$line}";
    }

    // Also clean eval noise from the message itself
    $message = preg_replace('/\(\/.*tinker-runner\.php.*\)/', '', $message);
    $message = trim($message);

    $out = "{$class}: {$message}" . PHP_EOL;
    $out .= "  ↳ {$location}" . PHP_EOL;

    // Show a short stack trace, skipping runner internals
    foreach ($e->getTrace() as $frame) {
        $f = $frame['file'] ?? '';
        if (str_contains($f, 'tinker-runner.php')) continue;
        if (isset($frame['file'], $frame['line'])) {
            $fn = isset($frame['function']) ? " in {$frame['function']}()" : '';
            $out .= "  · {$frame['file']}:{$frame['line']}{$fn}" . PHP_EOL;
        }
    }

    return $out;
}

/**
 * Detect every top-level bare-expression statement.
 * The last one gets `return` so its value is captured.
 * All earlier ones get wrapped in a dump call so they appear in output too.
 *
 * e.g.  User::count();
 *        DB::table('foo')->count();
 * becomes:
 *        $__d(User::count());
 *        return DB::table('foo')->count();
 */
function autoReturn(string $code): string
{
    // Forgive a missing trailing semicolon (but not after a closing brace)
    $trimmed = rtrim($code);
    if ($trimmed !== '' && !str_ends_with($trimmed, ';') && !str_ends_with($trimmed, '}')) {
        $code = $trimmed . ';';
    }

    $tokens = @token_get_all('<?php ' . $code);
    if (empty($tokens)) return $code;

    $voidTokens = [
        T_ECHO, T_PRINT, T_IF, T_ELSE, T_ELSEIF,
        T_WHILE, T_FOR, T_FOREACH, T_SWITCH, T_DO,
        T_FUNCTION, T_CLASS, T_INTERFACE, T_TRAIT, T_ABSTRACT, T_FINAL,
        T_NAMESPACE, T_USE,
        T_TRY, T_CATCH, T_FINALLY, T_THROW,
        T_RETURN, T_BREAK, T_CONTINUE, T_GOTO, T_DECLARE,
        T_GLOBAL, T_STATIC,
    ];
    if (defined('T_MATCH')) $voidTokens[] = T_MATCH;
    if (defined('T_ENUM'))  $voidTokens[] = T_ENUM;

    $depth        = 0;
    $pos          = 0;    // byte offset in '<?php ' . $code
    $inNewStmt    = true;
    $stmtStart    = null; // wrap-string offset of current statement's first real token
    $stmtCanExpr  = false;
    $statements   = [];   // [[wrapStart, wrapSemicolon, canExpr], …]

    foreach ($tokens as $tok) {
        if (is_string($tok)) {
            if ($tok === '{') {
                $depth++;
            } elseif ($tok === '}') {
                $depth--;
                if ($depth === 0) {
                    // Block statement closed — record it (canExpr=false for blocks)
                    if ($stmtStart !== null) {
                        $statements[] = [$stmtStart, null, false];
                        $stmtStart = null;
                    }
                    $inNewStmt = true;
                }
            } elseif ($tok === ';' && $depth === 0) {
                if ($stmtStart !== null) {
                    $statements[] = [$stmtStart, $pos, $stmtCanExpr];
                    $stmtStart = null;
                }
                $inNewStmt = true;
            }
            $pos++;
            continue;
        }

        [$type, $text] = $tok;
        $len = strlen($text);

        if ($type === T_OPEN_TAG) { $pos += $len; continue; }

        if ($type !== T_WHITESPACE && $type !== T_COMMENT && $type !== T_DOC_COMMENT) {
            if ($depth === 0 && $inNewStmt) {
                $stmtStart   = $pos;
                $stmtCanExpr = !in_array($type, $voidTokens);
                $inNewStmt   = false;
            }
        }

        $pos += $len;
    }

    // Trailing statement with no semicolon
    if ($stmtStart !== null) {
        $statements[] = [$stmtStart, null, $stmtCanExpr];
    }

    if (empty($statements)) return $code;

    // Find the last expression-capable statement
    $lastIdx = null;
    for ($i = count($statements) - 1; $i >= 0; $i--) {
        if ($statements[$i][2]) { $lastIdx = $i; break; }
    }
    if ($lastIdx === null) return $code;

    // Apply transforms in reverse so earlier offsets stay valid
    for ($i = count($statements) - 1; $i >= 0; $i--) {
        [$wStart, $wSemi, $canExpr] = $statements[$i];
        if (!$canExpr) continue;

        $cStart = $wStart - 6; // convert to $code offset

        if ($i === $lastIdx) {
            // Prepend `return`
            $code = substr($code, 0, $cStart) . 'return ' . substr($code, $cStart);
        } elseif ($wSemi !== null) {
            // Wrap in tl_out(…) so intermediate results get their own output block
            $cSemi = $wSemi - 6;
            $code  = substr($code, 0, $cSemi) . ')' . substr($code, $cSemi);
            $code  = substr($code, 0, $cStart) . 'tl_out(' . substr($code, $cStart);
        }
    }

    return $code;
}

/**
 * Dump a value as a block in the output stream.
 * Symfony VarDumper's dump() writes directly to php://stdout, bypassing
 * ob_start(). We use its internal API to capture into a memory stream instead.
 * For plain PHP (no VarDumper), ob_start() + var_dump() works fine.
 */
function tl_out(mixed $value): void
{
    if (class_exists('Symfony\Component\VarDumper\Cloner\VarCloner')) {
        $cloner = new \Symfony\Component\VarDumper\Cloner\VarCloner();
        $dumper = new \Symfony\Component\VarDumper\Dumper\CliDumper();
        $dumper->setColors(false);
        $stream = fopen('php://memory', 'r+');
        $dumper->dump($cloner->cloneVar($value), $stream);
        rewind($stream);
        $out = stream_get_contents($stream);
        fclose($stream);
        echo "\x1E" . trim($out);
    } else {
        ob_start();
        var_dump($value);
        $raw = ob_get_clean();
        $clean = preg_replace('/ \/\/ [^\n]+/', '', $raw);
        echo "\x1E" . trim($clean);
    }
}
