use crate::store::Connection;
use serde::Serialize;
use ssh2::{CheckResult, KnownHostFileKind, Session};
use std::io::Read;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct PhpBinary {
    pub binary: String,
    pub version: String,
    pub path: String,
}

const RUNNER_PHP: &str = include_str!("../assets/tinker-runner.php");
const SCANNER_PHP: &str = include_str!("../assets/scanner.php");
const REMOTE_WORK_DIR: &str = "/tmp/tinkerlite";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub ok: bool,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u128,
}

pub fn run(conn: &Connection, code: &str) -> Result<RunResult, String> {
    match conn.conn_type.as_str() {
        "local" => run_local(conn, code),
        "ssh" => {
            let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
            run_ssh(conn, code, &secret, false)
        }
        other => Err(format!("Unknown connection type: {other}")),
    }
}

pub fn run_trusting_host(conn: &Connection, code: &str) -> Result<RunResult, String> {
    let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
    run_ssh(conn, code, &secret, true)
}

fn runner_cache_path() -> PathBuf {
    std::env::temp_dir().join("tinkerlite-runner.php")
}

fn ensure_local_runner() -> Result<PathBuf, String> {
    let path = runner_cache_path();
    std::fs::write(&path, RUNNER_PHP).map_err(|e| e.to_string())?;
    Ok(path)
}

fn run_local(conn: &Connection, code: &str) -> Result<RunResult, String> {
    let runner = ensure_local_runner()?;
    let project_path = expand_tilde(&conn.project_path);

    let code_file = std::env::temp_dir().join(format!("tinkerlite-code-{}.php", uuid::Uuid::new_v4()));
    std::fs::write(&code_file, code).map_err(|e| e.to_string())?;

    let start = Instant::now();
    let output = Command::new(&conn.php_binary)
        .arg(&runner)
        .arg(&project_path)
        .arg(&code_file)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run php: {e}\n\nProject path: {project_path}"))?;
    let duration_ms = start.elapsed().as_millis();

    std::fs::remove_file(&code_file).ok();

    Ok(RunResult {
        ok: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        duration_ms,
    })
}

fn run_ssh(conn: &Connection, code: &str, secret: &str, trust_unknown: bool) -> Result<RunResult, String> {
    let ssh = conn.ssh.as_ref().ok_or("No SSH config")?;

    let tcp = TcpStream::connect((ssh.host.as_str(), ssh.port))
        .map_err(|e| format!("TCP connect failed: {e}"))?;

    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("SSH handshake failed: {e}"))?;

    verify_host_key(&sess, &ssh.host, ssh.port, trust_unknown)?;

    // Authenticate
    match ssh.auth.method.as_str() {
        "password" => {
            sess.userauth_password(&ssh.username, secret)
                .map_err(|e| format!("Password auth failed: {e}"))?;
        }
        "key" => {
            let raw = ssh.auth.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let key_path = expand_tilde(raw);
            let passphrase = if secret.is_empty() { None } else { Some(secret) };
            sess.userauth_pubkey_file(
                &ssh.username,
                None,
                Path::new(&key_path),
                passphrase,
            )
            .map_err(|e| format!("Key auth failed: {e}"))?;
        }
        other => return Err(format!("Unknown auth method: {other}")),
    }

    if !sess.authenticated() {
        return Err("Authentication failed".to_string());
    }

    let sftp = sess.sftp().map_err(|e| format!("SFTP init failed: {e}"))?;

    // Ensure remote work dir exists
    let mkdir_result = sftp.mkdir(Path::new(REMOTE_WORK_DIR), 0o700);
    // Ignore error if dir already exists
    if let Err(e) = mkdir_result {
        if !e.message().contains("exist") && !e.message().contains("EEXIST") {
            // Try to stat it; if it exists we're fine
            sftp.stat(Path::new(REMOTE_WORK_DIR))
                .map_err(|_| format!("Cannot create remote work dir: {e}"))?;
        }
    }

    // Always upload the runner so updates take effect immediately
    let remote_runner = format!("{REMOTE_WORK_DIR}/tinker-runner.php");
    {
        let mut f = sftp
            .create(Path::new(&remote_runner))
            .map_err(|e| format!("Cannot upload runner: {e}"))?;
        use std::io::Write;
        f.write_all(RUNNER_PHP.as_bytes()).map_err(|e| e.to_string())?;
    }

    // Upload user code with a unique filename
    let code_filename = format!("{REMOTE_WORK_DIR}/code-{}.php", uuid::Uuid::new_v4());
    {
        let mut f = sftp
            .create(Path::new(&code_filename))
            .map_err(|e| format!("Cannot upload code: {e}"))?;
        use std::io::Write;
        f.write_all(code.as_bytes()).map_err(|e| e.to_string())?;
    }

    // Execute — expand ~ so the remote shell can resolve it
    let project_q = remote_shell_quote(&conn.project_path);
    let runner_q = shell_quote(&remote_runner);
    let code_q = shell_quote(&code_filename);
    let cmd = format!("cd {project_q} && {} {runner_q} {project_q} {code_q}", &conn.php_binary);

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
    channel.exec(&cmd).map_err(|e| format!("Exec failed: {e}"))?;

    let start = Instant::now();
    let mut stdout = String::new();
    let mut stderr = String::new();
    channel.read_to_string(&mut stdout).ok();
    channel.stderr().read_to_string(&mut stderr).ok();
    channel.wait_close().ok();
    let duration_ms = start.elapsed().as_millis();

    let exit_status = channel.exit_status().unwrap_or(1);

    // Cleanup code file
    sftp.unlink(Path::new(&code_filename)).ok();

    Ok(RunResult {
        ok: exit_status == 0,
        stdout,
        stderr,
        duration_ms,
    })
}

fn verify_host_key(sess: &Session, host: &str, port: u16, trust_unknown: bool) -> Result<(), String> {
    let known_hosts_path = known_hosts_path();
    let mut known_hosts = sess.known_hosts().map_err(|e| e.to_string())?;

    if known_hosts_path.exists() {
        known_hosts
            .read_file(&known_hosts_path, KnownHostFileKind::OpenSSH)
            .map_err(|e| format!("Cannot read known_hosts: {e}"))?;
    }

    let (key, _key_type) = sess.host_key().ok_or("No host key presented")?;

    let check_host = if port != 22 {
        format!("[{host}]:{port}")
    } else {
        host.to_string()
    };

    match known_hosts.check(&check_host, key) {
        CheckResult::Match => Ok(()),
        CheckResult::Mismatch => Err(
            "HOST_KEY_MISMATCH: The host key has changed. Possible man-in-the-middle attack. \
             Remove the old entry from ~/.ssh/known_hosts and reconnect."
                .to_string(),
        ),
        CheckResult::Failure => Err("HOST_KEY_CHECK_FAILED".to_string()),
        CheckResult::NotFound => {
            if trust_unknown {
                add_key_to_known_hosts(sess, host, port)?;
                Ok(())
            } else {
                let fingerprint = fingerprint(sess);
                Err(format!("UNKNOWN_HOST:{fingerprint}"))
            }
        }
    }
}

pub fn scan(conn: &Connection) -> Result<String, String> {
    match conn.conn_type.as_str() {
        "local" => scan_local(conn),
        "ssh" => {
            let secret = crate::store::get_secret(&conn.id).unwrap_or_default();
            scan_ssh(conn, &secret)
        }
        other => Err(format!("Unknown connection type: {other}")),
    }
}

fn scan_local(conn: &Connection) -> Result<String, String> {
    let path = std::env::temp_dir().join("tinkerlite-scanner.php");
    std::fs::write(&path, SCANNER_PHP).map_err(|e| e.to_string())?;
    let project_path = expand_tilde(&conn.project_path);

    let output = Command::new(&conn.php_binary)
        .arg(&path)
        .arg(&project_path)
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run php: {e}"))?;

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn scan_ssh(conn: &Connection, secret: &str) -> Result<String, String> {
    let ssh = conn.ssh.as_ref().ok_or("No SSH config")?;

    let tcp = TcpStream::connect((ssh.host.as_str(), ssh.port))
        .map_err(|e| format!("TCP connect failed: {e}"))?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("SSH handshake failed: {e}"))?;
    verify_host_key(&sess, &ssh.host, ssh.port, false)?;

    match ssh.auth.method.as_str() {
        "password" => sess.userauth_password(&ssh.username, secret)
            .map_err(|e| format!("Auth failed: {e}"))?,
        "key" => {
            let raw = ssh.auth.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let key_path = expand_tilde(raw);
            let passphrase = if secret.is_empty() { None } else { Some(secret) };
            sess.userauth_pubkey_file(&ssh.username, None, Path::new(&key_path), passphrase)
                .map_err(|e| format!("Key auth failed: {e}"))?;
        }
        other => return Err(format!("Unknown auth method: {other}")),
    }

    let sftp = sess.sftp().map_err(|e| format!("SFTP init failed: {e}"))?;

    sftp.mkdir(Path::new(REMOTE_WORK_DIR), 0o700).ok();

    let remote_scanner = format!("{REMOTE_WORK_DIR}/scanner.php");
    {
        let mut f = sftp.create(Path::new(&remote_scanner))
            .map_err(|e| format!("Cannot upload scanner: {e}"))?;
        use std::io::Write;
        f.write_all(SCANNER_PHP.as_bytes()).map_err(|e| e.to_string())?;
    }

    let project_q = remote_shell_quote(&conn.project_path);
    let scanner_q = shell_quote(&remote_scanner);
    let cmd = format!("cd {project_q} && {} {scanner_q} {project_q}", &conn.php_binary);

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
    channel.exec(&cmd).map_err(|e| format!("Exec failed: {e}"))?;

    let mut stdout = String::new();
    channel.read_to_string(&mut stdout).ok();
    channel.wait_close().ok();

    Ok(stdout)
}

const PHP_CANDIDATES: &[&str] = &[
    "php", "php8.4", "php8.3", "php8.2", "php8.1", "php8.0", "php7.4",
];

pub fn list_php_binaries(conn: &Connection, secret: &str) -> Vec<PhpBinary> {
    match conn.conn_type.as_str() {
        "local"  => list_php_local(),
        "ssh"    => list_php_ssh(conn, secret).unwrap_or_default(),
        _        => vec![],
    }
}

fn list_php_local() -> Vec<PhpBinary> {
    PHP_CANDIDATES.iter().filter_map(|&cmd| {
        let path = Command::new("which").arg(cmd).output().ok()
            .filter(|o| o.status.success())
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())?;

        let version = Command::new(cmd)
            .args(["-r", "echo PHP_VERSION;"])
            .output().ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();

        Some(PhpBinary { binary: cmd.to_string(), version, path })
    }).collect()
}

fn list_php_ssh(conn: &Connection, secret: &str) -> Result<Vec<PhpBinary>, String> {
    let ssh = conn.ssh.as_ref().ok_or("No SSH config")?;
    let tcp = TcpStream::connect((ssh.host.as_str(), ssh.port))
        .map_err(|e| format!("TCP: {e}"))?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;
    verify_host_key(&sess, &ssh.host, ssh.port, false)?;

    match ssh.auth.method.as_str() {
        "password" => sess.userauth_password(&ssh.username, secret)
            .map_err(|e| format!("Auth: {e}"))?,
        "key" => {
            let raw = ssh.auth.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let key_path = expand_tilde(raw);
            let passphrase = if secret.is_empty() { None } else { Some(secret) };
            sess.userauth_pubkey_file(&ssh.username, None, Path::new(&key_path), passphrase)
                .map_err(|e| format!("Key auth: {e}"))?;
        }
        _ => return Err("Unknown auth method".to_string()),
    }

    // Single command: for each candidate, print "binary|path|version" if found
    let checks = PHP_CANDIDATES.iter()
        .map(|&c| format!("p=$(which {c} 2>/dev/null); [ -n \"$p\" ] && v=$({c} -r 'echo PHP_VERSION;' 2>/dev/null); [ -n \"$p\" ] && echo \"{c}|$p|$v\""))
        .collect::<Vec<_>>()
        .join("; ");

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
    channel.exec(&checks).map_err(|e| e.to_string())?;

    let mut stdout = String::new();
    channel.read_to_string(&mut stdout).ok();
    channel.wait_close().ok();

    let binaries = stdout.lines().filter_map(|line| {
        let parts: Vec<&str> = line.splitn(3, '|').collect();
        if parts.len() == 3 {
            Some(PhpBinary {
                binary:  parts[0].to_string(),
                version: parts[2].trim().to_string(),
                path:    parts[1].to_string(),
            })
        } else { None }
    }).collect();

    Ok(binaries)
}

pub fn list_dir_remote(conn: &Connection, secret: &str, path: &str) -> Vec<String> {
    match conn.conn_type.as_str() {
        "ssh" => list_dir_ssh(conn, secret, path).unwrap_or_default(),
        _ => vec![],
    }
}

fn list_dir_ssh(conn: &Connection, secret: &str, path: &str) -> Result<Vec<String>, String> {
    let ssh = conn.ssh.as_ref().ok_or("No SSH config")?;
    let tcp = TcpStream::connect((ssh.host.as_str(), ssh.port))
        .map_err(|e| format!("TCP: {e}"))?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;
    verify_host_key(&sess, &ssh.host, ssh.port, false)?;

    match ssh.auth.method.as_str() {
        "password" => sess.userauth_password(&ssh.username, secret)
            .map_err(|e| format!("Auth: {e}"))?,
        "key" => {
            let raw = ssh.auth.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let key_path = expand_tilde(raw);
            let passphrase = if secret.is_empty() { None } else { Some(secret) };
            sess.userauth_pubkey_file(&ssh.username, None, Path::new(&key_path), passphrase)
                .map_err(|e| format!("Key auth: {e}"))?;
        }
        _ => return Err("Unknown auth method".to_string()),
    }

    // Determine dir and prefix from path
    let (dir, prefix) = if path.is_empty() || path == "/" {
        ("/".to_string(), String::new())
    } else if path.ends_with('/') {
        (path.to_string(), String::new())
    } else {
        let slash = path.rfind('/').map(|i| i + 1).unwrap_or(0);
        (path[..slash].to_string(), path[slash..].to_lowercase())
    };

    let dir_q = shell_quote(dir.trim_end_matches('/').trim_start_matches('\0'));
    let cmd = format!(
        r#"ls -1d {dir_q}/*/ 2>/dev/null | head -20 | sed 's:/*$::'"#
    );

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
    channel.exec(&cmd).map_err(|e| e.to_string())?;

    let mut stdout = String::new();
    channel.read_to_string(&mut stdout).ok();
    channel.wait_close().ok();

    let results: Vec<String> = stdout.lines()
        .filter(|l| {
            let name = l.rsplit('/').next().unwrap_or(l);
            !name.starts_with('.') && (prefix.is_empty() || name.to_lowercase().starts_with(&prefix))
        })
        .take(12)
        .map(|l| l.to_string())
        .collect();

    Ok(results)
}

pub fn detect_php_remote(conn: &Connection, secret: &str) -> String {
    match conn.conn_type.as_str() {
        "local" => {
            let cmd = if cfg!(windows) { "where" } else { "which" };
            Command::new(cmd)
                .arg("php")
                .output()
                .ok()
                .filter(|o| o.status.success())
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().lines().next().unwrap_or("php").to_string())
                .unwrap_or_else(|| "php".to_string())
        }
        "ssh" => detect_php_ssh(conn, secret).unwrap_or_else(|_| "php".to_string()),
        _ => "php".to_string(),
    }
}

fn detect_php_ssh(conn: &Connection, secret: &str) -> Result<String, String> {
    let ssh = conn.ssh.as_ref().ok_or("No SSH config")?;

    let tcp = TcpStream::connect((ssh.host.as_str(), ssh.port))
        .map_err(|e| format!("TCP connect: {e}"))?;
    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("Handshake: {e}"))?;
    verify_host_key(&sess, &ssh.host, ssh.port, false)?;

    match ssh.auth.method.as_str() {
        "password" => sess.userauth_password(&ssh.username, secret)
            .map_err(|e| format!("Auth: {e}"))?,
        "key" => {
            let raw = ssh.auth.private_key_path.as_deref().unwrap_or("~/.ssh/id_rsa");
            let key_path = expand_tilde(raw);
            let passphrase = if secret.is_empty() { None } else { Some(secret) };
            sess.userauth_pubkey_file(&ssh.username, None, Path::new(&key_path), passphrase)
                .map_err(|e| format!("Key auth: {e}"))?;
        }
        other => return Err(format!("Unknown auth method: {other}")),
    }

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
    channel.exec("which php").map_err(|e| format!("Exec: {e}"))?;

    let mut stdout = String::new();
    channel.read_to_string(&mut stdout).ok();
    channel.wait_close().ok();

    let path = stdout.trim().to_string();
    Ok(if path.is_empty() { "php".to_string() } else { path })
}

pub fn trust_host(host: &str, port: u16) -> Result<String, String> {
    let tcp = TcpStream::connect((host, port))
        .map_err(|e| format!("TCP connect failed: {e}"))?;

    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("Handshake failed: {e}"))?;

    let fp = fingerprint(&sess);
    add_key_to_known_hosts(&sess, host, port)?;
    Ok(fp)
}

fn add_key_to_known_hosts(sess: &Session, host: &str, port: u16) -> Result<(), String> {
    let known_hosts_path = known_hosts_path();
    let mut known_hosts = sess.known_hosts().map_err(|e| e.to_string())?;

    if known_hosts_path.exists() {
        known_hosts
            .read_file(&known_hosts_path, KnownHostFileKind::OpenSSH)
            .ok();
    }

    let (key, key_type) = sess.host_key().ok_or("No host key")?;

    let fmt = match key_type {
        ssh2::HostKeyType::Rsa => ssh2::KnownHostKeyFormat::SshRsa,
        ssh2::HostKeyType::Dss => ssh2::KnownHostKeyFormat::SshDss,
        ssh2::HostKeyType::Ecdsa256 => ssh2::KnownHostKeyFormat::Ecdsa256,
        ssh2::HostKeyType::Ecdsa384 => ssh2::KnownHostKeyFormat::Ecdsa384,
        ssh2::HostKeyType::Ecdsa521 => ssh2::KnownHostKeyFormat::Ecdsa521,
        ssh2::HostKeyType::Ed25519 => ssh2::KnownHostKeyFormat::Ed25519,
        _ => ssh2::KnownHostKeyFormat::SshRsa,
    };

    let check_host = if port != 22 {
        format!("[{host}]:{port}")
    } else {
        host.to_string()
    };

    known_hosts
        .add(&check_host, key, "tinkerlite", fmt)
        .map_err(|e| e.to_string())?;

    if let Some(parent) = known_hosts_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    known_hosts
        .write_file(&known_hosts_path, KnownHostFileKind::OpenSSH)
        .map_err(|e| format!("Cannot write known_hosts: {e}"))?;

    Ok(())
}

fn fingerprint(sess: &Session) -> String {
    sess.host_key_hash(ssh2::HashType::Sha256)
        .map(|h| {
            format!(
                "SHA256:{}",
                h.iter().map(|b| format!("{b:02x}")).collect::<Vec<_>>().join("")
            )
        })
        .unwrap_or_else(|| "unknown".to_string())
}

fn known_hosts_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
    PathBuf::from(home).join(".ssh").join("known_hosts")
}

fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

// Like shell_quote but converts a leading ~ to $HOME so the remote shell expands it.
fn remote_shell_quote(s: &str) -> String {
    if s == "~" {
        return "$HOME".to_string();
    }
    if let Some(rest) = s.strip_prefix("~/") {
        // "$HOME/rest/of/path" — double-quoted so $HOME expands, rest is safe inside ""
        return format!("\"$HOME/{}\"", rest.replace('"', "\\\""));
    }
    shell_quote(s)
}

fn expand_tilde(path: &str) -> String {
    if path.starts_with("~/") || path == "~" {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/root".to_string());
        path.replacen('~', &home, 1)
    } else {
        path.to_string()
    }
}
